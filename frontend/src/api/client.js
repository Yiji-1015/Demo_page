import axios from 'axios';

// =================================================================
// 🌐 API 주소 자동 설정 (Auto-Configuration)
// =================================================================
// 우선순위 1: .env 파일에 정의된 VITE_CHATBOT_API_URL (서버 배포용)
// 우선순위 2: 정의되지 않았다면 http://localhost:8000 (로컬 개발용)
// =================================================================
const envUrl = import.meta.env.VITE_CHATBOT_API_URL;
const defaultUrl = 'http://localhost:8000';

const baseURL = envUrl || defaultUrl;

// 개발자 도구(F12) 콘솔에서 현재 연결된 주소를 확인할 수 있게 로그 출력
if (!envUrl) {
  console.log(`⚠️ [Dev Mode] 환경변수가 없어 로컬 주소를 사용합니다: ${defaultUrl}`);
} else {
  console.log(`✅ [Prod Mode] 설정된 서버 주소를 사용합니다: ${envUrl}`);
}

const client = axios.create({
  baseURL: baseURL,
  headers: { 'Content-Type': 'application/json' }
});

export default client;