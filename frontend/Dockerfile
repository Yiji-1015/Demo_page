# 1. 빌드 단계 (Node.js 이미지 사용)
FROM node:18-alpine as builder

# 작업 폴더 설정
WORKDIR /app

# 패키지 정보 복사 및 설치
COPY package.json package-lock.json ./
RUN npm install

# 소스 코드 복사 및 빌드 (Vite 빌드 -> dist 폴더 생성됨)
COPY . .
RUN npm run build

# 2. 실행 단계 (Nginx 이미지 사용 - 가볍고 빠름)
FROM nginx:alpine

# 빌드 단계에서 만든 결과물(dist 폴더)을 Nginx가 서비스할 폴더로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA(Single Page App)를 위한 Nginx 설정 파일 복사 (아래에서 만들 예정)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 80번 포트 노출
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]