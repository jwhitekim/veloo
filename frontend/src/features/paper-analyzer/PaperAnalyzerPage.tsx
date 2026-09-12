import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, BrainCircuit, FileSearch, FileText, Search, X } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { HistoryDropdown } from '@/shared/components/HistoryDropdown'
import PageHeader from '@/shared/components/PageHeader'
import PageGuide from '@/shared/components/PageGuide'
import PageEmptyIntro from '@/shared/components/PageEmptyIntro'
import { useT, useDateLocale } from '@/shared/i18n'
import * as api from './api'
import type { Candidate, PaperResult, PaperHistoryItem } from './api'
import './PaperAnalyzer.css'

type MainState =
  | { kind: 'idle' }
  | { kind: 'loading'; msg: string }
  | { kind: 'candidates'; items: Candidate[] }
  | { kind: 'result'; data: PaperResult }
  | { kind: 'error'; msg: string }

// ── 색상 토큰 ──────────────────────────────────────────────────────
const C = {
  accent:     'var(--text-primary)',
  accentDim:  'var(--bg-additive)',
  accentText: 'var(--text-primary)',
  main:       'var(--bg-canvas)',
  card:       'var(--bg-additive)',
  border:     'var(--border-subtle)',
  borderMid:  'var(--border-subtle)',
  text:       'var(--text-primary)',
  textSub:    'var(--text-secondary)',
  textMuted:  'var(--text-disabled)',
  headerBg:   'var(--bg-base)',
}

