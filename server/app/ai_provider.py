"""
AI Provider abstraction layer.

Shared across all backend subapps (paper_analyzer, translator, reviwer,
todo, contextor). Lets callers switch between Claude and Gemini (or add
more providers later) without touching call-site logic. Provider is
selected via the AI_PROVIDER env var ("claude" | "gemini"), defaulting to
"claude".
"""
import base64
import json
import os
from abc import ABC, abstractmethod
from typing import AsyncIterator

from fastapi import HTTPException


class AIProvider(ABC):
    """Common interface every provider must implement."""

    @abstractmethod
    def complete(
        self,
        system: str,
        user: str,
        max_tokens: int = 512,
        tier: str = "fast",
        images: list[tuple[str, bytes]] | None = None,
    ) -> str:
        """Run a single-turn completion and return the raw text response.

        tier selects the model size ("fast" | "smart"). images, if given,
        is a list of (media_type, raw_bytes) attached alongside user text.
        """
        raise NotImplementedError

    @abstractmethod
    def stream(
        self,
        system: str,
        user: str,
        max_tokens: int = 512,
        tier: str = "smart",
    ) -> AsyncIterator[str]:
        """Run a single-turn completion, yielding text chunks as they arrive."""
        raise NotImplementedError


class ClaudeProvider(AIProvider):
    def __init__(self):
        import anthropic

        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")
        self._client = anthropic.Anthropic(api_key=api_key)
        self._async_client = anthropic.AsyncAnthropic(api_key=api_key)
        self._models = {
            "fast": os.getenv("CLAUDE_MODEL_FAST", "claude-haiku-4-5-20251001"),
            "smart": os.getenv("CLAUDE_MODEL_SMART", "claude-sonnet-4-6"),
        }

    def _model(self, tier: str) -> str:
        model = self._models.get(tier)
        if model is None:
            raise HTTPException(status_code=500, detail=f"Unknown model tier '{tier}'")
        return model

    def _content(self, user: str, images: list[tuple[str, bytes]] | None):
        if not images:
            return user
        blocks = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": base64.standard_b64encode(data).decode(),
                },
            }
            for media_type, data in images
        ]
        blocks.append({"type": "text", "text": user})
        return blocks

    def complete(self, system, user, max_tokens=512, tier="fast", images=None):
        message = self._client.messages.create(
            model=self._model(tier),
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": self._content(user, images)}],
        )
        return message.content[0].text.strip()

    async def stream(self, system, user, max_tokens=512, tier="smart"):
        async with self._async_client.messages.stream(
            model=self._model(tier),
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        ) as s:
            async for chunk in s.text_stream:
                yield chunk


class GeminiProvider(AIProvider):
    def __init__(self):
        from google import genai

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set")
        self._client = genai.Client(api_key=api_key)
        self._models = {
            "fast": os.getenv("GEMINI_MODEL_FAST", "gemini-3.1-flash-lite"),
            "smart": os.getenv("GEMINI_MODEL_SMART", "gemini-3.5-flash"),
        }

    def _model(self, tier: str) -> str:
        model = self._models.get(tier)
        if model is None:
            raise HTTPException(status_code=500, detail=f"Unknown model tier '{tier}'")
        return model

    def _contents(self, user: str, images: list[tuple[str, bytes]] | None):
        from google.genai import types

        if not images:
            return user
        parts = [
            types.Part.from_bytes(data=data, mime_type=media_type)
            for media_type, data in images
        ]
        parts.append(types.Part.from_text(text=user))
        return parts

    def _config(self, system: str, max_tokens: int):
        from google.genai import types

        config = {"max_output_tokens": max_tokens}
        if system.strip():
            config["system_instruction"] = system
        return types.GenerateContentConfig(**config)

    def complete(self, system, user, max_tokens=512, tier="fast", images=None):
        response = self._client.models.generate_content(
            model=self._model(tier),
            contents=self._contents(user, images),
            config=self._config(system, max_tokens),
        )
        text = (response.text or "").strip()
        if not text:
            # response.text가 None/빈 문자열이면 조용히 넘어가지 않는다 — 안전 필터
            # 차단이나 max_tokens 부족으로 candidate가 비어도 예외가 안 나서, 그동안은
            # 호출부(_parse_json 등)에서야 JSONDecodeError로 터져 원인 파악이 어려웠다.
            finish_reason = None
            try:
                finish_reason = response.candidates[0].finish_reason
            except (AttributeError, IndexError, TypeError):
                pass
            raise HTTPException(
                status_code=502,
                detail=f"Gemini 응답이 비어있습니다 (finish_reason={finish_reason}). "
                       f"max_tokens 부족이나 안전 필터 차단일 수 있습니다.",
            )
        return text

    async def stream(self, system, user, max_tokens=512, tier="smart"):
        async for chunk in await self._client.aio.models.generate_content_stream(
            model=self._model(tier),
            contents=user,
            config=self._config(system, max_tokens),
        ):
            if chunk.text:
                yield chunk.text


_PROVIDERS = {
    "claude": ClaudeProvider,
    "gemini": GeminiProvider,
}


def get_ai_provider() -> AIProvider:
    """Factory: returns the configured provider instance.

    Reads AI_PROVIDER env var each call (cheap — client construction is
    lightweight), so switching providers only needs an env var change +
    restart, no code edits.
    """
    name = os.getenv("AI_PROVIDER", "claude").lower()
    provider_cls = _PROVIDERS.get(name)
    if provider_cls is None:
        raise HTTPException(
            status_code=500,
            detail=f"Unknown AI_PROVIDER '{name}'. Valid options: {list(_PROVIDERS)}",
        )
    return provider_cls()


# ── JSON 응답 프롬프트/파싱 공용 헬퍼 ──────────────────────────────
# JSON을 응답으로 요구하는 서브앱(todo, paper_analyzer 등)이 프롬프트 문구와
# 파싱 로직을 각자 새로 베껴 쓰지 않도록 여기 하나로 모은다.

JSON_OUTPUT_CONTRACT = """\
<output_contract>
반드시 JSON만 출력합니다.
마크다운, 코드펜스, 추가 설명을 출력하지 않습니다.
</output_contract>"""


def extract_json(raw: str) -> dict:
    """AI 응답에서 JSON 객체만 안전하게 추출.

    코드펜스(```json ... ```)나 프롬프트의 <schema> 같은 태그가 응답에
    섞여 나와도, 첫 '{'부터 마지막 '}'까지만 잘라 파싱하므로 코드펜스
    제거만 하는 방식보다 견고하다.
    """
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1] if "```" in raw[3:] else raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"AI 응답에서 JSON 객체를 찾지 못했습니다: {raw}")
    return json.loads(raw[start:end + 1])
