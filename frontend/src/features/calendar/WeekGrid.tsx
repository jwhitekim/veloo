import { useDndMonitor, useDroppable, useDraggable } from '@dnd-kit/core'
import type { Todo } from '@/shared/types'
import { useT } from '@/shared/i18n'
import { priorityAccent } from '@/features/todos/priority'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const SLOT_H = 32
function isoToLocal(iso: string) {
  return new Date(iso)
}
function cellId(day: number, hour: number) {
  return `cell-${day}-${hour}`
}

function EventBlock({ todo, dayIndex }: { todo: Todo; dayIndex: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `block-${todo.id}`,
    data: { type: 'block', todo, dayIndex },
  })
  if (!todo.start_time) return null
  const start = isoToLocal(todo.start_time)
  const end = todo.end_time ? isoToLocal(todo.end_time) : new Date(start.getTime() + 3600000)
  const startH = start.getHours() + start.getMinutes() / 60
  const endH = end.getHours() + end.getMinutes() / 60
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute',
        top: (startH - 6) * SLOT_H,
        height: Math.max((endH - startH) * SLOT_H, 20),
        left: 2,
        right: 2,
        background: priorityAccent[todo.priority] ?? 'var(--accent)',
        color: 'var(--selected-text)',
        borderRadius: 4,
        fontSize: 10,
        padding: '2px 4px',
        overflow: 'hidden',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        zIndex: 1,
        lineHeight: 1.3,
        userSelect: 'none',
      }}
      title={todo.name}
    >
      {todo.name}
    </div>
  )
}
function DroppableCell({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        height: SLOT_H,
        borderBottom: '1px solid var(--border-subtle)',
        background: isOver ? 'color-mix(in srgb, var(--bg-additive) 60%, transparent)' : undefined,
        position: 'relative',
      }}
    />
  )
}

interface WeekGridProps {
  weekStart: Date
  events: Todo[]
  durationHours: number
  visibleDayIndexes?: number[]
  onPlace: (id: number, start: string, end: string) => void
  onMove: (id: number, start: string, end: string) => void
  onUnschedule: (id: number) => void
}
export default function WeekGrid({
  weekStart,
  events,
  durationHours,
  visibleDayIndexes,
  onPlace,
  onMove,
  onUnschedule,
}: WeekGridProps) {
  const t = useT()
  const days = DAY_KEYS.map((key) => t(`calendar.days.${key}`))
  const dayIndexes = visibleDayIndexes ?? Array.from({ length: 7 }, (_, i) => i)
  useDndMonitor({
    onDragEnd({ over, active }) {
      if (!over) return
      const overId = String(over.id)
      const data = active.data.current
      if (overId === 'unscheduled-drop' && data?.type === 'block') {
        onUnschedule(data.todo.id)
        return
      }
      if (!overId.startsWith('cell-')) return
      const [, dayStr, hourStr] = overId.split('-')
      const date = new Date(weekStart)
      date.setDate(date.getDate() + Number(dayStr))
      date.setHours(Number(hourStr), 0, 0, 0)
      const end = new Date(date.getTime() + durationHours * 3600000)
      const startIso = date.toISOString()
      const endIso = end.toISOString()
      if (data?.type === 'unscheduled') onPlace(data.todo.id, startIso, endIso)
      else if (data?.type === 'block') onMove(data.todo.id, startIso, endIso)
    },
  })
  const columns = dayIndexes.map((dayIndex) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + dayIndex)
    return { date, dayIndex }
  })
  return (
    <div className={`cal-time-grid${visibleDayIndexes ? ' is-single-day' : ''}`}>
      <div style={{ width: 44, flexShrink: 0 }}>
        <div style={{ height: 36 }} />
        {HOURS.map((hour) => (
          <div
            key={hour}
            style={{
              height: SLOT_H,
              fontSize: 9,
              color: 'var(--text-disabled)',
              paddingTop: 2,
              paddingRight: 4,
              textAlign: 'right',
            }}
          >
            {String(hour).padStart(2, '0')}:00
          </div>
        ))}
      </div>
      {columns.map(({ date, dayIndex }) => {
        const dayEvents = events.filter(
          (event) => event.start_time && isoToLocal(event.start_time).toDateString() === date.toDateString(),
        )
        const today = date.toDateString() === new Date().toDateString()
        return (
          <div
            key={dayIndex}
            style={{
              flex: 1,
              minWidth: visibleDayIndexes ? 0 : 92,
              borderLeft: '1px solid var(--border-subtle)',
              background: today ? 'color-mix(in srgb, var(--accent-soft) 34%, transparent)' : undefined,
            }}
          >
            <div
              style={{
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 650,
                color: today ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
                background: today ? 'var(--accent-soft)' : 'var(--bg-base)',
              }}
            >
              {days[dayIndex]} {date.getDate()}
            </div>
            <div style={{ position: 'relative' }}>
              {HOURS.map((hour) => (
                <DroppableCell key={hour} id={cellId(dayIndex, hour)} />
              ))}
              {dayEvents.map((event) => (
                <EventBlock key={event.id} todo={event} dayIndex={dayIndex} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
