# 문서 색인

veloo 프로젝트 문서 목록. 모든 스펙과 설계 문서는 `docs/` 아래에서 관리하며, capability별 요구사항은 `docs/specs/`에서 관리한다.

## 읽는 순서

1. [문서 배치 규칙](docs-rules.md)
2. [상위 계약](contract.md)
3. [기술 설계](design.md)
4. [제품 및 capability 스펙](specs/product/spec.md)
5. [구현 체크리스트](tasks.md)

## 살아있는 스펙 (docs/specs/)

- [auth](specs/auth/spec.md) - 로그인/회원가입/세션 미들웨어
- [paper-analyzer](specs/paper-analyzer/spec.md) - 논문 검색·분석
- [translator](specs/translator/spec.md) - 스트리밍 번역
- [model-review](specs/model-review/spec.md) - 아키텍처 설명·채점
- [todo](specs/todo/spec.md) - 할 일·단계·리마인드
- [contextor](specs/contextor/spec.md) - 용어 맥락별 조회
- [product](specs/product/spec.md) - 제품 원칙, 페이지 계약, 완료 기준, 변경 절차
- [mobile-navigation](specs/mobile-navigation/spec.md) - iOS 캡슐 독 / Android 하단 바 동작

변경 제안과 전체 체크리스트는 [`proposal.md`](proposal.md), [`design.md`](design.md), [`tasks.md`](tasks.md) 참고.

## 참고 자료 (docs/)

- [기능 상세](features_ko.md) / [Feature details](features.md) - 모듈별 기능 설명(사용자 대상)
- [프로젝트 명세서](veloo-spec.md) - 문제 정의, 솔루션 개요, 기술 스택
- [UI 디자인 시스템](ui-design-system.md) - 색상 토큰, 타이포그래피, 레이아웃 규칙
- [iOS 캡슐 내비게이션 설계 히스토리](ios-capsule-navigation.md) - 현재 값이 정착한 과정(실제 동작은 `mobile-navigation` 스펙 참고)
- [캡슐 내비게이션 디자인 조사](capsule-navigation-research.md) - 탭 인디케이터 디자인 참고 자료
- [배포 점검 보고서](reports/deploy-monitor-report-2026-08-24.md) - 2026-08-24 배포 점검 기록

루트 문서: [README](../README.md) / [한국어 README](../README_KO.md) / [Changelog](../CHANGELOG.md)
