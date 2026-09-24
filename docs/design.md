# 기술 설계 (capability를 가로지르는 결정)

capability별 요구사항은 `specs/<capability>/spec.md`에 있다. 여기는 여러 capability가 공유하는 "어떻게"만 담는다.

## 백엔드 구성

```
[FastAPI Root — backend/main.py]
    ├── (prefix 없음) → backend/app/auth.py         # 인증 미들웨어 + 로그인/회원가입/로그아웃
    ├── /paper        → backend/app/paper_analyzer/
    ├── /translate    → backend/app/translator.py
    ├── /model-review → backend/app/reviwer.py
    ├── /todo         → backend/app/todo/
    └── /contextor    → backend/app/contextor.py
```

각 서브앱은 독립된 `FastAPI()` 인스턴스로 선언한 뒤 `backend/main.py`에서 mount한다. `auth.py`의 `AuthMiddleware`는 root app에 등록되어 모든 요청을 가로챈다(경로별 예외는 `specs/auth/spec.md` 참고).

## AI 프로바이더 추상화

`backend/app/ai_provider.py`(서브앱 전용 폴더가 아닌 `backend/app/` 레벨 공용 모듈)가 Claude/Gemini를 `AI_PROVIDER` 환경변수로 전환 가능하게 추상화한다.

- `complete(system, user, max_tokens, tier="fast"|"smart", images=[...])` — 단일턴 완성 응답. `images`로 멀티모달 입력(model-review의 `/api/explain`이 사용).
- `stream(system, user, max_tokens, tier="smart")` — 토큰 단위 스트리밍(async generator, translator의 `/api/translate`가 사용).
- sync 컨텍스트(todo, paper-analyzer)는 `complete()` 직접 호출, async 컨텍스트(contextor, model-review)는 `asyncio.to_thread(provider.complete, ...)`로 감싸 이벤트 루프 블로킹을 방지한다.
- GeminiProvider의 스트리밍/이미지 입력 경로는 실제 SDK로 검증되지 않음 — `AI_PROVIDER=gemini` 전환 시 동작 확인 필요.

## 데이터베이스

`backend/app/database.py`가 Supabase 클라이언트를 제공한다. contextor는 이 공용 모듈을 쓰지 않고 자체적으로 Supabase 클라이언트를 생성한다 — 다른 서브앱과의 알려진 불일치이며 동작에는 문제 없음.

## 프론트엔드 규칙

- 백엔드 호출은 상대경로 사용(`/paper`, `/translate`, `/model-review`, `/todo`, `/contextor`) — 별도 baseURL 환경변수 불필요(동일 origin 서빙).
- 화면 문자열은 `frontend/src/shared/i18n/`에서 관리(하드코딩 금지, en/ko/zh 동시 추가) — `contract.md` 4절 참고.
- 디자인 토큰은 `frontend/src/shared/styles/index.css`에 정의, 세부 값·타이포·컴포넌트 표면 근거는 `ui-design-system.md` 참고, 화면 구조 원칙은 `contract.md` 참고.
- 공유 UI(`PageHeader`, `PageGuide`, `PageEmptyIntro`, `StatePanel`, `WorkspaceControls` 등)는 `frontend/src/shared/components/`에서 정의하고 각 탭에서 재사용 — `contract.md` D-004.
- 우선순위 표현은 `frontend/src/features/todos/priority.ts`만 사용 — 다른 곳에서 재구현하지 않는다.

## 모바일 OS별 네비게이션 분기

`frontend/src/shared/hooks/useDeviceOS.ts`가 `navigator.userAgent`로 iOS/Android를 판별해 `WorkspaceLayout.tsx`에서 `MobileCapsuleNavigation`(iOS) 또는 `MobileAndroidNavigation`(Android)을 분기 렌더한다. 상세 동작은 `specs/mobile-navigation/spec.md`, 값이 지금 형태로 정착한 시행착오 과정은 `ios-capsule-navigation.md`(설계 히스토리) 참고.

## 환경변수

| 변수명 | 사용 capability |
|---|---|
| `ANTHROPIC_API_KEY` | 전체 |
| `SUPABASE_URL` / `SUPABASE_KEY` / `SUPABASE_SERVICE_KEY` | 전체 |
| `S2_API_KEY` | paper-analyzer (Semantic Scholar) |
| `SECURE_COOKIE` | auth |
| `AI_PROVIDER` | 전체 ("claude"\|"gemini", 기본 claude) |
| `GEMINI_API_KEY` | 전체 (`AI_PROVIDER=gemini`일 때) |

## 배포

Docker + GitHub Actions SSH → nginx → Cloudflare Tunnel. 프론트엔드 수정 후 `frontend`에서 `npm run build` 실행 필수, `frontend/dist/` 직접 수정 금지.
