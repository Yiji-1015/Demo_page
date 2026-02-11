import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 👇 server 설정을 하나로 깔끔하게 합쳤습니다!
  server: {
    host: true,      // 도커 밖에서 접속 허용 (필수)
    port: 5173,      // 포트 고정
    watch: {
      usePolling: true // 윈도우 파일 변경 감지용
    },
    // 📌 프록시 설정 (혹시 상대 경로 '/api'를 쓸 경우를 대비해 도커 주소로 수정)
    proxy: {
      '/api': {
        // 도커 내부에서는 'localhost' 대신 '컨테이너 이름'을 써야 합니다.
        target: 'http://chatbot-backend:8000', 
        changeOrigin: true,
      }
    }
  }
})