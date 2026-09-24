# 문서 정리 방법 (이 프로젝트의 문서 배치 규칙)

veloo는 OpenSpec 같은 SDD(Spec-Driven Development) 도구의 형식(Requirement/Scenario, ADDED 델타 등)은 참고하되, 그 도구가 강제하는 전용 폴더명(`openspec/`, `AGENTS.md` 등)은 쓰지 않는다. 모든 스펙·설계 문서는 `docs/` 하나 아래에 평탄화해서 둔다.

## 레이아웃

```
docs/
├── README.md                      # docs/ 진입점, 읽는 순서 안내
├── docs-rules.md                  # 이 문서
├── contract.md                    # 상위 계약, FROZEN — 내용을 재해석하지 않고 인용만 한다
├── proposal.md                    # 왜/무엇을 바꾸는지 (Why / What Changes / Impact) + 변경이력 표
├── design.md                      # capability를 가로지르는 기술 결정
├── tasks.md                       # 전체 구현 체크리스트 (capability별 섹션 + 완료 체크박스)
└── specs/
    └── <capability>/
        └── spec.md                # capability별 요구사항만. design.md/tasks.md는 capability마다 만들지 않는다
```

## 왜 이렇게 하는가

- `contract.md`만 FROZEN이다. 그 위에 아무것도 더 얹지 않는다 — "무엇이 절대 안 바뀌는가"를 한 파일로 유지해야 나중에 뭐가 계약이고 뭐가 구현 선택인지 헷갈리지 않는다.
- 나머지(`proposal.md`/`design.md`/`tasks.md`/`specs/*/spec.md`)는 "지금 유효한 스펙"이다. OpenSpec처럼 `changes/<change-id>/` 델타 폴더로 버전을 쪼개지 않는다 — capability가 8개, change가 사실상 소수인 규모에서는 폴더 계층을 늘리는 비용이 이득보다 크다. 변경 이력은 폴더가 아니라 `proposal.md` 끝의 변경이력 표와 git 커밋 로그로 관리한다.
- `specs/<capability>/spec.md`가 요구사항만 담고 모듈 경계(구현 세부사항)를 담지 않는 이유: 구현이 끝나면 코드(`backend/app/<capability>/`, `frontend/src/...`) 자체가 모듈 경계의 정답이 된다. spec에 다시 적으면 코드가 바뀔 때마다 두 곳을 고쳐야 해서 어긋나기 쉽다.

## 규칙 (에이전트가 반드시 지킬 것)

- `openspec/`, `AGENTS.md` 등 OpenSpec 도구 전용 이름의 파일/폴더를 만들지 않는다. 하네스 설정 파일은 항상 `CLAUDE.md`다.
- capability마다 `design.md`/`tasks.md`를 따로 만들지 않는다. `design.md`와 `tasks.md`는 프로젝트에 각각 1개씩만 존재한다(`docs/design.md`, `docs/tasks.md`).
- Requirement 형식: `### Requirement: <이름>` + SHALL로 끝나는 단정문.
- Scenario 형식: `#### Scenario: <이름>` 아래 GIVEN/WHEN/THEN(plain 텍스트, 볼드 금지) 3단 구조.

  ```
  #### Scenario: <이름>
  - GIVEN <전제 상태>
  - WHEN <트리거 조건>
  - THEN <기대 결과>
  ```

- 역참조 필수: `tasks.md`의 모든 작업은 `specs/<capability>/spec.md`의 특정 Requirement를 근거로 명시한다. 근거 없는 작업은 범위 이탈로 간주해 삭제하거나 되묻는다.
- capability 작성 순서 고정 (의존성 순): `auth` → `paper-analyzer` → `translator` → `model-review` → `todo` → `contextor` → `product` → `mobile-navigation`. auth는 나머지 전부가 의존하는 세션/미들웨어 계층이라 맨 앞, `product`/`mobile-navigation`은 백엔드 capability들이 이미 존재한다는 전제로 화면을 조립하는 계층이라 맨 뒤.
- 요구사항이 바뀌면 델타 파일을 새로 만들지 말고 해당 파일을 직접 수정한다. 무엇이 왜 바뀌었는지는 `proposal.md`의 변경이력 표에 한 줄 추가한다.
- 파일명에 버전 번호를 넣지 않는다 (예: `contract-v0.1.md` 대신 `contract.md`). 버전은 파일 내부의 제목과 변경이력 표로만 관리한다.

## 다른 프로젝트에 이 규칙을 적용하려면

이 문서를 그대로 복사해서 새 프로젝트의 `docs/docs-rules.md`로 두고, `docs/README.md`에 이 문서로의 링크를 걸고, `CLAUDE.md`(또는 해당 프로젝트의 하네스 설정 파일)에 "문서 배치는 `docs/docs-rules.md`를 따른다"는 한 줄만 추가하면 된다. capability 이름과 작성 순서만 그 프로젝트에 맞게 바꾸면 나머지 구조는 그대로 재사용 가능하다.
