import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { useT } from '@/shared/i18n'
import './Auth.css'

interface Props {
  mode: 'login' | 'signup'
}

export default function LoginPage({ mode }: Props) {
  const t = useT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const redirectTo = (() => {
    const value = searchParams.get('redirect')
    return value?.startsWith('/') && !value.startsWith('//') ? value : null
  })()

  useEffect(() => {
    document.title = mode === 'login' ? t('login.tabLogin') : t('login.tabRegister')
    setError('')
    setRegistered(false)

    let cancelled = false
    fetch('/api/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.username) navigate(`/${data.username}/`, { replace: true })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [mode, navigate, t])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch(mode === 'login' ? '/login' : '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const fallback = mode === 'login' ? t('login.errors.loginFailed') : t('login.errors.registerFailed')
        setError(response.status === 403 ? t('login.errors.pendingApproval') : (data.error ?? fallback))
        return
      }

      if (mode === 'signup') {
        setRegistered(true)
        return
      }

      const me = await fetch('/api/me').then((result) => result.json())
      navigate(redirectTo ?? `/${me.username}/`, { replace: true })
    } catch {
      setError(t('login.errors.serverError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link className="marketing-brand" to="/" aria-label="Veloo">
          <img src="/favicon.svg?v=2" alt="" />
          <span>Veloo</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="auth-main">
        <section className="auth-story">
          <Link className="auth-back" to="/">
            <ArrowLeft />
            {t('login.backHome')}
          </Link>
          <div>
            <span className="auth-kicker">{t('login.researchTagline')}</span>
            <h1>{mode === 'login' ? t('login.welcomeTitle') : t('login.signupTitle')}</h1>
            <p>{mode === 'login' ? t('login.welcomeDescription') : t('login.signupDescription')}</p>
          </div>
          <blockquote>
            <p>“{t('login.quote')}”</p>
            <footer>Veloo</footer>
          </blockquote>
        </section>

        <section className="auth-panel">
          <div className="auth-card">
            {registered ? (
              <div className="auth-success">
                <span>
                  <Check />
                </span>
                <h2>{t('login.registeredTitle')}</h2>
                <p>
                  {t('login.registeredMessage')} {t('login.registeredNote')}
                </p>
                <Link className="auth-submit" to="/login">
                  {t('login.backToLogin')}
                  <ArrowRight />
                </Link>
              </div>
            ) : (
              <>
                <div className="auth-card-heading">
                  <span>{mode === 'login' ? t('login.accountAccess') : t('login.betaAccess')}</span>
                  <h2>{mode === 'login' ? t('login.tabLogin') : t('login.tabRegister')}</h2>
                  <p>{mode === 'login' ? t('login.loginDescription') : t('login.registerDescription')}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                  <label>
                    <span>{t('login.usernameLabel')}</span>
                    <input
                      type="text"
                      name="username"
                      placeholder={t('login.usernamePlaceholder')}
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      minLength={3}
                      maxLength={30}
                      autoFocus
                    />
                  </label>
                  <label>
                    <span>{t('login.passwordLabel')}</span>
                    <input
                      type="password"
                      name="password"
                      placeholder={t('login.passwordPlaceholder')}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={mode === 'signup' ? 8 : undefined}
                    />
                    {mode === 'signup' && <small>{t('login.passwordHint')}</small>}
                  </label>

                  {error && (
                    <div className="auth-error" role="alert">
                      {error}
                    </div>
                  )}

                  <button className="auth-submit" type="submit" disabled={loading || !username || !password}>
                    {loading
                      ? mode === 'login'
                        ? t('login.checking')
                        : t('login.processing')
                      : mode === 'login'
                        ? t('login.loginButton')
                        : t('login.registerButton')}
                    {!loading && <ArrowRight />}
                  </button>
                </form>

                <p className="auth-switch">
                  {mode === 'login' ? t('login.noAccount') : t('login.haveAccount')}{' '}
                  <Link to={mode === 'login' ? '/signup' : '/login'}>
                    {mode === 'login' ? t('login.signUp') : t('login.loginLink')}
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
