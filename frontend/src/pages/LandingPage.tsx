import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Braces,
  CalendarDays,
  Check,
  FileSearch,
  Languages,
  ListTodo,
  Network,
  Sparkles,
} from 'lucide-react'
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { useLanguage } from '@/shared/i18n'
import './Marketing.css'

const FEATURES = [
  { key: 'plan', Icon: CalendarDays },
  { key: 'paper', Icon: FileSearch },
  { key: 'translate', Icon: Languages },
  { key: 'model', Icon: Network },
  { key: 'concept', Icon: Braces },
] as const

const PREVIEW_TASKS = [
  { key: 'task1', time: '09:00 — 10:30', tag: 'Paper' },
  { key: 'task2', time: '11:00 — 12:00', tag: 'Model' },
  { key: 'task3', time: '14:00 — 16:00', tag: 'Focus' },
] as const

const PREVIEW_NAV = [
  { key: 'todo', Icon: ListTodo },
  { key: 'calendar', Icon: CalendarDays },
  { key: 'paper', Icon: FileSearch },
  { key: 'translate', Icon: Languages },
  { key: 'model-review', Icon: Network },
  { key: 'contextor', Icon: Braces },
] as const

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}

function ResearchField({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    const context = canvas?.getContext('2d')
    if (!canvas || !host || !context) return

    let frame = 0
    let width = 0
    let height = 0
    let points: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> = []

    const createPoints = () => {
      const count = Math.max(18, Math.min(38, Math.floor(width / 30)))
      points = Array.from({ length: count }, (_, index) => ({
        x: (width * ((index * 37) % count)) / count,
        y: (height * ((index * 61) % count)) / count,
        vx: ((index % 5) - 2) * 0.055,
        vy: (((index * 3) % 5) - 2) * 0.04,
        radius: index % 4 === 0 ? 2 : 1.25,
      }))
    }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      createPoints()
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)

      for (let i = 0; i < points.length; i += 1) {
        const point = points[i]
        if (!reducedMotion) {
          point.x += point.vx
          point.y += point.vy
          if (point.x < -10) point.x = width + 10
          if (point.x > width + 10) point.x = -10
          if (point.y < -10) point.y = height + 10
          if (point.y > height + 10) point.y = -10
        }

        for (let j = i + 1; j < points.length; j += 1) {
          const other = points[j]
          const distance = Math.hypot(point.x - other.x, point.y - other.y)
          if (distance > 145) continue
          context.beginPath()
          context.moveTo(point.x, point.y)
          context.lineTo(other.x, other.y)
          context.strokeStyle = `rgba(18, 135, 106, ${(1 - distance / 145) * 0.12})`
          context.lineWidth = 0.7
          context.stroke()
        }

        context.beginPath()
        context.arc(point.x, point.y, point.radius, 0, Math.PI * 2)
        context.fillStyle = point.radius > 1.5 ? 'rgba(18, 135, 106, .28)' : 'rgba(18, 135, 106, .16)'
        context.fill()
      }

      if (!reducedMotion) frame = window.requestAnimationFrame(draw)
    }

    const observer = new ResizeObserver(() => {
      resize()
      if (reducedMotion) draw()
    })
    observer.observe(host)
    resize()
    draw()

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [reducedMotion])

  return <canvas ref={canvasRef} className="research-field" aria-hidden="true" />
}

