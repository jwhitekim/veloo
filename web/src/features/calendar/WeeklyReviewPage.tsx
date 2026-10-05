import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useT, useDateLocale } from '@/shared/i18n'
import * as api from '@/shared/api/client'
import type { WeeklyReview } from '@/shared/types'
import { priorityAccent, priorityLabels } from '@/features/todos/priority'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function WeeklyReview() {
  const t = useT()
  const dateLocale = useDateLocale()
  const PRIORITY_LABEL = priorityLabels(t)
  const fmtDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' })
  const navigate = useNavigate()
  const { username = '' } = useParams()
  const goToTasks = () => navigate(`/${username}/tasks`)
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [data, setData] = useState<WeeklyReview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api
      .getWeeklyReview(weekStart.toISOString())
      .then(setData)
      .catch(() => setError(t('weeklyReview.loadError')))
      .finally(() => setLoading(false))
  }, [weekStart, t])

  const prevWeek = () =>
    setWeekStart((ws) => {
      const d = new Date(ws)
      d.setDate(d.getDate() - 7)
      return d
    })
  const nextWeek = () =>
    setWeekStart((ws) => {
      const d = new Date(ws)
      d.setDate(d.getDate() + 7)
      return d
    })

  const statCard = (label: string, value: string | number) => (
    <div style={{ flex: 1, minWidth: 110, background: 'var(--bg-additive)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={prevWeek}
          style={{
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            width: 28,
            height: 28,
            cursor: 'pointer',
            fontSize: 16,
            color: 'var(--text-secondary)',
          }}
        >
          ‹
        </button>
        <span
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', minWidth: 180, textAlign: 'center' }}
        >
          {fmtDate(weekStart.toISOString())} – {fmtDate(new Date(weekStart.getTime() + 6 * 86400000).toISOString())}
        </span>
        <button
          onClick={nextWeek}
          style={{
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            width: 28,
            height: 28,
            cursor: 'pointer',
            fontSize: 16,
            color: 'var(--text-secondary)',
          }}
        >
          ›
        </button>
        <button
          onClick={goToTasks}
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            color: 'var(--text-secondary)',
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          {t('weeklyReview.todoListButton')}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {loading && <p style={{ fontSize: 13, color: 'var(--text-disabled)' }}>{t('weeklyReview.loading')}</p>}
        {error && <p style={{ fontSize: 13, color: 'var(--c-error)' }}>{error}</p>}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680 }}>
            {/* 통계 카드 */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {statCard(t('weeklyReview.stats.completed'), data.completed)}
              {statCard(t('weeklyReview.stats.created'), data.created)}
              {statCard(t('weeklyReview.stats.completionRate'), `${Math.round(data.completion_rate * 100)}%`)}
              {statCard(t('weeklyReview.stats.overdue'), data.overdue.length)}
            </div>

            {/* 우선순위별 분포 */}
            <div style={{ background: 'var(--bg-additive)', borderRadius: 10, padding: '16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
                {t('weeklyReview.priorityBreakdown')}
              </div>
              {(['urgent', 'mid', 'normal'] as const).map((p) => {
                const { done, todo } = data.by_priority[p] ?? { done: 0, todo: 0 }
                const total = done + todo
                const pct = total ? Math.round((done / total) * 100) : 0
                return (
                  <div key={p} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: priorityAccent[p], fontWeight: 600 }}>{PRIORITY_LABEL[p]}</span>
                      <span style={{ color: 'var(--text-disabled)' }}>
                        {done}/{total}
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: priorityAccent[p],
                          borderRadius: 3,
                          transition: 'width 0.4s',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 밀린 할일 목록 */}
            {data.overdue.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {t('weeklyReview.overdueList', { count: data.overdue.length })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {data.overdue.map((item) => (
                    <button
                      key={item.id}
                      onClick={goToTasks}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: 'var(--bg-additive)',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 13,
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: priorityAccent[item.priority],
                          flexShrink: 0,
                        }}
                      />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