export default function PaperAnalyzer() {
  const t = useT()
  const dateLocale = useDateLocale()
  const isMobile = useIsMobile()
  const [query, setQuery] = useState('')
  const [state, setState] = useState<MainState>({ kind: 'idle' })
  const [sidebarData, setSidebarData] = useState<PaperResult | null>(null)
  const [history, setHistory] = useState<PaperHistoryItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getHistory().then(setHistory)
  }, [])

  const doSearch = async () => {
    const q = query.trim()
    if (!q) return
    setState({ kind: 'loading', msg: t('paper.searching') })
    setSidebarData(null)
    try {
      const data = await api.search(q)
      if (data.type === 'url') {
        await doAnalyzeUrl(data.query!)
      } else if (data.type === 'unsupported_url') {
        setState({ kind: 'error', msg: t('paper.unsupportedUrl') })
      } else if (data.type === 'candidates' && data.data) {
        setState({ kind: 'candidates', items: data.data })
      } else {
        setState({ kind: 'error', msg: (data as any).error || t('paper.unknownError') })
      }
    } catch (e) {
      setState({ kind: 'error', msg: (e as Error).message })
    }
  }

  const loadResult = (data: PaperResult) => {
    setSidebarData(data)
    setState({ kind: 'result', data })
    api.getHistory().then(setHistory)
  }

  const doAnalyzeById = async (paperId: string) => {
    setState({ kind: 'loading', msg: t('paper.analyzing') })
    try {
      const data = await api.analyzeById(paperId)
      loadResult(data)
    } catch (e) {
      setState({ kind: 'error', msg: (e as Error).message })
    }
  }

  const doAnalyzeUrl = async (url: string) => {
    setState({ kind: 'loading', msg: t('paper.analyzing') })
    try {
      const data = await api.analyzeByUrl(url)
      loadResult(data)
    } catch (e) {
      setState({ kind: 'error', msg: (e as Error).message })
    }
  }

  const searchBar = (
    <div className="paper-searchbar app-search-bar">
      <Search size={16} className="paper-search-icon" />
      <input
        ref={inputRef}
        className="paper-search-input"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') doSearch() }}
        placeholder={t('paper.searchPlaceholder')}
        autoFocus={!isMobile}
      />
      {query && (
        <button
          className="paper-search-icon-btn"
          onClick={() => {
            setQuery('')
            inputRef.current?.focus()
          }}
          title={t('common.clear')}
          aria-label={t('paper.clearQueryAria')}
          type="button"
        >
          <X size={15} />
        </button>
      )}
      <HistoryDropdown
        items={history}
        label={t('paper.recentSearch')}
        triggerClassName="paper-search-icon-btn"
        onSelect={item => {
          setQuery(item.title)
          setSidebarData(item.result)
          setState({ kind: 'result', data: item.result })
        }}
        renderItem={item => (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.4, wordBreak: 'keep-all' }}>{item.title}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{new Date(item.created_at).toLocaleDateString(dateLocale)}</div>
          </>
        )}
      />
      <button
        className="paper-analyze-btn"
        onClick={doSearch}
        disabled={!query.trim() || state.kind === 'loading'}
        type="button"
      >{t('paper.analyzeButton')}</button>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.main }}>
      <div className="app-page-intro-shell app-page-intro-shell--reading">
        <PageHeader
          kicker="Research workspace"
          icon={<FileSearch />}
          title={t('paper.heroTitle')}
          description={t('paper.heroDescription')}
        />
      </div>
      {/* 검색 툴바 */}
      <div className="paper-search-toolbar">
        {searchBar}
      </div>

      {/* Body */}
      {isMobile ? (
        <div className="paper-results paper-results--mobile">
          {sidebarData && (
            <aside className="paper-context-panel paper-context-panel--mobile">
              <SidebarContent data={sidebarData} />
            </aside>
          )}
          <main className="paper-main paper-main--mobile">
            {state.kind === 'idle' && <EmptyState />}
            {state.kind === 'loading' && <Loader msg={state.msg} />}
            {state.kind === 'error' && <ErrorBox msg={state.msg} />}
            {state.kind === 'candidates' && <CandidateList items={state.items} onSelect={doAnalyzeById} />}
            {state.kind === 'result' && <ResultView data={state.data} />}
          </main>
        </div>
      ) : (
        <div className="paper-results paper-results--desktop">
          <div className={`paper-results-rail${sidebarData ? ' paper-results-rail--split' : ''}`}>
            {/* Context panel — current paper metadata */}
            {sidebarData && (
              <aside className="paper-context-panel">
                <SidebarContent data={sidebarData} />
              </aside>
            )}

            {/* Primary content — Theory Analysis */}
            <main className="paper-main paper-main--desktop">
              {state.kind === 'idle' && <EmptyState />}
              {state.kind === 'loading' && <Loader msg={state.msg} />}
              {state.kind === 'error' && <ErrorBox msg={state.msg} />}
              {state.kind === 'candidates' && <CandidateList items={state.items} onSelect={doAnalyzeById} />}
              {state.kind === 'result' && <ResultView data={state.data} />}
            </main>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────
function EmptyState() {
  const t = useT()
  const workflow = [
    { Icon: FileSearch, title: t('paper.workflow.identifyTitle'), description: t('paper.workflow.identifyDesc') },
    { Icon: BrainCircuit, title: t('paper.workflow.analyzeTitle'), description: t('paper.workflow.analyzeDesc') },
    { Icon: BadgeCheck, title: t('paper.workflow.qualityTitle'), description: t('paper.workflow.qualityDesc') },
  ]
  return (
    <div className="paper-empty">
      <PageEmptyIntro icon={FileText} title={t('paper.emptyTitle')} description={t('paper.emptyDescription')} />
      <PageGuide ariaLabel={t('paper.workflowAria')} numbered items={workflow.map(({ Icon, title, description }) => ({ icon: Icon, title, description }))} />
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────
function SidebarContent({ data }: { data: PaperResult }) {
  const t = useT()
  const { basic, quality } = data
  const divider = `1px solid ${C.border}`

  return (
    <>
      <section>
        <SideLabel>📄 Paper</SideLabel>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.5, marginBottom: 18, wordBreak: 'keep-all' }}>{basic.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MetaRow k="Year"  v={String(basic.year || '—')} />
          <MetaRow k="Venue" v={basic.venue || '—'} />
          <MetaRow k="Cited" v={t('paper.sidebar.cited', { count: basic.citationCount ?? '—' })} />
        </div>
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: divider, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {basic.doi    && <a href={`https://doi.org/${basic.doi}`}            target="_blank" rel="noreferrer" style={linkStyle}>DOI ↗</a>}
          {basic.arxivId && <a href={`https://arxiv.org/abs/${basic.arxivId}`} target="_blank" rel="noreferrer" style={linkStyle}>arXiv ↗</a>}
          {!basic.doi && !basic.arxivId && <span style={{ color: C.textMuted, fontSize: 13 }}>{t('paper.sidebar.noOriginalLink')}</span>}
        </div>
      </section>
      <section style={{ marginTop: 28, paddingTop: 28, borderTop: divider }}>
        <SideLabel>📊 Journal Quality</SideLabel>
        <QualityBlock quality={quality} />
      </section>
    </>
  )
}

function SideLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: 14 }}>{children}</div>
}

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 13 }}>
      <span style={{ color: C.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0 }}>{k}</span>
      <span style={{ color: C.textSub, fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
    </div>
  )
}

const linkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
  background: C.accentDim, borderRadius: 6, fontSize: 12,
  fontWeight: 500, color: C.accentText, textDecoration: 'none',
}

function QualityBlock({ quality }: { quality: PaperResult['quality'] }) {
  const t = useT()
  if (!quality) return <span style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>{t('paper.sidebar.noData')}</span>
  if (!quality.quartile) return <span style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>{t('paper.sidebar.noQuartile')}<br /><strong style={{ color: C.textSub }}>{quality.matched_title}</strong></span>

  // Q1(최상위)→Q4로 갈수록 옅어지는 그레이스케일 등급 배지. Todo/Calendar의
  // 빨강·주황·초록 우선순위 색과는 다른 축(객관적 저널 등급이라 traffic-light가
  // 아니라 명도 단계가 더 맞음)이라 priorityAccent를 재사용하지 않고 별도 유지.
  const qKey = String(quality.quartile).trim().toLowerCase()
  const qColors: Record<string, string> = { q1: '#0f0f0f', q2: '#404040', q3: '#606060', q4: '#909090' }
  const bg = qColors[qKey] ?? 'var(--text-disabled)'
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 46, height: 46, borderRadius: 10, background: bg, fontWeight: 800, fontSize: 15, color: 'var(--selected-text)', flexShrink: 0 }}>{quality.quartile}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: C.text, lineHeight: 1.4 }}>{quality.matched_title || '—'}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>SJR {quality.sjr ? quality.sjr.replace(',', '.') : '—'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <MetaRow k="Type"    v={quality.type || '—'} />
        <MetaRow k="Country" v={quality.country || '—'} />
      </div>
    </>
  )
}

