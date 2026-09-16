import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import type { Priority } from '@/shared/types'
import { useT } from '@/shared/i18n'

interface Props {
  onClose: () => void
  onSave: (data: { name: string; memo: string; priority: Priority; deadline: string }) => Promise<void>
}

export default function AddTodoModal({ onClose, onSave }: Props) {
  const t = useT()
  const priorities: { value: Priority; label: string }[] = [
    { value: 'urgent', label: t('todo.priority.urgent') },
    { value: 'mid', label: t('todo.priority.mid') },
    { value: 'normal', label: t('todo.priority.normal') },
  ]
  const [name, setName] = useState('')
  const [memo, setMemo] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), memo, priority, deadline })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          width: 'min(480px, calc(100vw - 32px))',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-[length:var(--fs-label)] [font-weight:var(--fw-semibold)] text-gray-800">
            {t('todo.modal.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-5 space-y-4">
          {/* Title */}
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder={t('todo.modal.namePlaceholder')}
            className="w-full text-[length:var(--fs-input)] [font-weight:var(--fw-medium)] placeholder:text-gray-300 bg-transparent outline-none text-gray-900 border-b pb-2 transition-colors focus:border-[var(--selected-bg)]"
            style={{ borderColor: 'var(--border)' }}
          />

          {/* Memo */}
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={t('todo.modal.memoPlaceholder')}
            rows={3}
            className="w-full text-[length:var(--fs-input)] placeholder:text-gray-300 bg-transparent outline-none resize-none text-gray-700 rounded-lg px-3 py-2.5 transition-colors"
            style={{ background: 'var(--list)' }}
          />

          {/* Priority pills */}
          <div>
            <div className="text-[length:var(--fs-meta)] text-gray-400 mb-2">{t('todo.modal.priorityLabel')}</div>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className="flex-1 py-1.5 rounded-lg text-[length:var(--fs-small)] [font-weight:var(--fw-medium)] border transition-colors"
                  style={
                    priority === p.value
                      ? {
                          background: 'var(--selected-bg)',
                          borderColor: 'var(--selected-bg)',
                          color: 'var(--selected-text)',
                        }
                      : {
                          background: 'transparent',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <div className="text-[length:var(--fs-meta)] text-gray-400 mb-2">{t('todo.modal.deadlineLabel')}</div>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full text-[length:var(--fs-input)] rounded-lg px-3 py-2 outline-none border bg-transparent text-gray-700 focus:border-[var(--selected-bg)] transition-colors"
              style={{ borderColor: 'var(--input-border)' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: 'var(--border)', background: 'var(--list)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-[length:var(--fs-body)] text-gray-500 hover:bg-black/5 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-[length:var(--fs-body)] bg-[var(--selected-bg)] text-[var(--selected-text)] hover:opacity-90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <Sparkles size={13} />
                {t('todo.modal.save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
