import { useT } from '@/shared/i18n'
import './SessionExpiredMessage.css'

interface Props {
  redirectTo?: string
}

export function SessionExpiredMessage({ redirectTo = '/translate' }: Props) {
  const t = useT()
  const loginUrl = `/login?redirect=${encodeURIComponent(redirectTo)}`
  return (
    <div className="session-expired-message" role="alert">
      <span>⚠ {t('common.sessionExpired')}</span>
      <a href={loginUrl}>{t('common.loginAgain')}</a>
    </div>
  )
}