// ── Main: Candidates ───────────────────────────────────────────────
function CandidateList({ items, onSelect }: { items: Candidate[]; onSelect: (id: string) => void }) {
  const t = useT()
  return (
    <div style={{ marginBottom: 32, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', fontSize: 13, color: C.textSub, borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>
        {t('paper.candidates.header')}
      </div>
      {items.map(p => (
        <div key={p.paperId} onClick={() => onSelect(p.paperId)}
          style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = C.accentDim)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ fontWeight: 600, fontSize: 15, color: C.text, lineHeight: 1.4 }}>{p.title || t('paper.candidates.untitled')}</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
            {t('paper.candidates.meta', {
              year: p.year || '?',
              venue: p.venue || t('paper.candidates.unknownVenue'),
              count: p.citationCount ?? '?',
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main: Result ───────────────────────────────────────────────────
function ResultView({ data }: { data: PaperResult }) {
  const t = useT()
  const { analysis, authors, basic } = data
  const relClass = analysis.relevance === '높음' ? 'high' : analysis.relevance === '낮음' ? 'low' : 'mid'
  // high/low는 앱의 실제 accent green과 --c-error 토큰을 재사용 (기존엔 이 배지만을
  // 위한 별도의 Tailwind 계열 초록/빨강을 하드코딩하고 있어 브랜드 그린과 따로 놀았음).
  // mid(주황/경고)는 앱 전역에 대응 토큰이 아직 없어 그대로 둠.
  const relColors = {
    high: { bg: 'var(--accent-soft)',    color: 'var(--accent-hover)' },
    low:  { bg: 'var(--c-error-dim)',    color: 'var(--c-error)' },
    mid:  { bg: 'rgba(243,156,18,0.14)', color: '#fbbf24' },
  }
  const rel = relColors[relClass]

  return (
    <>
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{t('paper.result.theoryAnalysis')}</h2>
          <span style={{ fontSize: 11, color: C.textMuted }}>via Claude</span>
        </div>

        {analysis.keywords?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 24 }}>
            {analysis.keywords.map(k => (
              <span key={k} style={{ padding: '3px 11px', background: C.accentDim, color: C.accentText, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{k}</span>
            ))}
          </div>
        )}

        {analysis.relevance && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, background: rel.bg, color: rel.color }}>
            <span style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{t('paper.result.relevance', { value: analysis.relevance })}</span>
            <span>{analysis.relevance_reason}</span>
          </div>
        )}

        <AnalysisItem label={t('paper.result.problem')} short="" detail={analysis.problem} />
        <AnalysisItem label={t('paper.result.method')} short="" detail={analysis.method} />
        <AnalysisItem label={t('paper.result.conclusion')} short="" detail={analysis.conclusion} />
      </section>

      <section style={{ marginTop: 52, paddingTop: 52, borderTop: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 24 }}>{t('paper.result.authorInfo')}</h2>
        {authors?.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 28px' }}>
            {authors.map(a => <AuthorCard key={a.authorId || a.name} author={a} currentTitle={basic.title} />)}
          </div>
        ) : (
          <span style={{ color: C.textMuted, fontSize: 14 }}>{t('paper.result.noAuthorInfo')}</span>
        )}
      </section>
    </>
  )
}

function AnalysisItem({ label, detail }: { label: string; short: string; detail: string }) {
  return (
    <div style={{ marginBottom: 2, borderTop: `1px solid ${C.border}` }}>
      <div style={{ padding: '12px 0 4px' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
      </div>
      <div style={{ padding: '0 0 16px', fontSize: 14, lineHeight: 1.8, color: C.textSub }}>
        {detail}
      </div>
    </div>
  )
}

function AuthorCard({ author, currentTitle }: { author: PaperResult['authors'][0]; currentTitle: string }) {
  const t = useT()
  const metaParts: string[] = []
  if (author.hIndex != null)        metaParts.push(`h-index ${author.hIndex}`)
  if (author.citationCount != null) metaParts.push(t('paper.result.cited', { count: author.citationCount.toLocaleString() }))
  const curTitleLower = currentTitle.toLowerCase()

  return (
    <div style={{ padding: '16px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: C.text, lineHeight: 1.3 }}>{author.name}</span>
        {author.authorId && (
          <a href={`https://www.semanticscholar.org/author/${author.authorId}`} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: C.accentText, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {t('paper.result.profile')}
          </a>
        )}
      </div>
      {metaParts.length > 0 && <div style={{ fontSize: 12, color: C.textMuted, margin: '3px 0 6px' }}>{metaParts.join(' · ')}</div>}
      {author.topPapers?.length > 0 && (
        <ul style={{ listStyle: 'none', marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
          {author.topPapers.map((p, i) => {
            const isCurrent = p.title?.toLowerCase() === curTitleLower
            return (
              <li key={i} style={{ fontSize: 13, lineHeight: 1.5, padding: '6px 0', color: C.textSub, borderTop: i > 0 ? `1px dashed ${C.border}` : 'none' }}>
                {isCurrent ? <strong style={{ color: C.accentText }}>{p.title} ★</strong> : p.title}
                {' '}<span style={{ color: C.textMuted, fontSize: 11 }}>· {t('paper.result.cited', { count: p.citationCount ?? '?' })}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Utilities ──────────────────────────────────────────────────────
function Loader({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted, fontSize: 15 }}>
      {msg}
      <span style={{ display: 'inline-block', width: 16, height: 16, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', marginLeft: 12, verticalAlign: 'middle', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return <div style={{ background: 'var(--c-error-dim)', border: '1px solid var(--c-error)', borderRadius: 'var(--radius-md)', padding: '14px 18px', color: 'var(--c-error)', fontSize: 14 }}>❌ {msg}</div>
}
