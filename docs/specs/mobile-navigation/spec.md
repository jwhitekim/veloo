# Mobile Navigation Specification

## Purpose

앱 전환 탭의 슬라이딩 캡슐 인디케이터 동작을 규정한다. 데스크톱(상단 탭바)과 모바일(하단 캡슐 독)에 서로 다른 형태로 구현된다. 시행착오·디자인 판단 근거는 `docs/ios-capsule-navigation.md`(현재 값의 히스토리)와 `docs/capsule-navigation-research.md`(외부 레퍼런스 리서치) 참고 — 이 스펙은 "지금 정확히 어떻게 동작하는가"만 담는다.

## Requirements

### Requirement: OS별 하단 네비게이션 컴포넌트 분기
시스템은 `navigator.userAgent`로 iOS(`/iPhone|iPad|iPod/i`)와 Android(`/Android/i`)를 판별해, iOS는 캡슐 독을, Android는 하단 고정 바를 렌더링해야 한다(SHALL). 둘 다 매치되지 않는 환경(데스크톱 UA로 반응형만 축소한 경우 등)에서는 기본값으로 캡슐 독을 유지해야 한다(SHALL). `?os=ios`/`?os=android` 쿼리 파라미터 또는 `localStorage`(`veloo:os-override`) 값이 있으면 UA 판별보다 우선해야 한다(SHALL) — 실기기 없이 개발 중 강제 전환하기 위함.

#### Scenario: Android 기기에서 접속
- GIVEN 사용자의 `navigator.userAgent`에 `Android`가 포함됨
- WHEN 워크스페이스 레이아웃이 렌더링됨
- THEN 하단 고정 바(`MobileAndroidNavigation`)가 표시되고 캡슐 독은 표시되지 않음

#### Scenario: 오버라이드 쿼리 파라미터
- GIVEN 실제 UA는 iOS이지만 URL에 `?os=android`가 붙어 있음
- WHEN 훅이 OS를 판별함
- THEN UA를 무시하고 Android 하단 바가 표시됨

### Requirement: Android 하단 바는 iOS 캡슐 독과 다른 컨테이너, 같은 선택 표시 원칙
Android 하단 네비게이션은 플로팅 캡슐이 아니라 화면 폭 전체의 고정 바여야 하며(SHALL), 드래그 제스처를 지원하지 않고 탭만 지원해야 한다(SHALL). 선택 표시는 iOS와 동일하게 색이 아니라 아이콘 굵기/채움으로만 해야 하며(SHALL), 배경 하이라이트(pill 등 인디케이터)를 사용해서는 안 된다(SHALL NOT).

#### Scenario: Android에서 탭 선택
- GIVEN Android 하단 바가 표시되고 있음
- WHEN 사용자가 탭 하나를 선택함
- THEN 아이콘 색은 변하지 않고(`--text-primary` 고정) 굵어지거나(stroke-width 3) solid로 전환됨
- AND 선택된 탭 뒤에 배경 하이라이트가 나타나지 않음

### Requirement: 인디케이터는 세그먼트 폭을 따르는 캡슐
인디케이터는 원이 아니라 활성 탭 세그먼트의 실측 폭(`offsetWidth`, `INDICATOR_INSET`만큼 인셋)을 따르는 캡슐이어야 한다(SHALL). 위치/폭은 CSS가 아니라 JS에서 `getBoundingClientRect`/`offsetLeft`/`offsetWidth`로 매 렌더 실측한다(SHALL).

#### Scenario: 라벨 길이가 다른 탭 사이 전환
- GIVEN 데스크톱 상단 탭바에서 라벨 길이가 서로 다른 두 탭이 있음
- WHEN 사용자가 짧은 라벨 탭에서 긴 라벨 탭으로 전환함
- THEN 인디케이터 폭이 새 탭의 실측 폭에 맞게 바뀜

### Requirement: 데스크톱 탭 전환은 클릭만 지원
데스크톱(≥641px) 상단 탭바(`.shell-app-nav`)는 클릭으로만 전환되며 드래그 제스처를 지원하지 않는다(SHALL). 탭 전환 시 인디케이터는 `transform`(위치)과 `width`(폭)를 0.5초 오버슈트 이징으로 함께 트랜지션한다(SHALL).

#### Scenario: 데스크톱 탭 클릭
- GIVEN 사용자가 데스크톱 화면에서 다른 탭을 클릭함
- WHEN 인디케이터가 새 위치로 이동함
- THEN 0.5초 동안 슬라이드 애니메이션이 재생됨(즉시 순간이동하지 않음)

### Requirement: 모바일 하단 독은 5개 슬롯, Plan이 Todo/Calendar 통합
모바일(≤640px) 하단 독은 정확히 5개 탭(Plan/Paper/Trans/Models/Concepts)을 균등 분할(`flex: 1 1 20%`)로 표시해야 한다(SHALL). Plan 탭은 Todo와 Calendar를 통합하며, 마지막으로 본 화면(Todo 또는 Calendar)을 `localStorage`(`veloo:last-plan-app`)에 저장했다가 Plan 탭 재진입 시 복원해야 한다(SHALL).

#### Scenario: Plan 탭 재방문
- GIVEN 사용자가 Calendar를 보다가 다른 탭으로 이동함
- WHEN 다시 Plan 탭을 누름
- THEN Todo가 아니라 마지막으로 본 Calendar가 표시됨

#### Scenario: Plan 탭 활성 시 서브 스위처 노출
- GIVEN 활성 탭이 Plan임
- WHEN 화면을 렌더링함
- THEN 본문 상단에 Todo/Calendar 전환용 서브 탭(`.shell-plan-switcher`)이 나타남
- AND Plan이 아닌 다른 탭에서는 이 서브 탭이 보이지 않음

