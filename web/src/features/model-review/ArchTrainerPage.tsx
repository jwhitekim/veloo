import { useState, useRef, useEffect } from 'react'
import { BadgeCheck, BrainCircuit, ImagePlus, MessageSquareText, RotateCcw, ScanSearch } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useT, useDateLocale } from '@/shared/i18n'
import PageHeader from '@/shared/components/PageHeader'
import PageGuide from '@/shared/components/PageGuide'
import { HistoryDropdown } from '@/shared/components/HistoryDropdown'
import StatePanel from '@/shared/components/StatePanel'
import { ActionButton } from '@/shared/components/WorkspaceControls'
import * as api from './api'
import type { ExplanationJSON, ExplanationModule, ExplanationFlowStep, FeedbackJSON, ArchHistoryItem } from './api'
import './ArchTrainer.css'

const C = {
  bg: 'var(--bg-canvas)',
  surface: 'var(--bg-base)',
  card: 'var(--bg-additive)',
  border: 'var(--border-subtle)',
  accent: 'var(--accent)',
  accentDim: 'var(--accent-soft)',
  accentText: 'var(--accent)',
  text: 'var(--text-primary)',
  textSub: 'var(--text-secondary)',
  textMuted: 'var(--text-disabled)',
  green: 'var(--c-green)',
  greenDim: 'var(--c-green-dim)',
  error: 'var(--c-error)',
}

type Step = 'upload' | 'train' | 'feedback'

