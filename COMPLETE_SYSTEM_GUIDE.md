# 🚀 LLOYDK 온보딩 포털 - 완전한 시스템 가이드

> **최종 업데이트**: 2026-02-09
> **작동 확인**: 정상 ✅

---

## 📋 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [백엔드 구조 및 API](#2-백엔드-구조-및-api)
3. [프론트엔드 구조](#3-프론트엔드-구조)
4. [데이터 흐름](#4-데이터-흐름)
5. [환경 설정](#5-환경-설정)

---

## 1. 전체 아키텍처

### 시스템 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 브라우저                            │
│                  http://192.168.123.42:5173                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    프론트엔드 (React + Vite)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Home        │  │ Analytics    │  │ Onboarding   │         │
│  │  대시보드     │  │ 인사이트     │  │ 챗봇 서비스   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              백엔드 (FastAPI) - Port 8000                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Root Server (main.py)                                   │   │
│  │  ├─ GET  /                     헬스체크                  │   │
│  │  ├─ /onboarding/*              온보딩 서비스 라우팅      │   │
│  │  └─ /insight/{path}            외부 프록시 (41번 서버)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Onboarding Module (onboarding/main.py)                  │   │
│  │  ├─ Confluence API 연동                                  │   │
│  │  ├─ Qdrant Vector DB                                     │   │
│  │  ├─ Upstage Embedding                                    │   │
│  │  └─ RAG Chatbot                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
  ┌──────────────────┐     ┌──────────────────┐
  │  Confluence API  │     │  Qdrant Vector   │
  │  (Atlassian)     │     │  Database        │
  └──────────────────┘     └──────────────────┘
```

### 기술 스택

| 구분 | 기술 |
|------|------|
| **프론트엔드** | React 18, Vite, TailwindCSS, shadcn/ui |
| **백엔드** | FastAPI, Python 3.11 |
| **AI/ML** | Upstage Solar LLM, Upstage Embeddings |
| **벡터 DB** | Qdrant |
| **외부 연동** | Confluence REST API |
| **컨테이너** | Docker, Docker Compose |

---

## 2. 백엔드 구조 및 API

### 2.1 루트 서버 구조

**파일**: `/backend/main.py`

```
Root FastAPI App
├─ CORS 설정 (모든 origin 허용)
├─ /onboarding/* → 온보딩 앱 마운트
└─ /insight/* → 외부 프록시 (192.168.123.41:8000)
```

### 2.2 전체 API 엔드포인트

#### 루트 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/` | 서버 상태 확인 |
| `GET` | `/onboarding/` | 온보딩 모듈 상태 |
| `ALL` | `/insight/{path}` | 외부 서버 프록시 |

#### 온보딩 API (Base: `/onboarding/api`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/confluence/connect` | Confluence 서버 연결 테스트 |
| `POST` | `/confluence/categories` | 카테고리 계층 구조 조회 |
| `POST` | `/confluence/filter-pages` | 카테고리 필터링 |
| `POST` | `/embedding/initialize` | 임베딩 시스템 초기화 |
| `POST` | `/embedding/embed-pages` | 페이지 임베딩 처리 |
| `POST` | `/chat` | 챗봇 질문 (일반) |
| `POST` | `/chat/stream` | 챗봇 질문 (스트리밍) |
| `GET` | `/collection/info` | 벡터 DB 컬렉션 정보 |

---

### 2.3 상세 API 명세

#### 1️⃣ Confluence 연결

**POST** `/onboarding/api/confluence/connect`

Confluence 서버에 연결하고 Space의 페이지 접근 권한을 확인합니다.

**요청**:
```json
{
  "base_url": "https://your-domain.atlassian.net/wiki",
  "email": "user@example.com",
  "api_token": "your_api_token",
  "space_key": "SPACE"
}
```

**응답 성공** (200):
```json
{
  "status": "success",
  "message": "Confluence 연결 성공! (총 50개 페이지)",
  "page_count": 50
}
```

**응답 실패** (400):
```json
{
  "detail": "Confluence 연결 실패: 403 Forbidden"
}
```

---

#### 2️⃣ 카테고리 조회

**POST** `/onboarding/api/confluence/categories`

Confluence Space의 페이지 계층 구조를 분석하여 카테고리별로 정리합니다.

**요청**:
```json
{
  "base_url": "https://your-domain.atlassian.net/wiki",
  "email": "user@example.com",
  "api_token": "your_api_token",
  "space_key": "SPACE"
}
```

**응답** (200):
```json
{
  "status": "success",
  "categories": {
    "level_1": ["인사", "재무", "기술"],
    "level_2": ["채용", "급여", "개발"],
    "level_3": ["면접", "연봉", "프론트엔드"]
  },
  "category_tree": {
    "인사": {
      "채용": 5,
      "급여": 3
    }
  },
  "pages": [
    {
      "id": "123456",
      "title": "채용 프로세스",
      "path": "인사 / 채용",
      "url": "https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456"
    }
  ],
  "total_pages": 50
}
```

---

#### 3️⃣ 페이지 필터링

**POST** `/onboarding/api/confluence/filter-pages?level_1=인사&level_2=채용`

선택한 카테고리에 해당하는 페이지 ID 목록을 가져옵니다.

**요청 Body**:
```json
{
  "base_url": "https://your-domain.atlassian.net/wiki",
  "email": "user@example.com",
  "api_token": "your_api_token",
  "space_key": "SPACE"
}
```

**Query Parameters**:
- `level_1` (optional): 대분류
- `level_2` (optional): 중분류
- `level_3` (optional): 소분류
- `level_4` (optional): 세분류

**응답** (200):
```json
{
  "status": "success",
  "page_ids": ["123456", "789012"],
  "count": 2,
  "filters": {
    "level_1": "인사",
    "level_2": "채용"
  }
}
```

---

#### 4️⃣ 임베딩 초기화

**POST** `/onboarding/api/embedding/initialize`

Qdrant Vector DB 컬렉션을 생성하고 임베딩 시스템을 초기화합니다.

**요청**: 없음

**응답** (200):
```json
{
  "status": "success",
  "message": "임베딩 매니저 및 챗봇 초기화 완료",
  "collection_info": {
    "points_count": 0,
    "segments_count": 1
  }
}
```

**필수 환경변수**:
- `UPSTAGE_API_KEY`
- `QDRANT_URL`
- `QDRANT_API_KEY`

---

#### 5️⃣ 페이지 임베딩

**POST** `/onboarding/api/embedding/embed-pages`

선택한 Confluence 페이지들을 임베딩하여 벡터 DB에 저장합니다.

**요청**:
```json
{
  "base_url": "https://your-domain.atlassian.net/wiki",
  "email": "user@example.com",
  "api_token": "your_api_token",
  "space_key": "SPACE",
  "page_ids": ["123456", "789012"],
  "collection_name": "confluence_docs"
}
```

**응답** (200):
```json
{
  "status": "success",
  "message": "2개 페이지 임베딩 완료",
  "embedded_pages": 2
}
```

---

#### 6️⃣ 챗봇 질문 (일반)

**POST** `/onboarding/api/chat`

RAG 기반 챗봇에게 질문하고 답변을 받습니다.

**요청**:
```json
{
  "query": "신입 사원 채용 절차는 어떻게 되나요?",
  "top_k": 3,
  "score_threshold": 0.0
}
```

**응답** (200):
```json
{
  "status": "success",
  "answer": "신입 사원 채용 절차는 다음과 같습니다...",
  "sources": [
    {
      "page_id": "123456",
      "title": "채용 프로세스",
      "score": 0.92
    }
  ]
}
```

---

#### 7️⃣ 챗봇 질문 (스트리밍)

**POST** `/onboarding/api/chat/stream`

실시간 스트리밍 방식으로 답변을 받습니다. (Server-Sent Events)

**요청**: 위와 동일

**응답 형식** (text/event-stream):
```
data: {"type": "source", "content": {...}}

data: {"type": "answer", "content": "신입"}

data: {"type": "answer", "content": " 사원"}

data: {"type": "done"}
```

---

#### 8️⃣ 컬렉션 정보 조회

**GET** `/onboarding/api/collection/info`

Qdrant 벡터 DB의 현재 상태를 조회합니다.

**요청**: 없음

**응답** (200):
```json
{
  "status": "success",
  "collection_info": {
    "points_count": 150,
    "segments_count": 2
  }
}
```

---

### 2.4 백엔드 파일 구조

```
backend/
├── main.py                          # 루트 FastAPI 서버
├── Dockerfile                       # 백엔드 도커 이미지
└── onboarding/                      # 온보딩 모듈
    ├── main.py                      # 온보딩 FastAPI 앱
    ├── .env                         # 환경변수 (API 키)
    └── app/
        ├── confluence_api.py        # Confluence REST API 클라이언트
        ├── parser.py                # HTML 파싱 및 전처리
        ├── embedding.py             # Upstage Embedding + Qdrant
        └── chatbot.py               # RAG 챗봇 로직
```

---

## 3. 프론트엔드 구조

### 3.1 프론트엔드 아키텍처

```
frontend/src/
├── main.jsx                         # 앱 엔트리포인트
├── App.jsx                          # 라우팅 설정
├── Layout.jsx                       # 공통 레이아웃
│
├── pages/                           # 페이지 컴포넌트
│   ├── Home.jsx                     # 대시보드 (메인)
│   ├── Analytics.jsx                # 인사이트 분석
│   └── OnboardingService.jsx        # 온보딩 챗봇 페이지
│
├── components/                      # 재사용 컴포넌트
│   ├── onboarding/
│   │   ├── Sidebar.jsx              # 설정 사이드바
│   │   ├── ChatArea.jsx             # 채팅 영역
│   │   ├── ChatHistory.jsx          # 대화 기록
│   │   ├── MessageBubble.jsx        # 메시지 말풍선
│   │   └── DocumentManager.jsx      # 문서 관리 (Base44 연동)
│   ├── analytics/
│   │   ├── MetricCard.jsx           # 지표 카드
│   │   ├── TrendChart.jsx           # 트렌드 차트
│   │   └── InsightCard.jsx          # 인사이트 카드
│   └── ui/                          # shadcn/ui 컴포넌트
│
├── hooks/                           # 커스텀 훅
│   └── useOnboarding.js             # 온보딩 비즈니스 로직
│
└── api/                             # API 클라이언트
    ├── config.js                    # 환경 설정
    ├── client.js                    # Axios 인스턴스
    ├── onboarding.js                # 온보딩 API 함수
    ├── insight.js                   # 인사이트 API 함수
    └── index.js                     # 통합 export
```

---

### 3.2 프론트엔드 상세 설명

#### 📁 `/api` - API 계층

**1. config.js** - 환경 설정
```javascript
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';
export const defaultHeaders = {
  'Content-Type': 'application/json',
};
```

**2. client.js** - Axios 인스턴스
```javascript
import axios from 'axios';
import { SERVER_URL } from './config';

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
```

**3. onboarding.js** - 온보딩 API 함수들
```javascript
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

// 채팅
export const sendChatMessage = async (query, options = {}) => {
  return await onboardingApi.post('/chat', {
    query,
    top_k: options.top_k || 3,
    score_threshold: options.score_threshold || 0.0
  });
};

// 컬렉션 정보
export const getCollectionInfo = async () => {
  return await onboardingApi.get('/collection/info');
};
```

**4. index.js** - 통합 export
```javascript
// API 클라이언트 export
export { onboardingApi, insightApi } from './client';

// 온보딩 API 함수들 export
export * from './onboarding';

// 인사이트 API 함수들 export
export * from './insight';
```

---

#### 📁 `/hooks` - 비즈니스 로직

**useOnboarding.js** - 온보딩 상태 관리 및 로직

```javascript
import { useState } from 'react';
import { connectConfluence, getCategories, ... } from '../api';

export const useOnboarding = (props) => {
  // 로컬 상태
  const [formData, setFormData] = useState({ ... });
  const [loading, setLoading] = useState({});

  // Confluence 연결 함수
  const handleConfluenceConnect = async () => {
    setLoading(prev => ({ ...prev, confluence: true }));
    try {
      const response = await connectConfluence(formData);
      props.setConfluenceConnected(true);
      toast.success('연결 성공!');
    } catch (error) {
      toast.error('연결 실패');
    } finally {
      setLoading(prev => ({ ...prev, confluence: false }));
    }
  };

  // ... 기타 함수들

  return {
    formData, setFormData,
    loading,
    handleConfluenceConnect,
    handleLoadCategories,
    // ...
  };
};
```

---

#### 📁 `/pages` - 페이지 컴포넌트

**OnboardingService.jsx** - 메인 온보딩 페이지

```
┌─────────────────────────────────────────────────────┐
│  Header (제목, 상태 배지)                            │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  Sidebar     │  ChatArea                            │
│  (설정)      │  (채팅 영역)                          │
│              │                                      │
│  - Confluence│  - 메시지 표시                        │
│    연결      │  - 입력창                             │
│  - 카테고리  │  - FAQ 버튼                          │
│  - 임베딩    │                                      │
│  - 채팅 기록 │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

**주요 역할**:
- 전체 레이아웃 관리
- 상태 관리 (백엔드 연결, Confluence 설정 등)
- Sidebar와 ChatArea에 props 전달

---

#### 📁 `/components/onboarding`

**Sidebar.jsx** - 설정 사이드바

```
탭 1: 설정
├─ 백엔드 상태
├─ Confluence 연결
│  └─ URL, Email, Token, Space Key 입력
├─ 카테고리 선택
│  └─ 대분류/중분류 필터
└─ 임베딩 관리
   └─ 초기화, 문서 업로드

탭 2: 채팅 내역
└─ 저장된 대화 세션 목록
```

- `useOnboarding()` 훅 사용
- 모든 API 호출 로직 분리
- 로딩 상태 표시

**ChatArea.jsx** - 채팅 영역

```
빈 화면 (메시지 없음)
├─ 환영 메시지
└─ FAQ 버튼 (자주 묻는 질문)

채팅 중
├─ 메시지 목록 (MessageBubble)
├─ 로딩 인디케이터
└─ 입력창 + 전송 버튼
```

- 데모 모드 지원 (백엔드 없이 샘플 답변)
- 실시간 채팅 (비동기 API 호출)
- 자동 스크롤

**MessageBubble.jsx** - 메시지 말풍선

```
User Message:
┌─────────────────┐
│ 사용자 질문      │
│ (오른쪽 정렬)    │
└─────────────────┘

Assistant Message:
┌─────────────────┐
│ AI 답변         │
│ (왼쪽 정렬)      │
│                 │
│ 📎 출처:        │
│  - 문서 1       │
│  - 문서 2       │
└─────────────────┘
```

---

### 3.3 UI 컴포넌트 라이브러리

**shadcn/ui** - `/components/ui`

프로젝트에 포함된 재사용 가능한 UI 컴포넌트:
- `Button`, `Input`, `Textarea`
- `Select`, `Badge`, `Tabs`
- `Dialog`, `Alert`, `Toast`
- `Card`, `Accordion`, `Table`
- 등 60개 이상 컴포넌트

**스타일**: TailwindCSS 기반, 커스터마이징 가능

---

## 4. 데이터 흐름

### 4.1 온보딩 프로세스 전체 흐름

```
1️⃣ Confluence 연결
   프론트엔드 입력 → POST /onboarding/api/confluence/connect
   → Confluence API 호출 → 페이지 조회 성공/실패

2️⃣ 카테고리 추출
   버튼 클릭 → POST /onboarding/api/confluence/categories
   → 페이지 계층 구조 분석 → 카테고리 트리 반환

3️⃣ 페이지 필터링
   카테고리 선택 → POST /onboarding/api/confluence/filter-pages?level_1=XXX
   → 필터링된 page_ids 반환

4️⃣ 임베딩 초기화
   버튼 클릭 → POST /onboarding/api/embedding/initialize
   → Qdrant 컬렉션 생성 → Chatbot 준비 완료

5️⃣ 문서 임베딩
   페이지 선택 → POST /onboarding/api/embedding/embed-pages
   → Confluence에서 HTML 가져오기
   → 파싱 및 청크 분할
   → Upstage Embedding API 호출
   → Qdrant에 벡터 저장

6️⃣ 채팅
   질문 입력 → POST /onboarding/api/chat
   → Qdrant에서 유사 문서 검색 (Vector Search)
   → Solar LLM으로 답변 생성 (RAG)
   → 답변 + 출처 반환
```

---

### 4.2 프론트엔드 → 백엔드 호출 흐름

```
Component → Hook → API Function → Axios Client → Backend

예시:
Sidebar.jsx
  → useOnboarding.handleLoadCategories()
    → getCategories(config)
      → onboardingApi.post('/confluence/categories', config)
        → POST http://localhost:8000/onboarding/api/confluence/categories
          → backend/onboarding/main.py @app.post("/api/confluence/categories")
            → ConfluenceClient.get_pages_dataframe()
              → Confluence REST API 호출
```

---

## 5. 환경 설정

### 5.1 백엔드 환경변수

**파일**: `/backend/onboarding/.env`

```bash
# Upstage AI API
UPSTAGE_API_KEY=your_upstage_api_key

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key

# 외부 서버 프록시 (선택사항)
BACKEND41_BASE=http://192.168.123.41:8000
```

---

### 5.2 프론트엔드 환경변수

**파일**: `/frontend/.env`

```bash
# 백엔드 서버 주소
VITE_SERVER_URL=http://localhost:8000
```

**배포 환경 (실제 서버)**:
```bash
VITE_SERVER_URL=http://192.168.123.42:8000
```

---

### 5.3 Docker Compose 실행

```bash
# 컨테이너 빌드 및 실행
docker compose up -d

# 로그 확인
docker compose logs -f backend

# 중지
docker compose down
```

**접속 주소**:
- 프론트엔드: http://localhost:5173
- 백엔드: http://localhost:8000

---

## 6. 주요 기능별 사용 방법

### 6.1 Confluence 문서 임베딩

1. 프론트엔드 접속: http://192.168.123.42:5173
2. "온보딩 서비스" 클릭
3. Sidebar에서 Confluence 정보 입력:
   - Base URL: `https://your-domain.atlassian.net/wiki`
   - Email: `user@example.com`
   - API Token: (Atlassian에서 발급)
   - Space Key: `SPACE`
4. "Confluence 연결" 클릭
5. "카테고리 불러오기" 클릭
6. 원하는 카테고리 선택 후 "페이지 필터링"
7. "임베딩 초기화" 클릭
8. "선택한 페이지 임베딩" 클릭
9. 완료!

---

### 6.2 챗봇 사용

1. 임베딩 완료 후 채팅 영역에서 질문 입력
2. 예시 질문:
   - "연차는 어떻게 사용하나요?"
   - "재택근무 신청 방법이 궁금해요"
   - "건강검진은 언제 받나요?"
3. AI가 Confluence 문서 기반으로 답변
4. 답변 하단에 출처 문서 링크 표시

---

### 6.3 데모 모드

백엔드 없이 프론트엔드만 테스트하려면:
1. 프론트엔드 접속
2. "데모 모드로 체험하기" 버튼 클릭
3. 샘플 Q&A로 즉시 테스트 가능

---

## 7. 트러블슈팅

### 문제 1: API 호출 실패 (CORS 에러)

**증상**:
```
Access to fetch at 'http://localhost:8000' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**해결**:
- `backend/main.py`에서 CORS 설정 확인
- `allow_origins=["*"]`로 모든 origin 허용됨
- 백엔드가 실행 중인지 확인: `docker compose ps`

---

### 문제 2: Confluence 연결 실패 (403 Forbidden)

**증상**:
```
페이지 조회 실패: 403 Client Error: Forbidden
```

**해결**:
1. API 토큰이 유효한지 확인
2. 해당 Space에 읽기 권한이 있는지 확인
3. Space Key가 정확한지 확인
4. 새 API 토큰 생성: https://id.atlassian.com/manage-profile/security/api-tokens

---

### 문제 3: 임베딩 실패

**증상**:
```
초기화 실패: 환경변수가 설정되지 않았습니다
```

**해결**:
- `/backend/onboarding/.env` 파일 확인
- `UPSTAGE_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY` 설정
- Docker 컨테이너 재시작: `docker compose restart backend`

---

## 8. 추가 리소스

- **Confluence REST API 문서**: https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
- **Upstage API 문서**: https://developers.upstage.ai/
- **Qdrant 문서**: https://qdrant.tech/documentation/
- **FastAPI 문서**: https://fastapi.tiangolo.com/
- **React 문서**: https://react.dev/

---

## 9. 요약

| 항목 | 내용 |
|------|------|
| **백엔드 주소** | http://192.168.123.42:8000 |
| **프론트엔드 주소** | http://192.168.123.42:5173 |
| **API Base** | `/onboarding/api` |
| **주요 기술** | React, FastAPI, RAG, Vector DB |
| **배포 방식** | Docker Compose |

---

**문서 작성**: Claude Code
**최종 검증**: 2026-02-09 ✅
