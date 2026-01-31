import client from './client';

// ❌ 기존 코드 (삭제 또는 주석 처리)
// export const Query = base44.entities.Query;
// export const User = base44.auth;

// ✅ 변경 코드 (일단 빈 껍데기로 만들어서 에러 방지)
// 나중에 백엔드 API랑 정확히 연결할 때 채워넣으면 됩니다.

export const Query = {
  create: async (data) => {
    // 임시로 우리 백엔드의 채팅 API로 연결 (예시)
    console.log("백엔드로 질문 전송:", data);
    return client.post('/api/chat', data); 
  },
  find: () => { console.log("검색 기능 호출됨"); }
};

export const User = {
  current: async () => {
    // 임시 유저 정보 반환
    return { data: { name: "Guest User" } };
  }
};