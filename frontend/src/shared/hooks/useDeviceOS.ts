// docs/os-nav-switching-plan.md의 "전환 기준" 참고. UA로 iOS/Android를 구분해 모바일
// 하단 네비게이션(iOS: 캡슐 독 / Android: 하단 고정 바)을 분기하기 위한 훅.
const OVERRIDE_KEY = 'veloo:os-override'

export type DeviceOS = 'ios' | 'android'

function detectFromUA(userAgent: string): DeviceOS {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  // 2순위: 둘 다 매치 실패(데스크톱 UA로 반응형만 축소한 경우 등) — 기본값은 캡슐 독 유지.
  return 'ios'
}

function readOverride(): DeviceOS | null {
  const param = new URLSearchParams(window.location.search).get('os')
  if (param === 'ios' || param === 'android') return param
  const stored = window.localStorage.getItem(OVERRIDE_KEY)
  if (stored === 'ios' || stored === 'android') return stored
  return null
}

// UA/오버라이드는 세션 도중 바뀌지 않는다고 보고 최초 렌더 시 한 번만 계산한다
// (리사이즈 등으로 재평가할 필요가 있는 useIsMobile과 다른 지점).
export function useDeviceOS(): DeviceOS {
  return readOverride() ?? detectFromUA(window.navigator.userAgent)
}
