import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import dayjs from 'dayjs'
import type { Todo, NavFilter, Priority } from '@/shared/types'
import TodoItem from './TodoItem'
import AddTodoModal from './AddTodoModal'
import { NAV_FILTERS } from './navFilters'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useT } from '@/shared/i18n'

interface Props {
  todos: Todo[]
  filter: NavFilter
  onFilter: (f: NavFilter) => void
  selectedId: number | null
  onSelect: (id: number) => void
  onToggle: (id: number) => void
  onAdd: (data: { name: string; memo: string; priority: Priority; deadline: string }) => Promise<void>
}

export default function TodoList({ todos, filter, onFilter, selectedId, onSelect, onToggle, onAdd }: Props) {
  const t = useT()
  const filterTabs: { label: string; key: NavFilter }[] = NAV_FILTERS.map((key) => ({
    key,
    label: t(`todo.filters.${key}`),
  }))
  const [showModal, setShowModal] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const isMobile = useIsMobile()

  const active = todos.filter((todo) => !todo.done)
  const done = todos.filter((todo) => todo.done)
  const completionRate = todos.length ? Math.round((done.length / todos.length) * 100) : 0

  return (
    <section
      className={`todo-list-panel flex flex-col${isMobile ? '' : ' h-full'}`}
      style={{ width: '100%', background: 'var(--bg-base)' }}
    >
      <div className={`todo-list-header${isMobile ? ' is-mobile' : ''}`}>
        <div className="todo-list-title-row">
          <div>
            <span className="todo-list-kicker">{t('todo.todayPlan')}</span>
            <strong>{t('todo.researchFlow')}</strong>
          </div>
          {isMobile ? (
            <button onClick={() => setShowModal(true)} type="button" className="todo-list-add-mobile">
              <Plus size={14} />
              {t('todo.addButton')}
            </button>
          ) : (
            <div className="todo-list-header-actions">
              <button type="button" className="todo-list-add-compact" onClick={() => setShowModal(true)}>
                <Plus aria-hidden="true" />
                {t('todo.addButton')}
              </button>
              <label className="todo-list-filter-select">
                <select
                  value={filter}
                  onChange={(event) => onFilter(event.target.value as NavFilter)}
                  aria-label={t('todo.filterAriaLabel')}
                >
                  {filterTabs.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden="true" />
              </label>
              <span className="todo-list-date">{dayjs().locale('en').format('MMM DD').toUpperCase()}</span>
            </div>
          )}
        </div>

        {isMobile && (
          <div className="todo-list-progress-row">
            <div className="todo-list-progress">
              <span style={{ width: `${completionRate}%` }} />
            </div>
            <small>
              {done.length} / {todos.length}
            </small>
          </div>
        )}

        {isMobile && (
          <div role="tablist" aria-label={t('todo.filterAriaLabel')} className="todo-filter-tabs">
            {filterTabs.map((item) => {
              const isActive = filter === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onFilter(item.key)}
                  className={isActive ? 'is-active' : ''}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className={`todo-list-scroll${isMobile ? '' : ' flex-1 overflow-y-auto'}`}>
        {active.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            selected={todo.id === selectedId}
            onSelect={() => onSelect(todo.id)}
            onToggle={() => onToggle(todo.id)}
          />
        ))}

        {done.length > 0 && (
          <>
            <button
              type="button"
              className="todo-completed-toggle"
              aria-expanded={showCompleted}
              onClick={() => setShowCompleted((open) => !open)}
            >
              <span>{t('todo.completedToggle')}</span>
              <span className="todo-completed-count">{done.length}</span>
              <ChevronDown className={showCompleted ? 'is-open' : ''} size={14} />
            </button>
            {showCompleted &&
              done.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  selected={todo.id === selectedId}
                  onSelect={() => onSelect(todo.id)}
                  onToggle={() => onToggle(todo.id)}
                />
              ))}
          </>
        )}

        {todos.length === 0 && (
          <div className="todo-list-empty">
            <span className="todo-list-empty-mark">
              <Plus size={18} />
            </span>
            <strong>{t('todo.noTodos')}</strong>
            <p>{t('todo.overview.emptyActive')}</p>
            <button type="button" onClick={() => setShowModal(true)}>
              {t('todo.addButton')}
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <AddTodoModal
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            await onAdd(data)
          }}
        />
      )}
    </section>
  )
}
