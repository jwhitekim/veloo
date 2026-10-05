import type { NavFilter, Todo } from '@/shared/types'
import dayjs from 'dayjs'
import { useT } from '@/shared/i18n'

interface Props {
  filter: NavFilter
  onFilter: (f: NavFilter) => void
  todos: Todo[]
}

export default function Sidebar({ filter, onFilter, todos }: Props) {
  const t = useT()
  const navItems: { label: string; key: NavFilter }[] = [
    { label: t('todo.filters.today'), key: 'today' },
    { label: t('todo.filters.week'), key: 'week' },
    { label: t('todo.filters.all'), key: 'all' },
    { label: t('todo.filters.memo'), key: 'memo' },
  ]
  const count = (key: NavFilter) => {
    if (key === 'today') {
      const today = dayjs().format('YYYY-MM-DD')
      return todos.filter((t) => dayjs(t.created_at).format('YYYY-MM-DD') === today || t.deadline === today).length
    }
    if (key === 'week') return todos.filter((t) => !t.done).length
    if (key === 'all') return todos.length
    if (key === 'memo') return todos.filter((t) => t.memo).length
    return 0
  }

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0"
      style={{ width: 'var(--sidebar-w)', borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}
    >
      <div style={{ padding: '20px 16px 12px' }} />

      <nav className="flex-1 px-2">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onFilter(item.key)}
            className={`sidebar-item${filter === item.key ? ' active' : ''}`}
          >
            <span>{item.label}</span>
            <span className="sidebar-count">{count(item.key)}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
