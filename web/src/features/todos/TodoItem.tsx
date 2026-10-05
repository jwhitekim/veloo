import { useState } from 'react'
import dayjs from 'dayjs'
import type { Todo } from '@/shared/types'
import { priorityStyle, priorityLabels } from './priority'
import { useT } from '@/shared/i18n'

interface Props {
  todo: Todo
  selected: boolean
  onSelect: () => void
  onToggle: () => void
}

export default function TodoItem({ todo, selected, onSelect, onToggle }: Props) {
  const t = useT()
  const priorityLabel = priorityLabels(t)
  const [animating, setAnimating] = useState(false)

  const completedSteps = todo.steps.filter((s) => s.done).length
  const totalSteps = todo.steps.length

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!todo.done) setAnimating(true)
    onToggle()
  }

  const selectItem = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
  }

  const deadline = todo.deadline
    ? /^\d{4}-\d{2}-\d{2}$/.test(todo.deadline)
      ? dayjs(todo.deadline).format('M/D')
      : todo.deadline
    : null

  return (
    <article onClick={onSelect} className={`todo-item${selected ? ' is-selected' : ''}${todo.done ? ' is-done' : ''}`}>
      <button onClick={handleToggle} className="todo-item-check" aria-label={todo.name}>
        {todo.done && (
          <svg viewBox="0 0 12 10" fill="none">
            <path
              className={animating ? 'check-path' : ''}
              d="M1 5l3.5 3.5L11 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="todo-item-main">
        <button
          type="button"
          className="todo-item-select"
          onClick={selectItem}
          aria-current={selected ? 'true' : undefined}
        >
          <p className="todo-item-title">{todo.name}</p>
          {(deadline || totalSteps > 0) && (
            <span className="todo-item-meta">
              {deadline && <span>{deadline}</span>}
              {totalSteps > 0 && (
                <span>{t('todo.detail.stepsCompleted', { done: completedSteps, total: totalSteps })}</span>
              )}
            </span>
          )}
        </button>
        {todo.memo && <p className="todo-item-memo">{todo.memo}</p>}
      </div>

      <div className="todo-item-side">
        <span className="todo-item-priority" style={priorityStyle[todo.priority]}>
          {priorityLabel[todo.priority]}
        </span>
      </div>
    </article>
  )
}
