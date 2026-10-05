import type { LucideIcon } from 'lucide-react'
import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'
import './StatePanel.css'

interface StatePanelProps {
  kind: 'loading' | 'empty' | 'error'
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
  compact?: boolean
}

export default function StatePanel({ kind, title, description, icon, action, compact = false }: StatePanelProps) {
  const Icon = icon ?? (kind === 'loading' ? LoaderCircle : kind === 'error' ? AlertCircle : Inbox)
  return (
    <div
      className={`app-state-panel is-${kind}${compact ? ' is-compact' : ''}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <span className="app-state-icon">
        <Icon aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action && <div className="app-state-action">{action}</div>}
    </div>
  )
}
