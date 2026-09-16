import { useState, useRef, useEffect, type ReactNode } from 'react'
import { History } from 'lucide-react'
import { useT } from '@/shared/i18n'

interface Props<T> {
  items: T[]
  renderItem: (item: T) => ReactNode
  onSelect: (item: T) => void
  triggerClassName?: string
  label?: string
}

// 헤더에 붙는 아이콘 버튼 → 클릭 시 최근 기록을 드롭다운으로 펼침.
// 도구를 열자마자 기록이 결과 영역을 채우는 대신, 필요할 때만 펼쳐보도록 함.
export function HistoryDropdown<T>({ items, renderItem, onSelect, triggerClassName, label }: Props<T>) {
  const t = useT()
  const resolvedLabel = label ?? t('common.recentHistory')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  if (items.length === 0) return null

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={resolvedLabel}
        aria-expanded={open}
        className={triggerClassName}
        style={
          triggerClassName
            ? undefined
            : {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                flexShrink: 0,
              }
        }
      >
        <History size={15} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 20,
            width: 280,
            maxHeight: 320,
            overflowY: 'auto',
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            padding: 6,
          }}
        >
          <div
            style={{
              padding: '6px 8px 8px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-disabled)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {resolvedLabel}
          </div>
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect(item)
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-additive)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
