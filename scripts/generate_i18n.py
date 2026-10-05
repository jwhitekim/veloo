"""
프론트엔드 UI 다국어 번역 파일 생성 스크립트.

frontend/src/shared/i18n/locales/ko.json(원본)을 읽어 en.json / zh.json을
server/app/ai_provider.py(AI_PROVIDER env로 선택된 프로바이더)로 일괄 번역해
같은 폴더에 덮어쓴다. 1회성/수동 실행 도구 — 런타임에는 쓰이지 않음. ko.json에
새 문자열을 추가한 뒤 다시 실행하면 전체를 재번역한다(부분 갱신 아님).

사용법 (레포 루트에서):
    python scripts/generate_i18n.py            # en, zh 둘 다 생성
    python scripts/generate_i18n.py en         # en만 생성
    python scripts/generate_i18n.py zh         # zh만 생성

AI_PROVIDER에 맞는 API 키(ANTHROPIC_API_KEY 또는 GEMINI_API_KEY)가 .env 또는
환경변수에 있어야 한다.
"""
import json
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))  # server.app.ai_provider import를 레포 루트 기준으로 찾기 위함
load_dotenv(ROOT / ".env")

# .env의 AI_PROVIDER를 그대로 따른다(현재 프로젝트 설정: gemini). ClaudeProvider로
# 강제하고 싶으면 실행 전 `AI_PROVIDER=claude` 를 셸에서 export할 것.

LOCALES_DIR = ROOT / "frontend" / "src" / "shared" / "i18n" / "locales"
KO_PATH = LOCALES_DIR / "ko.json"

LANGUAGE_NAMES = {
    "en": "English",
    "zh": "Simplified Chinese (简体中文)",
}

SYSTEM_PROMPT = """\
You translate UI copy for a web app JSON i18n file. You will receive a JSON \
object (nested) whose string values are Korean UI text — button labels, \
placeholders, headings, short descriptions, error messages.

Rules:
- Translate every string value into {target_language}. Keep the JSON key \
  names exactly as they are (do not translate, rename, add, or remove keys).
- Preserve the exact JSON structure and nesting.
- Placeholders like {{count}}, {{status}}, {{year}}, {{value}}, {{done}}, \
  {{total}} etc. (double curly braces) MUST be preserved verbatim, unchanged, \
  in the translated string — do not translate their names or remove them.
- Keep the product name "Veloo" untranslated.
- Keep emoji, arrows (↗ ← ·), and punctuation like "—" where they make sense \
  for the translated sentence; you may drop or adjust punctuation that only \
  makes sense in Korean (e.g. a trailing "..." ellipsis convention is fine to \
  keep).
- Values that are already plain English brand/UI words (e.g. "Source", \
  "English", "Korean", "Translation", "Auto translate") should be translated \
  naturally into {target_language} too, EXCEPT when {target_language} IS \
  English, in which case leave them as-is.
- Keep translations concise and natural for software UI — match the tone of \
  a clean, modern research-tool interface, not a literal word-for-word gloss.
- Output ONLY the translated JSON object, no markdown code fences, no \
  commentary, no explanation.
"""


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    return match.group(1) if match else text


def _strip_trailing_commas(text: str) -> str:
    """Gemini는 가끔 `},\n}` 같은 후행 콤마를 남긴다 — JSON 표준 위반이라 파싱 전에 제거."""
    return re.sub(r",(\s*[}\]])", r"\1", text)


def translate_locale(ko_data: dict, lang_code: str) -> dict:
    from server.app.ai_provider import get_ai_provider

    provider = get_ai_provider()
    target_language = LANGUAGE_NAMES[lang_code]
    system = SYSTEM_PROMPT.format(target_language=target_language)
    user = json.dumps(ko_data, ensure_ascii=False, indent=2)

    raw = provider.complete(system, user, max_tokens=16000, tier="smart")
    cleaned = _strip_trailing_commas(_strip_code_fence(raw))
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"[{lang_code}] Claude 응답을 JSON으로 파싱하지 못했습니다: {e}\n"
            f"--- raw response ---\n{raw}"
        ) from e


def _check_keys_match(ko_data, translated, lang_code, path=""):
    """번역 결과가 원본과 같은 키 구조를 갖는지 재귀적으로 검증 — 키 누락/추가를 조기에 잡는다."""
    if isinstance(ko_data, dict):
        if not isinstance(translated, dict):
            raise RuntimeError(f"[{lang_code}] {path or '(root)'}: dict가 아닙니다")
        ko_keys, tr_keys = set(ko_data.keys()), set(translated.keys())
        if ko_keys != tr_keys:
            missing = ko_keys - tr_keys
            extra = tr_keys - ko_keys
            raise RuntimeError(
                f"[{lang_code}] {path or '(root)'}: 키 불일치 — 누락 {missing}, 추가 {extra}"
            )
        for k in ko_data:
            _check_keys_match(ko_data[k], translated[k], lang_code, f"{path}.{k}" if path else k)


def main():
    targets = sys.argv[1:] or list(LANGUAGE_NAMES)
    unknown = [t for t in targets if t not in LANGUAGE_NAMES]
    if unknown:
        print(f"알 수 없는 언어 코드: {unknown}. 사용 가능: {list(LANGUAGE_NAMES)}")
        sys.exit(1)

    ko_data = json.loads(KO_PATH.read_text(encoding="utf-8"))

    for lang_code in targets:
        print(f"[{lang_code}] 번역 중...")
        translated = translate_locale(ko_data, lang_code)
        _check_keys_match(ko_data, translated, lang_code)
        out_path = LOCALES_DIR / f"{lang_code}.json"
        out_path.write_text(
            json.dumps(translated, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"[{lang_code}] 완료 → {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
