import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8000/onboarding/api';

export const handlers = [
  // ① 챗봇 응답
  http.post(`${BASE}/chat`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      answer: `[Mock] "${body.query}"에 대한 답변입니다. 실제 서버 연결 없이 UI를 테스트 중입니다.`,
      sources: [
        { title: '온보딩 가이드 1장', url: '#', page: 3 },
        { title: '신입사원 FAQ', url: '#', page: 7 },
      ],
    });
  }),

  // ② 임베딩된 문서 목록
  http.get(`${BASE}/documents/embedded`, () => {
    return HttpResponse.json({
      status: 'success',
      total_count: 3,
      data: [
        { id: 1, title: '온보딩 가이드', space_key: 'LLOYDK', page_count: 12 },
        { id: 2, title: '개발 환경 설정', space_key: 'LLOYDK', page_count: 5 },
        { id: 3, title: '협업 도구 사용법', space_key: 'LLOYDK', page_count: 8 },
      ],
    });
  }),

  // ③ 시스템 상태 (사용자 정보)
  http.get(`${BASE}/system/status`, () => {
    return HttpResponse.json({
      email: 'mock-user@company.com',
      confluence_url: 'https://lloydk.atlassian.net',
    });
  }),

  // ④ 문서 트리 구조
  http.get(`${BASE}/documents/structure`, () => {
    return HttpResponse.json([
      {
        id: '1',
        title: '온보딩 가이드',
        type: 'page',
        children: [
          { id: '1-1', title: '회사 소개', type: 'page', children: [] },
          { id: '1-2', title: '팀 구성', type: 'page', children: [] },
        ],
      },
      {
        id: '2',
        title: '개발 환경 설정',
        type: 'page',
        children: [
          { id: '2-1', title: 'Git 설정', type: 'page', children: [] },
          { id: '2-2', title: 'Docker 설치', type: 'page', children: [] },
        ],
      },
    ]);
  }),
];
