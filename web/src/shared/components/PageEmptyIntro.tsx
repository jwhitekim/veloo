import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import './PageEmptyIntro.css'

interface PageEmptyIntroProps {
  icon: LucideIcon
  title: string
  description: string
  actions?: ReactNode
}

export default function PageEmptyIntro({ icon: Icon, title, description, actions }: PageEmptyIntroProps) {
  return (
    <div className="app-page-empty-intro">
      <span className="app-page-empty-icon">
        <Icon aria-hidden="true" />
      </span>
      <div className="app-page-empty-copy">
        <h2>{title}</h2>
        <p>{description}</p>
        {actions && <div className="app-page-empty-actions">{actions}</div>}
      </div>
    </div>
  )
}
