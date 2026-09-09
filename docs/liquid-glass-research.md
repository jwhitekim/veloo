# iOS 26 Liquid Glass — 오픈소스 리서치 노트

veloo 모바일 하단 독 · 데스크톱 상단 탭 인디케이터를 만들며 참고한 저장소와, 각 저장소에서 나온 디자인 판단 기록.

- 작업 파일: `frontend/src/app/Shell.tsx`, `frontend/src/app/Shell.css`
- 정리일: 2026-08-15

## 참고 저장소

공식 문서가 없는 영역이라, 실제 코드를 열어 확인한 것만 신뢰도를 별도 표시(**권위**)했다.

| 저장소 | 성격 | 확인한 것 |
|---|---|---|
| [ryanashcraft/FabBar](https://github.com/ryanashcraft/FabBar) | SwiftUI · iOS 26 탭바 재현 (네이티브 UISegmentedControl 래핑) | 좌우/하단 여백 21pt, 바 높이 62pt, 아이콘 컨테이너 28pt, 적은 탭일 때 세그먼트 폭 98pt. 인디케이터는 직접 안 그리고 시스템 `findIndicatorView()`를 그대로 씀 — `cornerRadius = indicatorRect.height/2`로 캡슐 모양 확정. `touchesMoved`로 손가락 위치 실시간 추적. |
| **[callstack/liquid-glass](https://github.com/callstack/liquid-glass)** (권위) | React Native · 진짜 네이티브 `UIGlassEffect` API 래퍼 | 그림자 관련 코드가 **한 줄도 없음**. "리퀴드 글래스 고유 그림자 값"은 iOS 비공개 컴포지터가 그리는 값이라, 어떤 오픈소스도 정확한 수치를 공개적으로 갖고 있지 않다는 걸 증명하는 소스. |
| [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) | 웹 · CSS만으로 시각 근사 | 실제 적용값의 출처. `overLight`(밝은 배경용) 그림자 `0px 16px 70px rgba(0,0,0,.75)` + inset 하이라이트 3겹, 135° 대각선 그라데이션 배경, blur 공식 `(overLight?12:4)+blurAmount*32`. |
| [aessam/DualCapsuleTabBar](https://github.com/aessam/DualCapsuleTabBar) | SwiftUI · iOS26 스타일 탭바 + 확장형 검색 데모 | `matchedGeometryEffect` + `Capsule()`로 인디케이터가 탭 "자기 자신의" 위치·폭에 맞춰 모핑. veloo 독의 최종 구조(듀얼 캡슐 + 확장형 검색)에 직접 반영됨. |
| [daangn/seed-design](https://github.com/daangn/seed-design) | 당근마켓 공식 디자인 시스템 (오픈소스) | Bottom Navigation 문서: 인디케이터 형태 자체가 없고, 아이콘 **Fill/Line 스타일 전환 + 색 톤**만으로 선택 표시. veloo는 iOS26 감성 유지로 결정하며 이 방식은 채택하지 않음. |
| [nikdelvin/liquid-glass](https://github.com/nikdelvin/liquid-glass) | 웹 · SVG displacement 기반 정밀 재현 | 참고했으나 정확한 소스 파일 경로 추출 실패, 최종 값 적용에는 사용 안 함. |

## 적용된 값

위 저장소들에서 확인해 실제 `Shell.css`에 반영한 수치.

| 요소 | 적용값 | 근거 |
|---|---|---|
| 좌우 여백 | `21px` | FabBar Constants.swift |
| 하단 여백 | `safe-area + 21px` | FabBar Constants.swift |
| 모서리 반경 | `border-radius: 9999px` (캡슐) | FabBar — `indicatorRect.height/2` |
| 인디케이터 폭 | 세그먼트 자신의 폭 추종 | DualCapsuleTabBar — `matchedGeometryEffect` |
| 바깥 그림자 | `0px 16px 70px rgba(0,0,0,.75)` | rdev/liquid-glass-react (overLight) |
| 배경 | 135° 대각선 그라데이션 시트 | rdev/liquid-glass-react |
| 블러 | `14px` (overLight 공식) | rdev/liquid-glass-react |

## 디자인 철학

**01 · 인디케이터는 원이 아니라 세그먼트다**
고정 크기 원(28px)으로 처음 구현했다가, FabBar와 DualCapsuleTabBar 둘 다 "인디케이터가 탭 자기 자신의 폭에 맞춰진 캡슐"임을 확인해줘서 재수정. 아이콘 사이 빈 공간도 터치·시각적으로 해당 탭에 속해야 함.

**02 · 그림자 값에 "정답"은 없다**
Apple 네이티브 컴포지터가 그리는 값이라 `callstack/liquid-glass`조차 그림자 코드 부재. 같은 이유로 웹 CSS 근사치(`rdev/liquid-glass-react`)를 "정답"이 아니라 "가장 신뢰할 수 있는 근사치"로 채택 — 임의로 만든 숫자와는 구분해서 다룸.

**03 · 이동 인디케이터가 항상 필요한 건 아니다**
당근마켓 Bottom Navigation은 인디케이터 없이 색 톤 변화만으로 선택 상태를 표시 — 탭 4~5개짜리 앱 내비게이션엔 그것으로 충분하다는 뜻. veloo는 iOS 26 감성을 원해서 인디케이터 방식을 유지했으나, 취향의 문제지 정답의 문제는 아님.

**04 · 웹은 네이티브 제스처를 공짜로 못 받는다**
iOS의 `UISegmentedControl`은 드래그-이동이 시스템 차원에서 지원됨. 웹으로 같은 것을 구현하려면 `touch-action: none`, `pointercancel` 처리 같은 브라우저 특유의 함정을 직접 막아야 함 — 막지 않으면 브라우저가 제스처를 스크롤 시도로 오해해서 도중에 끊음.
