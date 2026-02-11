import { onboardingApi } from './client';

// Confluence 연결
export const connectConfluence = async (config) => {
  return await onboardingApi.post('/confluence/connect', config);
};

// 카테고리 조회
export const getCategories = async (config) => {
  return await onboardingApi.post('/confluence/categories', config);
};

// 페이지 필터링
export const filterPages = async (config, filters) => {
  return await onboardingApi.post('/confluence/filter-pages', config, {
    params: filters
  });
};

// 임베딩 초기화
export const initializeEmbedding = async () => {
  return await onboardingApi.post('/embedding/initialize');
};

// 페이지 임베딩
export const embedPages = async (data) => {
  return await onboardingApi.post('/embedding/embed-pages', data);
};

// 채팅 (일반)
export const sendChatMessage = async (query, options = {}) => {
  return await onboardingApi.post('/chat', {
    query,
    top_k: options.top_k || 3,
    score_threshold: options.score_threshold || 0.0
  });
};

// 채팅 (스트리밍)
export const sendChatMessageStream = async (query, options = {}) => {
  return await onboardingApi.post('/chat/stream', {
    query,
    top_k: options.top_k || 3,
    score_threshold: options.score_threshold || 0.0
  }, {
    responseType: 'stream'
  });
};

// 컬렉션 정보
export const getCollectionInfo = async () => {
  return await onboardingApi.get('/collection/info');
};