import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useT } from '@/shared/i18n'
import {
  MOBILE_NAV,
  WORKSPACE_NAV_ITEMS,
  loadLastPlanNav,
  mobilePrimaryFor,
  saveLastPlanNav,
  type NavKey,
} from '@/shared/navigation/workspaceNav'

// Android용 하단 네비게이션. docs/os-nav-switching-plan.md의 "Android 네비게이션 방향" 참고 —
// iOS의 플로팅 캡슐 독과 달리 Material 3 관례를 따라 하단 고정 바(container) + 아이콘/라벨,
// 선택된 항목만 배경에 알약형(pill) 하이라이트를 준다(독 전체가 뜨는 캡슐 방식이 아님).
// 드래그로 미끄러지는 인디케이터 제스처는 iOS 캡슐 독 전용 상호작용이라 여기엔 없음 — 탭만 지원.
export default function MobileAndroidNavigation() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const { username = '' } = useParams()

  const activeNavKey: NavKey =
    WORKSPACE_NAV_ITEMS.find(item => location.pathname.startsWith(`/${username}/${item.path}`))?.key ?? 'tasks'
  const activeMobileKey = mobilePrimaryFor(activeNavKey)

  const goToNav = (key: NavKey) => {
    if (key === 'tasks' || key === 'calendar') saveLastPlanNav(key)
    navigate(`/${username}/${key}`)
  }

  const selectMobileItem = (key: typeof MOBILE_NAV[number]['key']) => {
    goToNav(key === 'plan' ? loadLastPlanNav() : key)
  }

  return (
    <>
      {activeMobileKey === 'plan' && (
        <nav className="shell-plan-switcher" aria-label={t('shell.workspace.plan')}>
          <button type="button" onClick={() => goToNav('tasks')} className={activeNavKey === 'tasks' ? 'is-active' : ''}>
            <ANDROID_NAV_TASKS_ICON />{t('shell.nav.todo')}
          </button>
          <button type="button" onClick={() => goToNav('calendar')} className={activeNavKey === 'calendar' ? 'is-active' : ''}>
            <ANDROID_NAV_CALENDAR_ICON />{t('shell.nav.calendar')}
          </button>
        </nav>
      )}

      <nav className="shell-android-tabs" aria-label={t('shell.workspaceAria')}>
        {MOBILE_NAV.map(({ key, Icon, IconSolid, label }) => {
          const isActive = activeMobileKey === key
          const TabIcon = isActive ? IconSolid : Icon
          return (
            <button
              key={key}
              type="button"
              onClick={() => selectMobileItem(key)}
              className={`shell-android-tab${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="shell-android-tab-pill">
                <TabIcon />
              </span>
              <span>{label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}

// Plan 스위처 아이콘은 WORKSPACE_NAV_ITEMS에서 그대로 가져온다 — MobileCapsuleNavigation.tsx와
// 동일한 이유(하드코딩 중복 방지)로 여기서도 반복.
const ANDROID_NAV_TASKS_ICON = WORKSPACE_NAV_ITEMS.find(item => item.key === 'tasks')!.Icon
const ANDROID_NAV_CALENDAR_ICON = WORKSPACE_NAV_ITEMS.find(item => item.key === 'calendar')!.Icon
