import { useEffect, useRef, useState } from 'react'
import { Languages } from 'lucide-react'
import { LANGUAGES, useLanguage } from '@/shared/i18n'

interface Props {
  className?: string
}

// 헤더에 붙는 언어 전환 드롭다운. 선택값은 LanguageProvider가 localStorage에 영속화한다.
export function LanguageSwitcher({ className }: Props) {
  const { language, setLanguage, t } = useLanguage()
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

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

  return (
    <div ref={rootRef} className={className} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('shell.language')}
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        <Languages size={14} />
        <span className="lang-switcher-label">{current.label}</span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 20,
            minWidth: 140,
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            padding: 6,
          }}
        >
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              role="menuitem"
              onClick={() => {
                setLanguage(code)
                setOpen(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                background: code === language ? 'var(--bg-additive)' : 'transparent',
                color: 'var(--text-primary, inherit)',
                fontWeight: code === language ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-additive)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = code === language ? 'var(--bg-additive)' : 'transparent'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
