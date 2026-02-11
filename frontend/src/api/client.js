import axios from 'axios';
import { SERVER_URL, defaultHeaders } from './config';

// 온보딩 API 클라이언트
export const onboardingApi = axios.create({
  baseURL: `${SERVER_URL}/onboarding/api`,
  headers: defaultHeaders,
});

// 인사이트 API 클라이언트 (프록시)
export const insightApi = axios.create({
  baseURL: `${SERVER_URL}/insight`,
  headers: defaultHeaders,
});

// 기본 클라이언트 (필요시)
export const apiClient = axios.create({
  baseURL: SERVER_URL,
  headers: defaultHeaders,
});