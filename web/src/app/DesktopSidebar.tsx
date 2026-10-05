import { NavLink } from 'react-router-dom'
import { useT } from '@/shared/i18n'
import { WORKSPACE_NAV } from '@/shared/navigation/workspaceNav'

// Desktop Primary Navigation. 좌측 고정 사이드바 — Mobile Capsule Navigation과
// WORKSPACE_NAV(동일한 정보 구조)를 공유하지만 표현 방식은 독립적이다.
export default function DesktopSidebar() {
  const t = useT()

  return (
    <nav className="workspace-sidebar" aria-label={t('shell.workspaceAria')}>
      {WORKSPACE_NAV.map((group) => (
        <div className="workspace-sidebar-group" key={group.group}>
          <span className="workspace-sidebar-group-label">{t(group.labelKey)}</span>
          {group.items.map(({ key, path, labelKey, Icon }) => (
            <NavLink
              key={key}
              to={path}
              className={({ isActive }) => `workspace-nav-item${isActive ? ' is-active' : ''}`}
            >
              <Icon size={16} />
              <span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}
