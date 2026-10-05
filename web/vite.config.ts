import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:9000'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        // TODO(temp): iOS Safari에 남은 기존 서비스 워커를 강제 unregister + 캐시 삭제하기 위한 킬스위치. 배포 후 확인되면 false로 되돌릴 것.
        selfDestroying: true,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'veloo',
          short_name: 'veloo',
          description: '가천대 PRML Lab 연구실 도구 허브',
          display: 'standalone',
          start_url: '/',
          background_color: '#ffffff',
          theme_color: '#12876a',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': apiUrl,
        '/login': apiUrl,
        '/logout': apiUrl,
        '/register': apiUrl,
        '/paper': apiUrl,
        '/translate': apiUrl,
        '/model-review': apiUrl,
        '/todo': apiUrl,
        '/contextor': apiUrl,
      },
    },
  }
})
