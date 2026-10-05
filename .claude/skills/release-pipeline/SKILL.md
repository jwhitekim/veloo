---
name: release-pipeline
description: veloo.2joon.com의 릴리즈/배포 전 과정을 자동화한다 — 버전 범프, 프론트엔드 빌드 검증, 커밋, 사람 승인 후 main 푸시, GitHub Actions 배포 감시, 프로덕션 스모크 테스트까지 순서대로 진행한다. "릴리즈해줘", "배포해줘", "버전 올리고 배포", "release", "deploy", "버전 범프하고 푸시" 같은 요청에 사용한다. 후속 요청("배포 상태 확인", "아까 배포 어떻게 됐어", "배포 재시도", "릴리즈 다시")에도 반드시 사용한다. 단순히 "커밋해줘"/"푸시해줘"만 요청받았다면 이 스킬이 아니라 commit-and-push 스킬을 직접 쓴다 — 이 스킬은 버전 범프와 배포 확인까지 포함된 요청에만 쓴다.
---

# release-pipeline — veloo.2joon.com 릴리즈 오케스트레이터

## 실행 모드: 서브 에이전트 (순차 파이프라인)

`release-preparer` → `deploy-monitor` 두 에이전트가 순서대로 실행된다. 서로 실시간 통신할 필요가
없는 단방향 의존 관계(뒤 단계가 앞 단계의 성공을 전제로 시작)라 팀 모드 대신 `Agent` 도구로
직접 호출한다.

## 에이전트 구성

| 에이전트 | subagent_type | 역할 | 실행 방식 |
|---------|---------------|------|-----------|
| `release-preparer` | general-purpose | 버전 범프 → 빌드 검증 → 커밋 → 사람 승인 → 푸시 | 포그라운드 (승인 대기가 있어 백그라운드 부적합) |
| `deploy-monitor` | general-purpose | GitHub Actions 감시 → 스모크 테스트 → 보고 | 백그라운드 (`run_in_background: true`) |

## 워크플로우

### Phase 0: 컨텍스트 확인

1. `_workspace/release/` 존재 여부를 확인한다.
   - **미존재** → 초기 실행. `_workspace/release/` 생성 후 Phase 1로.
   - **존재 + 사용자가 "배포 상태 확인"/"아까 어떻게 됐어" 류의 조회성 요청** → Phase 1을 건너뛰고
     `02_monitor_report.md`를 Read해서 바로 보고한다. 파일이 없다면(아직 진행 중) `gh run list`로
     현재 상태만 조회해서 보고한다.
   - **존재 + 사용자가 "배포 재시도"/"릴리즈 다시"** → 기존 `_workspace/release/`를
     `_workspace/release_prev_{timestamp}/`로 이동하고 새로 시작 (Phase 1부터).
   - **존재 + 새 릴리즈 요청(새 변경사항 기반)** → 위와 동일하게 이전 폴더를 보관하고 새로 시작.

2. `git status`로 현재 워킹 트리 상태를 확인한다. main 브랜치가 아니면 사람에게 알리고 중단
   (이 프로젝트는 main 단일 브랜치 운영).

### Phase 1: release-preparer 실행

**실행 방식:** 포그라운드. `Agent` 도구로 호출하되 결과를 기다린 뒤 다음 Phase로 진행한다
(백그라운드로 돌리지 않는다 — 푸시 전 사람 승인이 필요해서 응답을 계속 주고받아야 한다).

```
Agent(
  subagent_type: "general-purpose",
  model: "opus",
  description: "release-preparer 실행",
  prompt: ".claude/agents/release-preparer.md의 지침에 따라 릴리즈를 준비하라.
    범프 타입: {사용자가 지정한 값, 없으면 patch}.
    산출물은 _workspace/release/01_preparer_report.md에 작성하라."
)
```

- 사용자가 범프 타입(major/minor/patch)을 명시하지 않았다면, 실행 전에 짧게 확인한다
  (기본값 patch로 진행해도 되는지). 명확히 지정했다면 묻지 않는다.
- `release-preparer`가 실패(빌드 실패 또는 승인 거부)로 보고하면 **여기서 중단한다.**
  Phase 2로 진행하지 않는다. 실패 사유를 그대로 사용자에게 전달한다.
- 성공(푸시 완료)했을 때만 Phase 2로 진행한다.

### Phase 2: deploy-monitor 실행

