// 1. .env에서 서버 주소를 읽어옵니다.
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';

// 2. 공통으로 쓸 헤더 설정을 정의합니다.
export const defaultHeaders = {
  'Content-Type': 'application/json',
};