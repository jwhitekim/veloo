import { useState, useRef, useEffect, useCallback } from 'react'
import { BookOpenText, Braces, Code2, Columns3, Loader2, Search, X } from 'lucide-react'
import { SessionExpiredMessage } from '@/shared/components/SessionExpiredMessage'
import { HistoryDropdown } from '@/shared/components/HistoryDropdown'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import PageHeader from '@/shared/components/PageHeader'
import PageGuide from '@/shared/components/PageGuide'
import PageEmptyIntro from '@/shared/components/PageEmptyIntro'
import { useT } from '@/shared/i18n'
import * as api from './api'
import type { ContextorResult, ContextorHistoryItem } from './api'
import './Contextor.css'

const MAX_CHARS = 60

export default function Contextor() {
  const t = useT()
  const isMobile = useIsMobile()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<ContextorResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)
  const [history, setHistory] = useState<ContextorHistoryItem[]>([])

  const abortRef = useRef<AbortController | null>(null)
  const suggestions = ['ablation', 'interleave', 'embedding']

  const doLookup = useCallback(async (text: string) => {
    const word = text.trim()
    if (!word) return
    abortRef.current?.abort()
    setLoading(true)
    setResult(null)
    setError('')
    setSessionExpired(false)
    try {
      const data = await api.lookup(word)
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    api.getContextorHistory().then(setHistory)
  }, [])

  const handleClear = () => {
    setQuery('')
    setResult(null)
    setError('')
    setSessionExpired(false)
    setLoading(false)
  }

  return (
    <div className="contextor-root">
      <div className="app-page-intro-shell app-page-intro-shell--reading">
        <PageHeader
          kicker="Model Lab"
          icon={<Braces />}
          title={t('contextor.heroTitle')}
          description={t('contextor.heroDescription')}
          badge={<><Braces size={14} /> {t('contextor.recentLookups', { count: history.length })}</>}
        />
      </div>
      <main className="contextor-shell">
        <div className="contextor-searchbar app-search-bar">
          <Search size={16} className="contextor-search-icon" />
          <input
            className="contextor-input"
            value={query}
            onChange={e => setQuery(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={e => { if (e.key === 'Enter') doLookup(query) }}
            placeholder={t('contextor.searchPlaceholder')}
            autoFocus={!isMobile}
          />
          {query && (
            <button className="contextor-icon-btn" onClick={handleClear} title={t('common.clear')} type="button">
              <X size={15} />
            </button>
          )}
          <HistoryDropdown
            items={history}
            label={t('contextor.recentLookupsLabel')}
            triggerClassName="contextor-icon-btn"
            onSelect={item => { setQuery(item.query); setResult(item.result) }}
            renderItem={item => (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.query}</div>
                <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 3 }}>{item.result.hasMlUsage ? t('contextor.contextsCount', { count: item.result.cases.length }) : t('contextor.generalUsage')}</div>
              </>
            )}
          />
          <button
            className="contextor-lookup-btn"
            onClick={() => doLookup(query)}
            disabled={!query.trim() || loading}
            type="button"
          >
            {t('contextor.lookupButton')}
          </button>
        </div>

        <div className="contextor-body">
          {sessionExpired && <SessionExpiredMessage redirectTo="/contextor" />}

          {!sessionExpired && loading && (
            <div className="contextor-status">
              <Loader2 size={16} className="contextor-spin" />
              <span>{t('contextor.analyzing')}</span>
            </div>
          )}

          {!sessionExpired && error && (
            <div className="contextor-error">{error}</div>
          )}

          {!sessionExpired && !loading && result && (
            <div className="contextor-result">
              {!result.hasMlUsage ? (
                <p className="contextor-note">{result.note || t('contextor.noMlUsage')}</p>
              ) : (
                <div className="contextor-cases">
                  {result.cases.map((c, i) => (
                    <article className="contextor-card" key={i}>
                      <div className="contextor-card-head">
                        <span className="contextor-card-label">{c.label}</span>
                        <span className="contextor-card-term">{c.term}</span>
                      </div>
                      <p className="contextor-card-meaning">{c.meaning}</p>
                      <div className="contextor-card-example">
                        <p className="contextor-example-en">{c.exampleEn}</p>
                        <p className="contextor-example-ko">{c.exampleKo}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {!sessionExpired && !loading && !error && !result && (
            <div className="contextor-empty">
              <PageEmptyIntro
                icon={Braces}
                title={t('contextor.emptyTitle')}
                description={t('contextor.emptyDescription')}
                actions={
                  <div className="contextor-suggestions" aria-label={t('contextor.suggestionsAria')}>
                    <span className="contextor-suggestions-label">{t('contextor.suggestionsAria')}</span>
                    <div className="contextor-suggestion-list">
                      {suggestions.map(term => <button key={term} type="button" onClick={() => { setQuery(term); doLookup(term) }}>{term}</button>)}
                    </div>
                  </div>
                }
              />
              <PageGuide ariaLabel={t('contextor.emptyTitle')} items={[
                { icon: Code2, title: t('contextor.guide.implementationTitle'), description: t('contextor.guide.implementationDesc') },
                { icon: BookOpenText, title: t('contextor.guide.paperTitle'), description: t('contextor.guide.paperDesc') },
                { icon: Columns3, title: t('contextor.guide.comparisonTitle'), description: t('contextor.guide.comparisonDesc') },
              ]} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