**실행 방식:** 백그라운드. GitHub Actions 배포(SSH + docker compose build)는 수 분 걸릴 수 있어
사용자를 블로킹하지 않는다.

```
Agent(
  subagent_type: "general-purpose",
  model: "opus",
  description: "deploy-monitor 실행",
  run_in_background: true,
  prompt: ".claude/agents/deploy-monitor.md의 지침에 따라 방금 푸시된 배포를 확인하라.
    커밋: {release-preparer가 보고한 커밋 해시}.
    산출물은 _workspace/release/02_monitor_report.md에 작성하라."
)
```

- 백그라운드 실행을 시작했음을 사용자에게 알리고, 완료되면 자동으로 결과를 보고받는다는 것을
  안내한다 (배경 작업 완료 시 하네스가 재호출됨).
- 사용자가 그 사이 다른 작업을 요청하면 정상적으로 응대한다 — 배포 감시는 백그라운드에서 계속된다.

### Phase 3: 결과 종합

1. `deploy-monitor`의 반환값(또는 `_workspace/release/02_monitor_report.md`)을 읽는다.
2. 사용자에게 최종 요약을 보고한다:
   - 버전: {이전} → {신규}
   - 커밋 해시 + 메시지
   - GitHub Actions 결과 (성공/실패, 실행 URL)
   - 스모크 테스트 결과
   - 실패가 있었다면 어느 단계에서, 왜
3. `_workspace/release/`는 삭제하지 않고 보존한다 (감사 추적용).

## 데이터 흐름

```
_workspace/release/
├── 01_preparer_report.md   (release-preparer 출력)
└── 02_monitor_report.md    (deploy-monitor 출력)
```

파일 기반(감사 추적용) + 반환값 기반(빠른 진행 판단) 조합을 사용한다.

## 에러 핸들링

| 실패 지점 | 처리 |
|-----------|------|
| Phase 0: main 브랜치 아님 | 즉시 중단, 사람에게 알림 |
| Phase 0: 릴리즈와 무관한 uncommitted 변경 발견 | `release-preparer`가 프리플라이트에서 처리 — 조용히 진행하지 않고 사람에게 확인 |
| Phase 1: 빌드 실패 | 커밋하지 않고 중단. 버전 변경 되돌림. Phase 2 진행 안 함 |
| Phase 1: 사람이 푸시 승인 거부 | 로컬 커밋 유지, 중단. Phase 2 진행 안 함 |
| Phase 2: GitHub Actions 실패 | 재시도 안 함. 로그 요약 보고. 롤백은 사람 판단(`approval-check` 대상) |
| Phase 2: Actions 성공했지만 스모크 테스트 실패 | 배포 실패로 확정 보고. 최대 1회만 재시도 |
| Phase 2: `gh`/WebFetch 접근 자체가 실패 | 워크플로우 URL을 안내하고 사람이 직접 확인하도록 함 |

한 단계라도 실패하면 다음 단계로 진행하지 않는다 — 이 파이프라인은 각 단계가 이전 단계의
성공을 전제로 하기 때문에, 실패를 숨기고 계속 진행하는 것보다 즉시 멈추고 보고하는 편이 안전하다.

## 테스트 시나리오

### 정상 흐름
1. 사용자: "패치 버전으로 릴리즈해줘"
2. Phase 0: `_workspace/release/` 없음 → 초기 실행, main 브랜치 확인
3. Phase 1: `release-preparer` 호출 → package.json 2.3.0 → 2.3.1 → `npm run build` 성공 →
   `commit-and-push` 스킬로 `chore: bump version to v2.3.1` 커밋 → 사람에게 커밋 목록 보여줌 →
   "푸시해" 승인 → 푸시 완료
4. Phase 2: `deploy-monitor` 백그라운드 호출 → `gh run watch`로 5분 대기 → 성공 →
   WebFetch로 `/`, `/login`, `/api/me` 확인 → 모두 200
5. Phase 3: "v2.3.1 배포 완료. GitHub Actions 성공, 스모크 테스트 3/3 통과" 보고

### 에러 흐름
1. 사용자: "배포해줘"
2. Phase 1: `release-preparer`가 `npm run build` 실행 중 TypeScript 에러 발견
3. `release-preparer`가 버전 변경을 되돌리고(`git checkout -- web/package.json`) 실패 보고
4. `release-pipeline`이 Phase 2로 진행하지 않고, 사용자에게 빌드 에러 전문을 그대로 전달하며 중단