### Requirement: 선택 표시는 색이 아니라 아이콘 형태로
모바일 하단 독 탭의 아이콘·라벨 색은 선택 여부와 무관하게 항상 `--text-primary`여야 한다(SHALL). 선택 여부는 아이콘 굵기(비활성 stroke-width 1.6, 활성 3)와 outline/solid 전환(heroicons, 가능한 경우)으로만 표현해야 한다(SHALL).

#### Scenario: 탭 선택
- GIVEN 사용자가 비활성 탭을 눌러 활성화함
- WHEN 아이콘이 다시 렌더링됨
- THEN 색은 변하지 않고, 아이콘이 굵어지거나(또는 solid 아이콘이 있으면 solid로 전환)
- AND Android 하단 바에서도 동일 원칙(색 대신 굵기/채움) 적용, 알약형 배경 하이라이트는 사용하지 않음

### Requirement: 캡슐 눌림 피드백은 손을 뗄 때까지 유지
탭이 눌린 상태(`is-pressed`)인 동안, 드래그로 이어지는지 여부와 무관하게 캡슐 바 전체(배경·인디케이터·아이콘)가 `brightness(1.2)`로 밝아지고 `scale(1.05)`로 살짝 부풀어야 한다(SHALL). 별도 합성 레이어인 인디케이터에는 `brightness(1.08)` 보정을 함께 적용해 Safari에서도 독과 동시에 밝아져야 한다(SHALL). 밝기 전환은 눌렀을 때 0.15초로 올라가고, 손을 뗄 때만 0.15초로 꺼져야 한다(SHALL) — 드래그 시작이 밝기를 끄는 트리거가 되어서는 안 된다(SHALL NOT).

#### Scenario: 누른 채 드래그로 이어짐
- GIVEN 사용자가 탭을 누른 채 손가락을 움직여 드래그로 전환됨
- WHEN 드래그가 진행되는 동안
- THEN 캡슐의 밝기(brightness 1.2)와 부풀기(scale 1.05)가 계속 유지됨
- AND 손을 뗄 때만 원래 상태로 페이드아웃됨

#### Scenario: 단순 탭(드래그 없음)
- GIVEN 사용자가 탭을 눌렀다가 5px 미만만 움직이고 뗌
- WHEN 포인터가 눌리는 순간부터
- THEN 밝기/부풀기 피드백이 즉시 시작되어 손을 뗄 때 꺼짐
- AND 인디케이터도 독과 같은 0.15초 전환으로 동시에 밝아짐

### Requirement: 드래그 중 인디케이터는 포인터를 실시간 추적
탭을 누른 채 5px 이상 움직이면 드래그로 확정되고, 인디케이터는 포인터 x좌표를 프레임당 최대 1회(`requestAnimationFrame` 코얼레싱) 갱신하며 실시간 추적해야 한다(SHALL). 드래그 중에는 인디케이터의 `transform`/`width` 트랜지션을 꺼야 한다(SHALL) — 지연이 있으면 손끝을 따라가지 못하기 때문. 드래그 중 인디케이터가 스치는 탭의 아이콘은 실제로 선택이 확정되기 전까지 활성 스타일로 바뀌어서는 안 된다(SHALL NOT).

#### Scenario: 드래그로 여러 탭을 스치듯 지나감
- GIVEN 사용자가 Plan에서 Concepts까지 드래그로 쭉 이동함
- WHEN 인디케이터가 중간의 Paper, Trans, Models를 지나감
- THEN 지나가는 탭들의 아이콘은 활성(굵은/solid) 스타일로 바뀌지 않음
- AND 최종적으로 손을 뗀 지점에서 가장 가까운 탭만 선택됨

#### Scenario: 브라우저 제스처 가로채기 방지
- GIVEN 사용자가 하단 독 위에서 드래그를 시작함
- WHEN 브라우저가 이를 스크롤/스와이프 제스처로 해석하려 함
- THEN `touch-action: none`과 `preventDefault()`로 가로채기를 막아 `pointercancel`로 인한 스냅을 방지함

### Requirement: 경계를 넘는 드래그는 반대쪽을 고정한 채 미는 쪽만 늘어남
첫/마지막 탭 경계를 넘어서는 드래그(overshoot)는 캡슐 바 전체를 반응시키되, 반대쪽 모서리는 완전히 고정되고 미는 쪽 모서리만 늘어나야 한다(SHALL). 이 효과는 `transform-origin`을 항상 `center`로 고정한 채 `scaleX` + `translateX` 보정의 조합으로 구현해야 하며(SHALL), 반대쪽이 시각적으로 조금이라도 움직여서는 안 된다(SHALL NOT).

#### Scenario: 마지막 탭(Concepts) 너머로 드래그
- GIVEN 사용자가 마지막 탭 오른쪽 경계를 넘어 드래그함
- WHEN 바가 러버밴드처럼 반응함
- THEN 바의 왼쪽 끝은 픽셀 단위로 전혀 움직이지 않음
- AND 오른쪽 끝만 늘어난 폭(`EDGE_PUSH_MAX_PX` 8px 상한, sqrt 체감)만큼 늘어남
- AND 손을 떼면 원래 폭으로 부드럽게 복귀함

### Requirement: 축소 모션 대응
`prefers-reduced-motion: reduce` 환경에서는 캡슐 바와 인디케이터의 트랜지션 지속시간이 0.01ms로 강제되어야 한다(SHALL).

#### Scenario: 접근성 설정 사용자의 탭 전환
- GIVEN 사용자 OS가 `prefers-reduced-motion: reduce`를 설정함
- WHEN 탭을 전환하거나 드래그함
- THEN 애니메이션이 사실상 즉시 완료됨(지속시간 0.01ms)
