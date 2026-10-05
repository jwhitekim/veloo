from server.app.ai_provider import JSON_OUTPUT_CONTRACT, extract_json

PROMPT_TEMPLATE = """다음은 논문의 초록입니다.

[초록]
{abstract}

아래 항목을 한국어로 작성하세요. 초록에 직접 언급되지 않더라도 내용을 바탕으로 합리적으로 추론해도 됩니다.

{output_contract}

<schema>
{{
  "keywords": ["핵심 키워드 3~5개 (영문 또는 한문 혼용 가능)"],
  "domain": "이 논문이 속하는 연구 분야 (한 단어 또는 짧은 구, 예: ECG-classification, NLP, computer-vision, RL)",
  "problem_short": "해결하려는 문제 한 줄 요약",
  "problem": "기존 방법의 한계와 배경 (2~3문장)",
  "method_short": "제안 방법 한 줄 요약",
  "method": "핵심 아이디어 및 방법론 (2~3문장, 구체적 기술 요소 포함)",
  "conclusion_short": "주요 결론 한 줄 요약",
  "conclusion": "주요 결론 및 기여 (2~3문장, 성능 수치·비교 실험·의의 포함)",
  "relevance": "PRML 연구실과의 관련성 (높음/중간/낮음 중 하나)",
  "relevance_reason": "관련성 판단 근거 (1~2문장)"
}}
</schema>"""

EMPTY_RESULT = {
    "keywords": [],
    "domain": "알 수 없음",
    "problem_short": "초록 없음",
    "problem": "초록 없음",
    "method_short": "초록 없음",
    "method": "초록 없음",
    "conclusion_short": "초록 없음",
    "conclusion": "초록 없음",
    "relevance": "중간",
    "relevance_reason": "초록 정보 없음",
}


def parse_json_response(raw: str) -> dict:
    return extract_json(raw)


def build_prompt(abstract: str) -> str:
    return PROMPT_TEMPLATE.format(abstract=abstract, output_contract=JSON_OUTPUT_CONTRACT)
