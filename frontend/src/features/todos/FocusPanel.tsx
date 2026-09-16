import { useState } from 'react'
import { Plus, RefreshCw, Edit2, Trash2 } from 'lucide-react'
import type { Todo, Step, Priority } from '@/shared/types'
import { useT } from '@/shared/i18n'
import { priorityStyle, priorityLabels } from './priority'

interface Props {
  todo: Todo | null
  todos: Todo[]
  onUpdate: (id: number, data: Partial<Todo>) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onToggleStep: (stepId: number) => void
  onAddStep: (todoId: number, text: string, orderIndex?: number) => Promise<void>
  onDeleteStep: (stepId: number) => Promise<void>
  onGenerateSteps: (todo: Todo) => Promise<{ steps: string[] }>
  generatingSteps: boolean
  onBack?: () => void
}

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="text-[length:var(--fs-meta)] [font-weight:var(--fw-semibold)] text-gray-400 mb-2 uppercase tracking-wider flex items-center justify-between">
      <span>{label}</span>
      {action}
    </div>
  )
}

function StepSkeleton() {
  return (
    <div className="space-y-2 py-1">
      {[80, 65, 72].map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200 animate-pulse flex-shrink-0" />
          <div className="h-3 rounded animate-pulse bg-gray-200" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  )
}

export default function FocusPanel({
  todo,
  onUpdate,
  onDelete,
  onToggleStep,
  onAddStep,
  onDeleteStep,
  onGenerateSteps,
  generatingSteps,
  onBack,
}: Props) {
  const t = useT()
  const priorityLabel = priorityLabels(t)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMemo, setEditMemo] = useState('')
  const [editPriority, setEditPriority] = useState<Priority>('normal')
  const [editDeadline, setEditDeadline] = useState('')
  const [newStep, setNewStep] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [regeneratingSteps, setRegeneratingSteps] = useState(false)

  if (!todo) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--panel)' }}>
        <p className="text-[length:var(--fs-body)] text-gray-400">{t('todo.detail.selectTodo')}</p>
      </div>
    )
  }

  const startEdit = () => {
    setEditName(todo.name)
    setEditMemo(todo.memo)
    setEditPriority(todo.priority)
    setEditDeadline(todo.deadline)
    setEditMode(true)
  }

  const saveEdit = async () => {
    const memoChanged = editMemo !== todo.memo
    const hadSteps = todo.steps.length > 0
    await onUpdate(todo.id, {
      name: editName,
      memo: editMemo,
      priority: editPriority,
      deadline: editDeadline,
    })
    setEditMode(false)

    if (memoChanged && hadSteps) {
      setRegeneratingSteps(true)
      try {
        await Promise.all(todo.steps.map((s) => onDeleteStep(s.id)))
        const result = await onGenerateSteps({ ...todo, memo: editMemo })
        for (let i = 0; i < result.steps.length; i++) {
          await onAddStep(todo.id, result.steps[i], i)
        }
      } catch {
        /* 조용히 실패 */
      } finally {
        setRegeneratingSteps(false)
      }
    }
  }

  const handleAddStep = async () => {
    if (!newStep.trim()) return
    await onAddStep(todo.id, newStep.trim())
    setNewStep('')
  }

  const handleGenerateSteps = async () => {
    setRegeneratingSteps(true)
    try {
      await Promise.all(todo.steps.map((s) => onDeleteStep(s.id)))
      const result = await onGenerateSteps(todo)
      for (let i = 0; i < result.steps.length; i++) {
        await onAddStep(todo.id, result.steps[i], i)
      }
    } finally {
      setRegeneratingSteps(false)
    }
  }

  const steps = todo.steps ?? []
  const completedSteps = steps.filter((s) => s.done).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--panel)' }}>
      {onBack && (
        <div className="px-4 py-2 flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onBack}
            style={{
              fontSize: 'var(--fs-body)',
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {t('todo.detail.backToList')}
          </button>
        </div>
      )}
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        {editMode ? (
          <div className="space-y-3">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-[length:var(--fs-input)] [font-weight:var(--fw-semibold)] border-b pb-1 outline-none border-[var(--selected-bg)] bg-transparent text-gray-900"
            />
            <textarea
              value={editMemo}
              onChange={(e) => setEditMemo(e.target.value)}
              rows={10}
              placeholder={t('todo.detail.memoPlaceholder')}
              className="w-full border rounded-lg px-3 py-2 text-[length:var(--fs-input)] outline-none focus:border-[var(--selected-bg)] resize-none bg-transparent text-gray-700"
              style={{ borderColor: 'var(--input-border)' }}
            />
            <div className="flex gap-3">
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as Priority)}
                className="border rounded px-2 py-1 text-[length:var(--fs-input)] outline-none bg-transparent text-gray-700"
                style={{ borderColor: 'var(--input-border)' }}
              >
                <option value="urgent">{t('todo.priority.urgent')}</option>
                <option value="mid">{t('todo.priority.mid')}</option>
                <option value="normal">{t('todo.priority.normal')}</option>
              </select>
              <input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="border rounded px-2 py-1 text-[length:var(--fs-input)] outline-none flex-1 bg-transparent text-gray-700"
                style={{ borderColor: 'var(--input-border)' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="px-3 py-1.5 text-[length:var(--fs-small)] bg-[var(--selected-bg)] text-[var(--selected-text)] rounded-lg"
              >
                {t('common.save')}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-1.5 text-[length:var(--fs-small)] text-gray-500 hover:bg-black/5 rounded-lg"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[length:var(--fs-caption)] px-1.5 py-0.5 rounded [font-weight:var(--fw-medium)]"
                  style={priorityStyle[todo.priority]}
                >
                  {priorityLabel[todo.priority]}
                </span>
                {todo.deadline && <span className="text-[length:var(--fs-meta)] text-gray-400">{todo.deadline}</span>}
                {steps.length > 0 && (
                  <span className="text-[length:var(--fs-meta)] text-gray-400">
                    {t('todo.detail.stepsCompleted', { done: completedSteps, total: steps.length })}
                  </span>
                )}
              </div>
              <h2 className="text-[length:var(--fs-title)] [font-weight:var(--fw-semibold)] leading-snug text-gray-900">
                {todo.name}
              </h2>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={startEdit}
                className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-black/5 rounded-lg transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-gray-600 hover:text-[var(--c-error)] hover:bg-[var(--c-error-dim)] rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Memo */}
        {todo.memo ? (
          <div>
            <SectionHeader label={t('todo.detail.memoContext')} />
            <p
              className="text-[length:var(--fs-body)] text-gray-700 leading-relaxed rounded-lg px-3 py-2.5"
              style={{ background: 'var(--list)', whiteSpace: 'pre-wrap' }}
            >
              {todo.memo}
            </p>
          </div>
        ) : null}

        {/* Steps */}
        <div style={{ opacity: regeneratingSteps ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          <SectionHeader
            label={t('todo.detail.aiSteps')}
            action={
              regeneratingSteps ? (
                <span className="text-[length:var(--fs-caption)] text-gray-500 flex items-center gap-1">
                  <RefreshCw size={10} className="animate-spin" />
                  {t('todo.detail.regenerating')}
                </span>
              ) : (
                <button
                  onClick={handleGenerateSteps}
                  disabled={generatingSteps || regeneratingSteps}
                  className="flex items-center gap-1 text-[length:var(--fs-caption)] text-gray-500 hover:text-gray-800 disabled:opacity-50 [font-weight:var(--fw-regular)] normal-case"
                >
                  <RefreshCw size={10} className={generatingSteps ? 'animate-spin' : ''} />
                  {generatingSteps ? t('todo.detail.generating') : t('todo.detail.aiRegenerate')}
                </button>
              )
            }
          />

          {generatingSteps ? (
            <StepSkeleton />
          ) : (
            <div className="space-y-1">
              {steps.map((step) => (
                <StepRow
                  key={step.id}
                  step={step}
                  onToggle={() => onToggleStep(step.id)}
                  onDelete={() => onDeleteStep(step.id)}
                />
              ))}
            </div>
          )}

          {!generatingSteps && (
            <div className="flex gap-2 mt-2">
              <input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
                placeholder={t('todo.detail.addStepPlaceholder')}
                className="flex-1 text-[length:var(--fs-input)] text-gray-500 px-2 py-1.5 border-b outline-none focus:border-[var(--selected-bg)] bg-transparent transition-colors"
                style={{ borderColor: 'var(--border)' }}
              />
              <button onClick={handleAddStep} disabled={!newStep.trim()} className="text-gray-700 disabled:opacity-30">
                <Plus size={14} />
              </button>
            </div>
          )}

          {steps.length === 0 && !generatingSteps && (
            <button
              onClick={handleGenerateSteps}
              disabled={generatingSteps || regeneratingSteps}
              className="mt-2 w-full py-2 text-[length:var(--fs-small)] text-gray-600 border border-dashed rounded-lg hover:bg-[var(--bg-additive)] transition-colors"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {t('todo.detail.autoGenerateSteps')}
            </button>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-[2px]">
          <div className="rounded-xl shadow-xl p-6 w-80" style={{ background: 'var(--panel)' }}>
            <p className="text-[length:var(--fs-label)] text-gray-700 mb-4">{t('todo.detail.deleteConfirm')}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-[length:var(--fs-body)] text-gray-500 hover:bg-black/5 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  await onDelete(todo.id)
                  setShowDeleteConfirm(false)
                }}
                className="px-3 py-1.5 text-[length:var(--fs-body)] text-[var(--selected-text)] bg-[var(--c-error)] hover:opacity-90 rounded-lg"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StepRow({ step, onToggle, onDelete }: { step: Step; onToggle: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [animating, setAnimating] = useState(false)

  const handleToggle = () => {
    if (!step.done) setAnimating(true)
    onToggle()
  }

  return (
    <div
      className="flex items-center gap-2 py-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={handleToggle}
        style={{ transition: 'background 0.2s ease, border-color 0.2s ease' }}
        className={`flex-shrink-0 w-4 h-4 rounded border ${
          step.done
            ? 'bg-[var(--selected-bg)] border-[var(--selected-bg)]'
            : 'border-gray-300 hover:border-[var(--selected-bg)]'
        }`}
      >
        {step.done && (
          <svg viewBox="0 0 12 10" fill="none" className="w-full h-full p-0.5">
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
      <span
        className={`flex-1 text-[length:var(--fs-body)] transition-all duration-300 ${
          step.done ? 'line-through text-gray-400' : 'text-gray-700'
        }`}
      >
        {step.text}
      </span>
      {hovered && (
        <button onClick={onDelete} className="text-gray-300 hover:text-[var(--c-error)] transition-colors">
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}
