# Proposal: Verify Android Navigation on Real Hardware

## Intent
Android 하단 네비게이션 바(`MobileAndroidNavigation`)는 실제 Android 기기 보유 없이 크롬 개발자도구 기기 에뮬레이션(UA 오버라이드)만으로 개발·확인됨. 색상·치수·터치 반응이 실기기에서도 자연스러운지 검증 필요.

## Scope
In scope:
- 실제 Android 기기(또는 신뢰할 만한 원격 기기 테스트 서비스)에서 하단 바 육안 확인
- 바 높이(64px), 아이콘 크기(24px), stroke-width 전환(1.8/3)이 실기기 화면 밀도에서 어색하지 않은지 확인
- 삼성 One UI 등 제조사 커스텀 시스템 UI와 겹치거나 충돌하지 않는지 확인

Out of scope:
- iOS 캡슐 독 재검증 (이미 실사용 중, 별도 스펙 `mobile-navigation`으로 안정화됨)
- Material 3 가이드라인 전면 재검토

## Approach
Android 실기기 접근이 생기는 대로(또는 BrowserStack 등 원격 기기 서비스) 육안 확인 후, 필요한 조정 값을 `openspec/specs/mobile-navigation/spec.md`에 델타로 반영하고 이 변경을 archive한다. 현재는 착수 시점 미정 — proposal만 기록해두는 단계.
