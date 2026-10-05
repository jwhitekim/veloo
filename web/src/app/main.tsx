import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import '../shared/styles/index.css'
import { LanguageProvider } from '@/shared/i18n'
import App from './App'

const canRegisterServiceWorker =
  'serviceWorker' in navigator &&
  (window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname))

if (canRegisterServiceWorker) {
  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.warn('Service worker registration failed:', error)
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>,
)
