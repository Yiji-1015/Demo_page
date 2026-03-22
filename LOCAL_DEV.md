# 로컬(집) 개발 환경 가이드

회사 서버 없이 프론트엔드만 작업할 수 있도록 MSW(Mock Service Worker)를 설정했습니다.

---

## 변경된 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/mocks/handlers.js` | **신규** — API 응답을 가짜 데이터로 대체하는 핸들러 |
| `frontend/src/mocks/browser.js` | **신규** — MSW 브라우저 워커 설정 |
| `frontend/src/main.jsx` | **수정** — `VITE_MOCK=true`일 때 MSW 활성화 |
| `frontend/.env.mock` | **신규** — mock 모드용 환경변수 (`VITE_MOCK=true`) |
| `frontend/package.json` | **수정** — `dev:mock` 스크립트 추가, msw 패키지 추가 |
| `frontend/public/mockServiceWorker.js` | **신규** — MSW가 자동 생성한 서비스 워커 파일 |

---

## Mock 대상 API

모두 `http://localhost:8000/onboarding/api` 기준입니다.

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| `POST` | `/chat` | 챗봇 질의응답 |
| `GET` | `/documents/embedded` | 임베딩된 문서 목록 |
| `GET` | `/system/status` | 사용자 이메일, Confluence URL |
| `GET` | `/documents/structure` | 문서 트리 구조 |

---

## 사용 방법

### 집에서 작업할 때 (Mock 모드)

```bash
cd frontend
npm run dev:mock
```

브라우저 콘솔에 아래 메시지가 뜨면 정상입니다.

```
[MSW] Mocking enabled.
```

### 회사에서 작업할 때 (실제 서버)

```bash
cd frontend
npm run dev
```

---

## Mock 데이터 수정 방법

`frontend/src/mocks/handlers.js`에서 응답값을 자유롭게 편집할 수 있습니다.

```js
// 챗봇 응답 수정 예시
http.post(`${BASE}/chat`, async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json({
    answer: '원하는 답변 내용',
    sources: [{ title: '문서 제목', url: '#', page: 1 }],
  });
}),
```

---

## 동작 원리

```
npm run dev:mock
      ↓
Vite가 --mode mock 으로 실행
      ↓
.env.mock 파일에서 VITE_MOCK=true 로드
      ↓
main.jsx에서 MSW worker 시작
      ↓
브라우저의 API 요청을 가로채서 handlers.js의 가짜 응답 반환
      ↓
실제 서버 없이도 UI 동작
```
