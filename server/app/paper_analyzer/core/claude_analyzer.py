from .base_analyzer import EMPTY_RESULT, build_prompt, parse_json_response
from server.app.ai_provider import get_ai_provider, JSON_OUTPUT_CONTRACT

_TITLE_PROMPT = """다음 논문의 제목만 주어집니다. 제목에서 유추 가능한 내용을 바탕으로 분석하세요.
초록이 없으므로 제목으로부터 합리적으로 추론하되, 불확실한 부분은 솔직히 표현하세요.

논문 제목: {title}
DOI: {doi}

{output_contract}

<schema>
{{
  "keywords": ["핵심 키워드 3~5개"],
  "domain": "이 논문이 속하는 연구 분야 (한 단어 또는 짧은 구)",
  "problem_short": "해결하려는 문제 한 줄 요약",
  "problem": "제목 기반으로 추정되는 문제 (2~3문장, 추론임을 명시)",
  "method_short": "제안 방법 한 줄 요약",
  "method": "제목 기반으로 추정되는 방법론 (2~3문장, 추론임을 명시)",
  "conclusion_short": "주요 결론 한 줄 요약",
  "conclusion": "제목 기반으로 추정되는 기여 (2~3문장, 추론임을 명시)",
  "relevance": "PRML 연구실과의 관련성 (높음/중간/낮음 중 하나)",
  "relevance_reason": "관련성 판단 근거 (1~2문장)"
}}
</schema>"""


def analyze_paper(abstract: str, title: str = "", doi: str = "") -> dict:
    if not abstract and not title:
        return EMPTY_RESULT

    if abstract:
        prompt = build_prompt(abstract)
    else:
        prompt = _TITLE_PROMPT.format(title=title, doi=doi or "없음", output_contract=JSON_OUTPUT_CONTRACT)

    provider = get_ai_provider()
    raw = provider.complete(system="", user=prompt, max_tokens=1024)
    if not raw or not raw.strip():
        return {**EMPTY_RESULT, "problem": "Claude 응답이 비어있습니다. 잠시 후 다시 시도하세요."}
    return parse_json_response(raw)