export default function ArchTrainer() {
  const t = useT()
  const dateLocale = useDateLocale()
  const isMobile = useIsMobile()

  const SECTION_LABELS: Record<keyof ExplanationJSON, string> = {
    overview: t('reviewer.sections.overview'),
    modules: t('reviewer.sections.modules'),
    data_flow: t('reviewer.sections.data_flow'),
    contribution: t('reviewer.sections.contribution'),
  }

  const FEEDBACK_LABELS: Record<keyof FeedbackJSON, string> = {
    correct: t('reviewer.feedback.correct'),
    missing: t('reviewer.feedback.missing'),
    incorrect: t('reviewer.feedback.incorrect'),
    suggestion: t('reviewer.feedback.suggestion'),
  }
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<ExplanationJSON | null>(null)
  const [userText, setUserText] = useState('')
  const [feedback, setFeedback] = useState<FeedbackJSON | null>(null)
  const [step, setStep] = useState<Set<Step>>(new Set(['upload']))
  const [loadingExplain, setLoadingExplain] = useState(false)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<number | null>(null)
  const [archHistory, setArchHistory] = useState<ArchHistoryItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getArchHistory().then(setArchHistory)
  }, [])

  const show = (s: Step) => setStep((prev) => new Set([...prev, s]))

  const setFile = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const resetUpload = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImageFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const doExplain = async () => {
    if (!imageFile) return
    setLoadingExplain(true)
    setError(null)
    setStep(new Set(['upload']))
    try {
      const data = await api.explain(imageFile)
      setExplanation(data.explanation)
      setHistoryId(data.history_id)
      show('train')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingExplain(false)
    }
  }

  const doFeedback = async () => {
    if (!userText.trim()) {
      setError(t('reviewer.enterDescriptionError'))
      return
    }
    setLoadingFeedback(true)
    setError(null)
    setStep((prev) => {
      const s = new Set(prev)
      s.delete('feedback')
      return s
    })
    try {
      const data = await api.feedback(explanation!, userText, historyId)
      setFeedback(data.feedback)
      show('feedback')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingFeedback(false)
    }
  }

  const resetAll = () => {
    resetUpload()
    setExplanation(null)
    setUserText('')
    setFeedback(null)
    setHistoryId(null)
    setStep(new Set(['upload']))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const loadFromHistory = (item: ArchHistoryItem) => {
    setExplanation(item.explanation)
    setHistoryId(item.id)
    setFeedback(null)
    setUserText('')
    setStep(new Set(['upload', 'train']))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="arch-root">
      <div className="app-page-intro-shell app-page-intro-shell--workspace">
        <PageHeader
          kicker={t('reviewer.kicker')}
          icon={<BrainCircuit />}
          title={t('reviewer.heroTitle')}
          description={t('reviewer.heroDescription')}
        />
      </div>
      <div className="arch-shell">
        {error && <StatePanel compact kind="error" title={t('reviewer.requestFailedTitle')} description={error} />}

        {/* Step 1 — Upload */}
        <Card compact={isMobile}>
          <div className="arch-upload-toolbar">
            <CardTitle step={1}>{t('reviewer.uploadTitle')}</CardTitle>
            <HistoryDropdown
              items={archHistory}
              label={t('reviewer.recentAnalysis')}
              onSelect={loadFromHistory}
              renderItem={(item) => (
                <>
                  <strong>{item.image_name ?? t('reviewer.untitledImage')}</strong>
                  <small className="arch-history-date">
                    {new Date(item.created_at).toLocaleDateString(dateLocale)}
                  </small>
                </>
              )}
            />
          </div>
          {!previewUrl ? (
            <div
              className={`arch-upload-zone${dragOver ? ' is-dragging' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f?.type.startsWith('image/')) setFile(f)
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) setFile(e.target.files[0])
                }}
              />
              <div className="arch-upload-icon">
                <ImagePlus size={26} />
              </div>
              <p className="arch-upload-hint">
                <strong>{t('reviewer.uploadHintBold')}</strong>
                {t('reviewer.uploadHintSuffix')}
              </p>
              <p className="arch-upload-formats">{t('reviewer.uploadFormats')}</p>
            </div>
          ) : (
            <div className="arch-preview">
              <img src={previewUrl} alt={t('reviewer.previewAlt')} className="arch-preview-image" />
              <button onClick={resetUpload} className="reselect-btn">
                <RotateCcw size={11} />
                {t('reviewer.reselect')}
              </button>
            </div>
          )}
          <div className="arch-card-actions">
            <Btn primary disabled={!imageFile || loadingExplain} onClick={doExplain} loading={loadingExplain}>
              {loadingExplain ? t('reviewer.analyzingButton') : t('reviewer.getExplanationButton')}
            </Btn>
          </div>
        </Card>

        {!previewUrl && (
          <PageGuide
            ariaLabel={t('reviewer.guideAria')}
            numbered
            items={[
              {
                icon: ScanSearch,
                title: t('reviewer.guide.analyzeTitle'),
                description: t('reviewer.guide.analyzeDesc'),
              },
              {
                icon: MessageSquareText,
                title: t('reviewer.guide.explainTitle'),
                description: t('reviewer.guide.explainDesc'),
              },
              {
                icon: BadgeCheck,
                title: t('reviewer.guide.feedbackTitle'),
                description: t('reviewer.guide.feedbackDesc'),
              },
            ]}
          />
        )}

        {/* Step 2 — User Input */}
        {step.has('train') && (
          <Card compact={isMobile}>
            <CardTitle step={2}>{t('reviewer.explainYourselfTitle')}</CardTitle>
            <p style={{ fontSize: '0.85rem', color: C.textMuted, marginBottom: 12 }}>{t('reviewer.readyPrompt')}</p>
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder={t('reviewer.textareaPlaceholder')}
              className="arch-textarea"
            />
            <div className="arch-card-actions">
              <Btn primary disabled={loadingFeedback} onClick={doFeedback} loading={loadingFeedback}>
                {loadingFeedback ? t('reviewer.generatingFeedback') : t('reviewer.getFeedbackButton')}
              </Btn>
            </div>
          </Card>
        )}

        {/* Step 3 — AI Explanation + Feedback */}
        {step.has('feedback') && explanation && feedback && (
          <Card compact={isMobile}>
            <CardTitle step={3}>{t('reviewer.resultTitle')}</CardTitle>

            {/* AI 설명 */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  color: C.textMuted,
                  marginBottom: 10,
                }}
              >
                {t('reviewer.aiExplanationLabel')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionBlock label={SECTION_LABELS.overview} content={explanation.overview} />
                <ModuleListBlock label={SECTION_LABELS.modules} items={explanation.modules} />
                <FlowListBlock label={SECTION_LABELS.data_flow} items={explanation.data_flow} />
                <SectionBlock label={SECTION_LABELS.contribution} content={explanation.contribution} />
              </div>
            </div>

            {/* 피드백 */}
            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  color: C.textMuted,
                  marginBottom: 10,
                }}
              >
                {t('reviewer.feedbackLabel')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ListBlock label={FEEDBACK_LABELS.correct} items={feedback.correct} />
                <ListBlock label={FEEDBACK_LABELS.missing} items={feedback.missing} />
                <ListBlock label={FEEDBACK_LABELS.incorrect} items={feedback.incorrect} />
                <SectionBlock label={FEEDBACK_LABELS.suggestion} content={feedback.suggestion} />
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: C.textMuted, marginTop: 16 }}>{t('reviewer.tryAgainHint')}</p>
            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <Btn
                ghost
                onClick={() => {
                  setUserText('')
                  setStep((prev) => {
                    const s = new Set(prev)
                    s.delete('feedback')
                    return s
                  })
                }}
              >
                {t('reviewer.explainAgain')}
              </Btn>
              <Btn onClick={resetAll}>{t('reviewer.newUpload')}</Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function SectionBlock({ label, content }: { label: string; content: string }) {
  return (
    <div style={{ borderRadius: 'var(--radius-md)', padding: '10px 14px', background: 'var(--bg-additive)' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          marginBottom: 6,
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.75, margin: 0 }}>{content}</p>
    </div>
  )
}

// correct/missing/incorrect처럼 "문자열 배열"인 필드용 — 백엔드 프롬프트 스키마가
// 배열인데 예전엔 SectionBlock에 그대로 넘겨 bullet 없이 이어붙여 렌더링됐었다.
function ListBlock({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null
  return (
    <div style={{ borderRadius: 'var(--radius-md)', padding: '10px 14px', background: 'var(--bg-additive)' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          marginBottom: 6,
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.75 }}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

// modules는 {name, role, operation} 객체 배열 — 예전엔 SectionBlock에 객체를 그대로
// 넘겨서 React error #31("Objects are not valid as a React child")로 죽던 필드.
function ModuleListBlock({ label, items }: { label: string; items: ExplanationModule[] }) {
  if (!items?.length) return null
  return (
    <div style={{ borderRadius: 'var(--radius-md)', padding: '10px 14px', background: 'var(--bg-additive)' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          marginBottom: 6,
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((m, i) => (
          <div key={i} style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            <strong>{m.name}</strong>
            {m.role && <span style={{ color: 'var(--text-secondary)' }}> — {m.role}</span>}
            {m.operation && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{m.operation}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// data_flow는 {step, description} 객체 배열 — modules와 같은 이유로 별도 렌더링 필요.
function FlowListBlock({ label, items }: { label: string; items: ExplanationFlowStep[] }) {
  if (!items?.length) return null
  const sorted = [...items].sort((a, b) => a.step - b.step)
  return (
    <div style={{ borderRadius: 'var(--radius-md)', padding: '10px 14px', background: 'var(--bg-additive)' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          marginBottom: 6,
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </div>
      <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.75 }}>
        {sorted.map((s) => (
          <li key={s.step}>{s.description}</li>
        ))}
      </ol>
    </div>
  )
}

function Card({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return <section className={`arch-card${compact ? ' is-compact' : ''}`}>{children}</section>
}

function CardTitle({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="arch-card-title">
      <span className="arch-step-number">{step}</span>
      <span className="arch-card-title-text">{children}</span>
    </div>
  )
}

function Btn({
  children,
  primary,
  ghost,
  disabled,
  loading,
  onClick,
}: {
  children: React.ReactNode
  primary?: boolean
  ghost?: boolean
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
}) {
  return (
    <ActionButton
      variant={primary ? 'primary' : 'secondary'}
      disabled={disabled}
      onClick={onClick}
      className={ghost ? 'arch-btn-ghost' : ''}
    >
      {loading && <Spinner />}
      {children}
    </ActionButton>
  )
}

function Spinner() {
  return <span className="arch-spinner" />
}
