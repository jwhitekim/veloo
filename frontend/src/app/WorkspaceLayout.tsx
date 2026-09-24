import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useT } from '@/shared/i18n'
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { WORKSPACE_NAV_ITEMS, loadLastPlanNav } from '@/shared/navigation/workspaceNav'
import { useDeviceOS } from '@/shared/hooks/useDeviceOS'
import DesktopSidebar from './DesktopSidebar'
import MobileCapsuleNavigation from './MobileCapsuleNavigation'
import MobileAndroidNavigation from './MobileAndroidNavigation'
import './WorkspaceLayout.css'

// Workspace Layout — 화면 선택은 하지 않는다 (그건 Router의 일이다).
// TopBar + DesktopSidebar + 모바일 하단 네비게이션을 배치하고, 실제 페이지는
// <Outlet />이 현재 route에 맞는 것을 그려준다. 모바일 하단 네비게이션은 iOS/Android로
// 컴포넌트 자체가 갈린다(docs/specs/mobile-navigation/spec.md) — useDeviceOS()로 분기.
export default function WorkspaceLayout() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const { username = '' } = useParams()
  const deviceOS = useDeviceOS()

  const activeItem = WORKSPACE_NAV_ITEMS.find((item) => location.pathname.startsWith(`/${username}/${item.path}`))
  useEffect(() => {
    document.title = activeItem ? t(activeItem.labelKey) : 'Veloo'
  }, [activeItem, t])

  const [loggingOut, setLoggingOut] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userMenuOpen) return
    const handleOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [userMenuOpen])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    setUserMenuOpen(false)
    try {
      const response = await fetch('/logout', { method: 'DELETE' })
      if (!response.ok) throw new Error('logout failed')
      navigate('/', { replace: true })
    } catch {
      setLoggingOut(false)
    }
  }

  return (
    <div className="shell-desktop">
      <header className="shell-topbar">
        <div className="shell-brand-wrap">
          <button
            type="button"
            className="shell-brand"
            onClick={() => navigate(`/${username}/${loadLastPlanNav()}`)}
            aria-label={t('shell.home')}
          >
            <span className="shell-brand-mark">
              <img src="/favicon.svg?v=2" alt="" width={20} height={20} />
            </span>
            <span className="shell-brand-text">Veloo</span>
          </button>
        </div>
        <div className="shell-topbar-end">
          <div ref={userMenuRef} className="shell-user-menu">
            <button
              type="button"
              className="shell-user-button"
              onClick={() => setUserMenuOpen((open) => !open)}
              aria-label={t('shell.accountMenu')}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
            >
              {username.slice(0, 1).toUpperCase() || 'V'}
            </button>
            {userMenuOpen && (
              <div className="shell-user-popover" role="menu">
                <div className="shell-user-identity">
                  <span className="shell-user-avatar">{username.slice(0, 1).toUpperCase() || 'V'}</span>
                  <div>
                    <strong>{username}</strong>
                    <small>{t('shell.workspaceLabel')}</small>
                  </div>
                </div>
                <div className="shell-user-setting">
                  <span>{t('shell.language')}</span>
                  <LanguageSwitcher />
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="shell-user-logout"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOut />
                  <span>{loggingOut ? t('shell.loggingOut') : t('shell.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="shell-body">
        <DesktopSidebar />
        <main className="shell-content">
          {deviceOS === 'android' ? <MobileAndroidNavigation /> : <MobileCapsuleNavigation />}
          <div className="shell-view">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
