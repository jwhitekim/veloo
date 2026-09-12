# veloo 작업 지침

## 규칙 원천

- 프로젝트 작업 규칙: `.claude/`
- 자동화 설정: `.claude/settings.json`
- 작업 에이전트 지침: `.claude/agents/`
- 작업 스킬(Skill) 지침: `.claude/skills/`
- 작업 전 훅: `.claude/hooks/`
- TODO 관리 설정: `.claude/todo-guard.json`

## 적용 순서

1. 현재 작업과 관련된 `.claude/agents/*.md` 확인
2. 현재 작업과 관련된 `.claude/skills/*/` 스킬 파일 확인
3. `.claude/settings.json` 및 `.claude/todo-guard.json` 확인
4. 작업 전 `.claude/hooks/pre-tool.sh` 실행 결과 확인
5. 작업 완료 후 `.claude/hooks/check-todo.sh` 및 `.claude/hooks/doc-check.sh` 실행

## 프로젝트 기준

- 프론트엔드 수정 후 `frontend` 폴더에서 `npm run build` 실행
- 생성물 `frontend/dist/` 직접 수정 금지
- 환경변수 하드코딩 금지
- 화면 문자열 하드코딩 금지, `frontend/src/shared/i18n/` 사용
- 디자인 토큰 우선 사용, 새 색상값 직접 작성 금지
- 공통 UI는 `frontend/src/shared/components/`에서 정의하고 각 탭에서 재사용
- 우선순위 표현은 `frontend/src/features/todos/priority.ts` 사용
- 사용자 지시를 `TODO.md` 진행 중 항목에 등록
- 완료 항목의 `TODO.md` 상태 갱신

## 버전 관리

- 기본 브랜치: `main`
- 커밋·푸시 스킬: `.claude/skills/commit-and-push/`
- 릴리즈·배포 스킬: `.claude/skills/release-pipeline/`
