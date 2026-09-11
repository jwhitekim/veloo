import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useT } from '@/shared/i18n'
import {
  MOBILE_NAV,
  WORKSPACE_NAV_ITEMS,
  loadLastPlanNav,
  mobilePrimaryFor,
  saveLastPlanNav,
  type MobilePrimaryKey,
  type NavKey,
} from '@/shared/navigation/workspaceNav'

// 모바일 하단 캡슐 독. 시각 디자인·제스처는 기존 Shell.tsx 구현을 그대로 옮긴 것 —
// capsule-dock-spec.md의 "반드시 유지" 대상이라 애니메이션/스타일은 건드리지 않았고,
// 탭 선택이 로컬 state 대신 라우트 이동(navigate)으로 바뀐 것만 다르다.
export default function MobileCapsuleNavigation() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const { username = '' } = useParams()

  // 현재 라우트에서 활성 NavKey를 유도한다 (route가 source of truth).
  const activeNavKey: NavKey =
    WORKSPACE_NAV_ITEMS.find(item => location.pathname.startsWith(`/${username}/${item.path}`))?.key ?? 'tasks'
  const activeMobileKey = mobilePrimaryFor(activeNavKey)

  const goToNav = (key: NavKey) => {
    if (key === 'tasks' || key === 'calendar') saveLastPlanNav(key)
    navigate(`/${username}/${key}`)
  }

  const selectMobileItem = (key: MobilePrimaryKey) => {
    goToNav(key === 'plan' ? loadLastPlanNav() : key)
  }

  const tabsRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Partial<Record<MobilePrimaryKey, HTMLButtonElement | null>>>({})
  // offsetWidth를 읽는 건 강제 리플로우를 유발할 수 있는 레이아웃 읽기라, 드래그가 진행되는
  // 동안(pointermove가 매 프레임 부르는 moveIndicator 안) 매번 다시 읽지 않고 제스처 시작
  // 시점(handlePointerDown)에 한 번만 읽어서 캐싱해둔다 — 드래그 도중 바 너비가 바뀔 일은
  // 없으므로 안전하다.
  const barWidthRef = useRef(0)
  const [indicatorRect, setIndicatorRect] = useState<{ x: number; width: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  // 실제 인스타그램 앱 터치 동작 재현: 탭(드래그 없이 누르기만)일 때 바 전체(.shell-mobile-tabs,
  // 안의 인디케이터·아이콘 전부 포함)가 살짝 부풀고 filter: brightness()로 밝아진다(색 자체는
  // #c4c4c4 고정, WorkspaceLayout.css 참고) — isPressed가 유지되는 동안은 드래그로 이어져도
  // 계속 밝고, 손을 뗄 때만 꺼진다(2026-09-11, "밝기가 늘어났다가 마는 버그"를 근본적으로
  // 수정하며 "드래그 중엔 밝아지면 안 된다"던 이전 결정을 뒤집음). isPressed는 pointerdown
  // 즉시 켜진다 — 살짝 눌렀다 떼는 탭에도 피드백이 있어야 하므로.
  const [isPressed, setIsPressed] = useState(false)
  const gestureRef = useRef<{ startX: number; moved: boolean; target: MobilePrimaryKey } | null>(null)
  const suppressClickRef = useRef(false)
  // 2026-09-10: pointermove는 기기에 따라 화면 주사율보다 훨씬 자주(디바운스 없이) 발생할 수
  // 있는데, 매번 바로 moveIndicator()를 불러 setState하면 프레임당 여러 번 렌더가 몰려
  // 드래그가 끊겨 보였다("옆으로 밀리는 애니메이션이 뚝뚝 끊김"). 최신 좌표만 ref에 저장해두고
  // requestAnimationFrame으로 프레임당 한 번만 실제 갱신하도록 코얼레싱한다.
  const pendingClientXRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (isDragging) return
    const button = tabRefs.current[activeMobileKey]
    const track = trackRef.current
    if (!button || !track) return
    setIndicatorRect(indicatorRectFor(button))

    const tabs = tabsRef.current
    const observer = new ResizeObserver(() => {
      const b = tabRefs.current[activeMobileKey]
      if (b) setIndicatorRect(indicatorRectFor(b))
    })
    if (tabs) observer.observe(tabs)
    observer.observe(button)
    return () => observer.disconnect()
  }, [activeMobileKey, isDragging])

  const nearestTab = (clientX: number): MobilePrimaryKey => {
    let nearest = MOBILE_NAV[0].key
    let distance = Number.POSITIVE_INFINITY
    for (const { key } of MOBILE_NAV) {
      const button = tabRefs.current[key]
      if (!button) continue
      const rect = button.getBoundingClientRect()
      const nextDistance = Math.abs(clientX - (rect.left + rect.width / 2))
      if (nextDistance < distance) {
        nearest = key
        distance = nextDistance
      }
    }
    return nearest
  }

  const moveIndicator = (clientX: number) => {
    const track = trackRef.current
    const first = tabRefs.current[MOBILE_NAV[0].key]
    const last = tabRefs.current[MOBILE_NAV[MOBILE_NAV.length - 1].key]
    const width = indicatorRect?.width ?? (first ? first.offsetWidth - INDICATOR_INSET * 2 : undefined)
    if (!track || !first || !last || width == null) return
    const rect = track.getBoundingClientRect()
    const pointerX = clientX - rect.left - width / 2
    const minX = first.offsetLeft + INDICATOR_INSET
    const maxX = last.offsetLeft + last.offsetWidth - INDICATOR_INSET - width
    const x = Math.min(maxX, Math.max(minX, pointerX))
    const target = nearestTab(clientX)
    // 2026-09-10: 드래그 중엔 setState 대신 DOM을 직접 건드린다 — state를 매 프레임 바꾸면
    // 인디케이터 하나 때문에 컴포넌트 전체(탭 5개, 아이콘, Plan 스위처)가 매 프레임 리렌더된다.
    // 위치만 바뀌면 되므로 ref로 transform만 직접 갱신하고, 손을 뗄 때(finishGesture)만
    // state를 최종값으로 동기화해 React 트리와 다시 맞춘다 — width는 드래그 중 안 바뀌므로
    // state 그대로 둬도 무방.
    if (indicatorRef.current) indicatorRef.current.style.transform = `translateX(${x}px)`
    // 손가락이 양 끝(첫/마지막 탭)을 넘어서려 하면, 바 전체가 옮겨가는 게 아니라 반대쪽 모서리는
    // 그 자리에 고정된 채 밀리는 쪽 모서리(굴곡선)만 늘어나 끌려가는 느낌을 낸다 — 넘어간
    // 만큼(overshoot)을 감쇠시켜서(sqrt로 체감) scaleX로 늘리되, transform-origin은 항상
    // center로 고정하고 translateX로 절반을 보정해 한쪽만 고정한 효과를 낸다(아래 참고,
    // 2026-09-11 — 예전엔 transform-origin 자체를 옮겼는데, "왼쪽 끝도 움직인다"는 문제가 있었음).
    const bar = tabsRef.current
    const barWidth = barWidthRef.current
    if (bar && barWidth) {
      const overshoot = pointerX < minX ? pointerX - minX : pointerX > maxX ? pointerX - maxX : 0
      const push = Math.min(EDGE_PUSH_MAX_PX, Math.sqrt(Math.abs(overshoot)) * EDGE_PUSH_FACTOR)
      // 중심 기준(transform-origin: center center)으로 scaleX하면 양쪽이 push/2씩 대칭으로
      // 늘어난다. 여기에 push/2만큼 반대 방향 translateX를 더하면, 미는 쪽은 push만큼 늘고
      // 반대쪽은 정확히 고정된다 — origin을 옮기지 않고도 "한쪽 고정" 효과를 낸다(2026-09-11).
      const shift = overshoot > 0 ? push / 2 : overshoot < 0 ? -push / 2 : 0
      bar.style.setProperty('--shell-edge-scale', `${(barWidth + push) / barWidth}`)
      bar.style.setProperty('--shell-edge-shift', `${shift}px`)
    }
    if (gestureRef.current) gestureRef.current.target = target
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = { startX: event.clientX, moved: false, target: nearestTab(event.clientX) }
    barWidthRef.current = tabsRef.current?.offsetWidth ?? 0
    setIsPressed(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current
    if (!gesture) return
    if (!gesture.moved && Math.abs(event.clientX - gesture.startX) < 5) return
    // 브라우저가 이 움직임을 자체 스크롤/스와이프 제스처로 가로채면 pointercancel이 발생해
    // 손 뗀 것처럼 처리되며 원래 탭 위치로 스냅돼버린다("알약을 놓친다") — 명시적으로 막는다.
    event.preventDefault()
    gesture.moved = true
    setIsDragging(true)
    pendingClientXRef.current = event.clientX
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        if (pendingClientXRef.current != null) moveIndicator(pendingClientXRef.current)
      })
    }
  }

  const finishGesture = (event: React.PointerEvent<HTMLElement>, cancelled = false) => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    pendingClientXRef.current = null
    const gesture = gestureRef.current
    gestureRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (gesture?.moved && !cancelled) {
      suppressClickRef.current = true
      selectMobileItem(gesture.target)
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
    }
    const snapKey = gesture?.moved && !cancelled ? gesture.target : activeMobileKey
    const button = tabRefs.current[snapKey]
    if (button) setIndicatorRect(indicatorRectFor(button))
    // 손을 떼면(또는 제스처가 취소되면) 러버밴드로 늘어났던 모서리가 원래 모양으로 되돌아온다 —
    // .shell-mobile-tabs의 transition이 이 복귀도 부드럽게 애니메이션해준다. 2026-09-11부터
    // transform-origin을 안 건드리므로(항상 center 고정) 예전처럼 origin을 그대로 둘지
    // 고민할 필요가 없어짐 — edge-scale/edge-shift 둘 다 그냥 기본값으로 되돌리면 됨.
    tabsRef.current?.style.setProperty('--shell-edge-scale', '1')
    tabsRef.current?.style.setProperty('--shell-edge-shift', '0px')
    setIsDragging(false)
    setIsPressed(false)
  }

  return (
    <>
      {activeMobileKey === 'plan' && (
        <nav className="shell-plan-switcher" aria-label={t('shell.workspace.plan')}>
          <button type="button" onClick={() => goToNav('tasks')} className={activeNavKey === 'tasks' ? 'is-active' : ''}>
            <MOBILE_NAV_TASKS_ICON />{t('shell.nav.todo')}
          </button>
          <button type="button" onClick={() => goToNav('calendar')} className={activeNavKey === 'calendar' ? 'is-active' : ''}>
            <MOBILE_NAV_CALENDAR_ICON />{t('shell.nav.calendar')}
          </button>
        </nav>
      )}

      <div className="shell-mobile-dock">
        <nav
          ref={tabsRef}
          className={`shell-mobile-tabs${isDragging ? ' is-dragging' : ''}${isPressed ? ' is-pressed' : ''}`}
          aria-label={t('shell.workspaceAria')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={event => finishGesture(event)}
          onPointerCancel={event => finishGesture(event, true)}
        >
          <div ref={trackRef} className="shell-mobile-tabs-track">
            {indicatorRect && (
              <div
                ref={indicatorRef}
                className="shell-mobile-tab-indicator"
                style={{
                  width: indicatorRect.width,
                  transform: `translateX(${indicatorRect.x}px)`,
                }}
              />
            )}
            {MOBILE_NAV.map(({ key, Icon, IconSolid, label }) => {
              // 드래그 중 인디케이터가 지나가며 "가리키는" 탭이 아니라, 실제로 선택이 확정된
              // (activeMobileKey가 바뀐) 탭만 굵은/면형 아이콘으로 바꾼다 — 지나가기만 해도
              // 굵어지면 "선택된 것"과 "지나가는 중"이 구분이 안 된다는 피드백(2026-09-06).
              const isActive = activeMobileKey === key
              // 선택된 탭만 면형(solid) 아이콘, 나머지는 선형(outline) — heroicons가 같은 도상을
              // 두 굵기로 제공해줘서 lucide 때처럼 CSS로 채우기를 흉내 낼 필요가 없다.
              const TabIcon = isActive ? IconSolid : Icon
              return (
                <button
                  key={key}
                  ref={element => { tabRefs.current[key] = element }}
                  type="button"
                  onClick={() => { if (!suppressClickRef.current) selectMobileItem(key) }}
                  className={`shell-mobile-tab${isActive ? ' is-active' : ''}`}
                  aria-current={activeMobileKey === key ? 'page' : undefined}
                >
                  <TabIcon />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </>
  )
}

// 인디케이터 폭을 탭 버튼(offsetWidth) 그대로 쓰면 세그먼트 전체를 꽉 채운다. 좁은 화면에서
// 5개 탭 세그먼트 폭이 다 ~70px 정도로 좁아서(flex:1 20%, 탭마다 동일), 인셋을 너무 크게 주면
// 높이(WorkspaceLayout.css의 .shell-mobile-tab-indicator, 44px)보다 폭이 좁아져 다시 원형이
// 된다 — 인셋을 3px로 줄여서 폭을 최대한 확보(2026-09-05 실제 기기 DOM 계산값으로 확인).
const INDICATOR_INSET = 3

// 드래그로 양 끝을 넘어서려 할 때 반대쪽 모서리는 고정한 채 미는 쪽 모서리만 늘어나는
// 러버밴드 효과의 감쇠 계수 — EDGE_PUSH_FACTOR는 넘어간 픽셀(sqrt로 체감)당 늘어나는 정도,
// EDGE_PUSH_MAX_PX는 그 늘어나는 폭(px)의 상한.
const EDGE_PUSH_FACTOR = 1.4
const EDGE_PUSH_MAX_PX = 8

function indicatorRectFor(button: HTMLButtonElement) {
  return {
    x: button.offsetLeft + INDICATOR_INSET,
    width: button.offsetWidth - INDICATOR_INSET * 2,
  }
}

// Plan 스위처 아이콘은 WORKSPACE_NAV_ITEMS에서 그대로 가져와 하드코딩 중복을 피한다.
const MOBILE_NAV_TASKS_ICON = WORKSPACE_NAV_ITEMS.find(item => item.key === 'tasks')!.Icon
const MOBILE_NAV_CALENDAR_ICON = WORKSPACE_NAV_ITEMS.find(item => item.key === 'calendar')!.Icon
