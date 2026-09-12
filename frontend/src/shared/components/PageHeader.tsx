import type { ReactNode } from 'react'
import './PageHeader.css'

interface PageHeaderProps {
  kicker: string
  title: string
  description: string
  icon?: ReactNode
  badge?: ReactNode
  className?: string
}

export default function PageHeader({ kicker, title, description, icon, badge, className = '' }: PageHeaderProps) {
  return (
    <header className={`app-page-header${className ? ` ${className}` : ''}`}>
      <div className="app-page-header-main">
        {icon && <span className="app-page-header-icon" aria-hidden="true">{icon}</span>}
        <div className="app-page-header-copy">
          <span className="app-page-kicker">{kicker}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {badge && <div className="app-page-badge">{badge}</div>}
    </header>
  )
}
