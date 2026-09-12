import type { LucideIcon } from 'lucide-react'
import './PageGuide.css'

export interface PageGuideItem {
  icon: LucideIcon
  title: string
  description: string
}

interface PageGuideProps {
  items: PageGuideItem[]
  ariaLabel: string
  numbered?: boolean
  className?: string
}

export default function PageGuide({ items, ariaLabel, numbered = false, className = '' }: PageGuideProps) {
  return (
    <section className={`app-page-guide${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
      {items.map(({ icon: Icon, title, description }, index) => (
        <article className="app-page-guide-card" key={title}>
          <span className="app-page-guide-icon"><Icon aria-hidden="true" /></span>
          {numbered && <span className="app-page-guide-number">{String(index + 1).padStart(2, '0')}</span>}
          <strong>{title}</strong>
          <p>{description}</p>
        </article>
      ))}
    </section>
  )
}