export default function LandingPage() {
  const { language, t } = useLanguage()
  const reducedMotion = useReducedMotion()
  const pageRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [headerScrolled, setHeaderScrolled] = useState(false)
  const [activeTask, setActiveTask] = useState(0)

  useEffect(() => {
    document.title = 'Veloo'
    let cancelled = false
    fetch('/api/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.username) setUsername(data.username)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    const timer = window.setInterval(() => setActiveTask((current) => (current + 1) % PREVIEW_TASKS.length), 1900)
    return () => window.clearInterval(timer)
  }, [reducedMotion])

  useEffect(() => {
    let scheduled = false
    const update = () => {
      scheduled = false
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`
      setHeaderScrolled(window.scrollY > 18)
    }
    const onScroll = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const page = pageRef.current
    if (!page) return
    const elements = Array.from(page.querySelectorAll<HTMLElement>('[data-reveal]'))
    page.classList.add('motion-ready')

    if (reducedMotion) {
      elements.forEach((element) => element.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting)
        })
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [reducedMotion])

  const handlePreviewMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType === 'touch') return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    event.currentTarget.style.setProperty('--preview-rotate-x', `${(-y * 5).toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--preview-rotate-y', `${(x * 7).toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--preview-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`)
    event.currentTarget.style.setProperty('--preview-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`)
  }

  const resetPreview = () => {
    previewRef.current?.style.removeProperty('--preview-rotate-x')
    previewRef.current?.style.removeProperty('--preview-rotate-y')
  }

  const handleCardMove = (event: React.PointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType === 'touch') return
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--card-x', `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty('--card-y', `${event.clientY - rect.top}px`)
  }

  const workspaceHref = username ? `/${username}/` : '/signup'

  return (
    <div ref={pageRef} className="marketing-page">
      <div ref={progressRef} className="marketing-scroll-progress" aria-hidden="true" />
      <header className={`marketing-header${headerScrolled ? ' is-scrolled' : ''}`}>
        <Link className="marketing-brand" to="/" aria-label="Veloo">
          <img src="/favicon.svg?v=2" alt="" />
          <span>Veloo</span>
        </Link>
        <nav className="marketing-nav" aria-label={t('landing.navAria')}>
          <a href="#features">{t('landing.nav.features')}</a>
          <a href="#workflow">{t('landing.nav.workflow')}</a>
        </nav>
        <div className="marketing-actions">
          <LanguageSwitcher />
          {!username && (
            <Link className="marketing-login" to="/login">
              {t('landing.nav.login')}
            </Link>
          )}
          <Link className="button button-small button-dark" to={workspaceHref}>
            {username ? t('landing.nav.workspace') : t('landing.nav.start')}
          </Link>
        </div>
      </header>

      <main>
        <section className="marketing-hero">
          <ResearchField reducedMotion={reducedMotion} />
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={14} />
              {t('landing.eyebrow')}
            </div>
            <h1 className={`hero-title hero-title-${language}`}>
              <span className="hero-title-line">{t('landing.heroTitle')}</span>
              <span className="hero-title-accent">{t('landing.heroAccent')}</span>
            </h1>
            <p>{t('landing.heroDescription')}</p>
            <div className="hero-actions">
              <Link className="button button-primary" to={workspaceHref}>
                {username ? t('landing.openWorkspace') : t('landing.startBeta')}
                <ArrowRight size={17} />
              </Link>
              <a className="button button-secondary" href="#features">
                {t('landing.explore')}
              </a>
            </div>
            <div className="hero-note">
              <Check size={14} />
              {t('landing.betaNote')}
            </div>
          </div>

          <div className="hero-visual" data-reveal>
            <img className="marketing-hero-art" src="/marketing/hero-research.png" alt="" aria-hidden="true" />
          </div>
        </section>

        <section className="marketing-product-showcase" data-reveal>
          <div
            ref={previewRef}
            className="product-preview"
            aria-label={t('landing.previewAria')}
            onPointerMove={handlePreviewMove}
            onPointerLeave={resetPreview}
          >
            <div className="preview-pointer-glow" aria-hidden="true" />
            <div className="preview-scanline" aria-hidden="true" />
            <div className="preview-topbar">
              <div className="preview-brand">
                <img src="/favicon.svg?v=2" alt="" />
                Veloo
              </div>
              <div className="preview-avatar">J</div>
            </div>
            <div className="preview-body">
              <aside className="preview-sidebar">
                <span className="preview-nav-label">{t('shell.workspaceLabel')}</span>
                {PREVIEW_NAV.map(({ Icon, key }, index) => (
                  <div className={`preview-nav-item${index === 0 ? ' is-active' : ''}`} key={key}>
                    <Icon size={13} />
                    <span>{t(`shell.nav.${key}`)}</span>
                  </div>
                ))}
              </aside>
              <div className="preview-content">
                <div className="preview-heading">
                  <div>
                    <small>{t('todo.kicker')}</small>
                    <h2>{t('landing.preview.heading')}</h2>
                    <p>{t('todo.overview.heroDescription')}</p>
                  </div>
                  <ListTodo aria-hidden="true" />
                </div>
                <div className="preview-summary">
                  <div>
                    <b>{t('landing.preview.today')}</b>
                    <div className="preview-progress">
                      <span style={{ width: `${52 + activeTask * 13}%` }} />
                    </div>
                    <small>4 / 6 {t('landing.preview.complete')}</small>
                  </div>
                  <div className="preview-stat">
                    <span>{t('landing.preview.focus')}</span>
                    <b>3h 20m</b>
                  </div>
                  <div className="preview-stat">
                    <span>{t('landing.preview.papers')}</span>
                    <b>8</b>
                  </div>
                </div>
                <div className="preview-list-heading">
                  <div>
                    <small>{t('landing.preview.plan')}</small>
                    <b>{t('todo.researchFlow')}</b>
                  </div>
                  <span className="preview-date">{t('landing.preview.date')}</span>
                </div>
                {PREVIEW_TASKS.map((task, index) => (
                  <div
                    className={`preview-task${index < activeTask ? ' is-done' : ''}${index === activeTask ? ' is-current' : ''}`}
                    key={task.key}
                  >
                    <span className="task-check">{index < activeTask && <Check />}</span>
                    <div>
                      <b>{t(`landing.preview.${task.key}`)}</b>
                      <small>{task.time}</small>
                    </div>
                    <em>{task.tag}</em>
                  </div>
                ))}
                <div className={`preview-insight preview-insight-${activeTask}`}>
                  <Sparkles />
                  <div>
                    <b>{t('landing.preview.insightTitle')}</b>
                    <p>{t('landing.preview.insight')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="marketing-proof" aria-label={t('landing.proofAria')} data-reveal>
          <span>{t('landing.proof')}</span>
          <div>
            <ListTodo />
            {t('landing.proofLabels.plan')}
          </div>
          <div>
            <FileSearch />
            {t('landing.proofLabels.research')}
          </div>
          <div>
            <Network />
            {t('landing.proofLabels.learn')}
          </div>
        </section>

        <section className="marketing-visual-stories" aria-label={t('landing.features.title')}>
          <article className="visual-story" data-reveal>
            <img src="/marketing/paper-translation.png" alt="" aria-hidden="true" />
            <div>
              <span>01</span>
              <h2>{t('landing.features.paper.title')}</h2>
              <p>{t('landing.features.paper.description')}</p>
              <p>{t('landing.features.translate.description')}</p>
            </div>
          </article>
          <article className="visual-story visual-story-reverse" data-reveal>
            <img src="/marketing/model-learning.png" alt="" aria-hidden="true" />
            <div>
              <span>02</span>
              <h2>{t('landing.features.model.title')}</h2>
              <p>{t('landing.features.model.description')}</p>
              <p>{t('landing.features.concept.description')}</p>
            </div>
          </article>
        </section>

        <section id="features" className="marketing-section features-section">
          <div className="section-heading" data-reveal>
            <div className="eyebrow">{t('landing.features.eyebrow')}</div>
            <h2>{t('landing.features.title')}</h2>
            <p>{t('landing.features.description')}</p>
          </div>
          <div className="feature-grid">
            {FEATURES.map(({ key, Icon }, index) => (
              <article
                className={`feature-card feature-card-${index + 1}`}
                key={key}
                data-reveal
                onPointerMove={handleCardMove}
              >
                <div className="feature-icon">
                  <Icon />
                </div>
                <h3>{t(`landing.features.${key}.title`)}</h3>
                <p>{t(`landing.features.${key}.description`)}</p>
                <span>{String(index + 1).padStart(2, '0')}</span>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="marketing-section workflow-section">
          <div className="workflow-copy" data-reveal>
            <div className="eyebrow">{t('landing.workflow.eyebrow')}</div>
            <h2>{t('landing.workflow.title')}</h2>
            <p>{t('landing.workflow.description')}</p>
          </div>
          <ol className="workflow-list">
            {[1, 2, 3].map((step) => (
              <li key={step} data-reveal>
                <span>0{step}</span>
                <div>
                  <h3>{t(`landing.workflow.step${step}.title`)}</h3>
                  <p>{t(`landing.workflow.step${step}.description`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="marketing-cta" data-reveal>
          <div>
            <span>{t('landing.cta.eyebrow')}</span>
            <h2>{t('landing.cta.title')}</h2>
            <p>{t('landing.cta.description')}</p>
          </div>
          <Link className="button button-light" to={workspaceHref}>
            {username ? t('landing.openWorkspace') : t('landing.cta.button')}
            <ArrowRight size={17} />
          </Link>
        </section>
      </main>

      <footer className="marketing-footer">
        <div className="marketing-brand">
          <img src="/favicon.svg?v=2" alt="" />
          <span>Veloo</span>
        </div>
        <p>{t('landing.footer')}</p>
        <span>{t('landing.copyright')}</span>
      </footer>
    </div>
  )
}
