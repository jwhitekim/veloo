import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowRight, Check, Copy, History as HistoryIcon, Languages, Loader2, Radio, ScanText, X } from 'lucide-react'
import { SessionExpiredMessage } from '@/shared/components/SessionExpiredMessage'
import { HistoryDropdown } from '@/shared/components/HistoryDropdown'
import PageHeader from '@/shared/components/PageHeader'
import PageGuide from '@/shared/components/PageGuide'
import { useT } from '@/shared/i18n'
import * as api from './api'
import type { TranslationHistoryItem } from './api'
import './Translator.css'

const MAX_CHARS = 5000

export default function Translator() {
  const t = useT()
  const [source, setSource] = useState('')
  const [txHistory, setTxHistory] = useState<TranslationHistoryItem[]>([])
  const [streamedText, setStreamedText] = useState('')
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)
  const [copied, setCopied] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const abortRef = useRef<AbortController | null>(null)

  const doTranslate = useCallback(async (text: string) => {
    if (!text.trim()) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setTranslating(true)
    setStreamedText('')
    setError('')
    setSessionExpired(false)
    try {
      const res = await fetch('/translate/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
      if (res.status === 401) {
        setSessionExpired(true)
        setTranslating(false)
        return
      }
      if (!res.ok) throw new Error(t('translator.errors.translateFailed', { status: res.status }))
      if (!res.body) throw new Error(t('translator.errors.noStreaming'))
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setStreamedText(prev => prev + decoder.decode(value, { stream: true }))
      }
      setTranslating(false)
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return
      setError((e as Error).message)
      setTranslating(false)
    }
  }, [t])

  const handleCopy = async () => {
    if (!streamedText) return
    await navigator.clipboard.writeText(streamedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleClear = () => {
    abortRef.current?.abort()
    setSource('')
    setStreamedText('')
    setError('')
    setSessionExpired(false)
    setTranslating(false)
  }

  useEffect(() => {
    api.getTranslationHistory().then(setTxHistory)
    return () => { abortRef.current?.abort() }
  }, [])

  const handleInput = (val: string) => {
    const clamped = val.slice(0, MAX_CHARS)
    setSource(clamped)
    clearTimeout(timerRef.current)
    if (!clamped.trim()) {
      abortRef.current?.abort()
      setStreamedText('')
      setError('')
      setSessionExpired(false)
      setTranslating(false)
      return
    }
    timerRef.current = setTimeout(() => doTranslate(clamped.trim()), 300)
  }

  return (
    <div className="translator-root">
      <div className="app-page-intro-shell app-page-intro-shell--workspace">
        <PageHeader
          kicker="Translation workspace"
          icon={<Languages />}
          title={t('translator.heroTitle')}
          description={t('translator.heroDescription')}
          badge={<><Languages size={14} /> {t('translator.quickStart')}</>}
        />
      </div>
      <main className="translator-shell">
        <section className="translator-workspace">
          <div className="translator-panel translator-panel--source">
            <div className="translator-panel-header">
              <div>
                <span className="translator-label">{t('translator.sourceLabel')}</span>
                <span className="translator-language">{t('translator.sourceLanguage')}</span>
              </div>
              {source && (
                <button className="translator-icon-btn" onClick={handleClear} title={t('common.clear')} type="button">
                  <X size={15} />
                </button>
              )}
            </div>

            <textarea
              className="translator-textarea"
              value={source}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault()
                  clearTimeout(timerRef.current)
                  doTranslate(source.trim())
                }
              }}
              placeholder={t('translator.textPlaceholder')}
            />

            <div className="translator-panel-footer">
              <span>{source.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>
              <span>{t('translator.autoTranslate')}</span>
            </div>
          </div>

          <div className="translator-flow" aria-hidden="true"><ArrowRight /></div>

          <div className="translator-panel translator-panel--result">
            <div className="translator-panel-header">
              <div>
                <span className="translator-label">{t('translator.resultLabel')}</span>
                <span className="translator-language">{t('translator.resultLanguage')}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <HistoryDropdown
                  items={txHistory}
                  label={t('translator.recentTranslation')}
                  triggerClassName="translator-icon-btn"
                  onSelect={item => { setSource(item.source_text); setStreamedText(item.translated_text) }}
                  renderItem={item => (
                    <>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source_text}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.translated_text}</div>
                    </>
                  )}
                />
                <button
                  className="translator-icon-btn"
                  onClick={handleCopy}
                  disabled={!streamedText || translating}
                  title={copied ? t('translator.copied') : t('translator.copy')}
                  type="button"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <div className="translator-output">
              {sessionExpired && <SessionExpiredMessage redirectTo="/translate" />}

              {!sessionExpired && translating && !streamedText && (
                <div className="translator-status">
                  <Loader2 size={15} className="translator-spin" />
                  <span>{t('translator.translating')}</span>
                </div>
              )}

              {!sessionExpired && error && (
                <div className="translator-error">{error}</div>
              )}

              {!sessionExpired && streamedText && (
                <div className="translator-result-text">
                  {streamedText}
                  {translating && <span className="translator-caret" />}
                </div>
              )}

              {!sessionExpired && !translating && !error && !streamedText && (
                <div className="translator-empty-output">
                  <span><Languages aria-hidden="true" /></span>
                  <strong>{t('translator.resultEmptyTitle')}</strong>
                  <p>{t('translator.resultEmptyDesc')}</p>
                </div>
              )}
            </div>
          </div>
        </section>
        {!source && !streamedText && !error && (
          <PageGuide ariaLabel={t('translator.quickStart')} items={[
            { icon: ScanText, title: t('translator.feature.autoDetectTitle'), description: t('translator.feature.autoDetectDesc') },
            { icon: Radio, title: t('translator.feature.streamingTitle'), description: t('translator.feature.streamingDesc') },
            { icon: HistoryIcon, title: t('translator.feature.historyTitle'), description: t('translator.feature.historyDesc') },
          ]} />
        )}
      </main>
    </div>
  )
}
