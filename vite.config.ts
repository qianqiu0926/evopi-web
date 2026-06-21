import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    // 所有 /api/* 请求转发到 evopi-api（Fastify BFF，端口 8787）。
    // evopi-web 自带的 mock server（server/index.mjs）已停用，统一走 evopi-api。
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
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
