import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useT } from '@/shared/i18n'

type GuardState = 'checking' | 'ready'

export default function ProtectedWorkspace() {
  const t = useT()
  const { username } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [state, setState] = useState<GuardState>('checking')

  useEffect(() => {
    let cancelled = false

    const verify = async () => {
      try {
        const response = await fetch('/api/me')
        if (!response.ok) throw new Error('unauthorized')
        const data = (await response.json()) as { username?: string }
        if (!data.username) throw new Error('unauthorized')
        if (cancelled) return

        if (data.username !== username) {
          const segments = location.pathname.split('/')
          segments[1] = data.username
          navigate(`${segments.join('/')}${location.search}`, { replace: true })
          return
        }

        setState('ready')
      } catch {
        if (cancelled) return
        const redirect = `${location.pathname}${location.search}`
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true })
      }
    }

    verify()
    return () => {
      cancelled = true
    }
  }, [location.pathname, location.search, navigate, username])

  if (state !== 'ready') {
    return (
      <div className="route-loading" role="status" aria-live="polite">
        <img src="/favicon.svg?v=2" alt="" />
        <span>{t('common.loading')}</span>
      </div>
    )
  }

  return <Outlet />
}
