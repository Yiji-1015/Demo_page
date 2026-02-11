import { insightApi } from './client';

// 인사이트 API는 프록시 방식이므로 범용 함수 제공

export const getInsight = async (path, params = {}) => {
  return await insightApi.get(path, { params });
};

export const postInsight = async (path, data) => {
  return await insightApi.post(path, data);
};

export const putInsight = async (path, data) => {
  return await insightApi.put(path, data);
};

export const patchInsight = async (path, data) => {
  return await insightApi.patch(path, data);
};

export const deleteInsight = async (path) => {
  return await insightApi.delete(path);
};

// 필요 시 특정 API 함수 추가
// 예: export const getUsers = () => insightApi.get('/users');