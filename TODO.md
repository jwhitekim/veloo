# TODO

## 완료
- [x] 모바일 캡슐 독 밝기 버그 근본 해결 ("드래그 중엔 밝아지면 안 된다" 결정을 뒤집음 — 손 뗄 때까지 계속 밝게 유지)
- [x] OS별(iOS/Android) 모바일 네비게이션 스위칭 구현 (useDeviceOS 훅, MobileAndroidNavigation 추가)
- [x] 모바일 캡슐 독 밝기 버그 실제 수정 (is-dragging 순간 filter 전환 0s로 즉시 컷오프)
- [x] OS별(iOS/Android) 네비게이션 스위칭 방향 문서 정리
- [x] 모바일 캡슐 독 밝기 버그 원인 분석 (드래그 시작 시 brightness 전환이 중간에 역전 — docs/capsule-dock-spec.md 기록, 수정은 보류)
- [x] 모바일 캡슐 독 드래그 애니메이션 추가 개선 (드래그 중 setState 제거, ref 직접 조작으로 리렌더 최소화)
- [x] 모바일 캡슐 독 피드백 3건 수정 (밝기 필터 보간 버그, 드래그 rAF 스로틀링, 바 높이 58→64px)
- [x] todo-guard 프로젝트 로컬 세팅
- [x] 프로젝트 스킬 필요성 검토 (7개 전부 필요, 삭제 대상 없음)
- [x] doc-check 위반 11개 문서 전체 수정 (남은 11건은 코드 변수명/파일명 오탐, 실제 위반 0건)
- [x] docs/README.md 문서 색인 추가

## 보류 (사용자 확인 필요)
