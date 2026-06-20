import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Reddit 公开 JSON 走 dev server 代理，绕过浏览器 CORS。
    // 生产环境需换成自己的后端转发（参考 MOCKS.md）。
    proxy: {
      '/reddit-proxy': {
        target: 'https://www.reddit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/reddit-proxy/, ''),
        headers: {
          // Reddit 要求带 User-Agent，否则可能被限流
          'User-Agent': 'EvoPi/0.1 (personal-assistant; +https://evopi.ai)',
        },
      },
    },
  },
})
