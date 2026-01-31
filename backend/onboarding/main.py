"""
Confluence 챗봇 FastAPI 백엔드 서버
"""

import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import asyncio
import json

from .app.parser import parse_storage_html 
from .app.chatbot import ConfluenceChatbot
from .app.embedding import EmbeddingManager
from .app.confluence_api import ConfluenceClient


# 환경변수 로드
load_dotenv()

app = FastAPI(
    title="Confluence Chatbot API",
    description="Confluence 문서 기반 RAG 챗봇 API",
    version="1.0.0"
)


origins = [
    "http://localhost:5173",       # 개발자 PC (로컬 테스트용)
    "http://192.168.123.42:5173",  # ★ 중요: 실제 프론트엔드 서버 주소
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 글로벌 변수 (세션 저장용)
confluence_client: Optional[ConfluenceClient] = None
embedding_manager: Optional[EmbeddingManager] = None
chatbot: Optional[ConfluenceChatbot] = None


# ==================== Request Models ====================

class ConfluenceConfig(BaseModel):
    """Confluence 설정"""
    base_url: str
    email: str
    api_token: str
    space_key: str


class EmbeddingRequest(BaseModel):
    """임베딩 요청"""
    page_ids: List[str]
    collection_name: Optional[str] = "confluence_docs"


class ChatRequest(BaseModel):
    """채팅 요청"""
    query: str
    top_k: Optional[int] = 3
    score_threshold: Optional[float] = 0.0


# ==================== API Endpoints ====================

@app.get("/")
async def health_check():
    """온보딩 모듈 상태 확인 (http://localhost:8000/onboarding/ 접속 시 호출)"""
    return {
        "status": "onboarding module is running",
        "module": "onboarding"
    }


@app.post("/api/confluence/connect")
async def connect_confluence(config: ConfluenceConfig):
    """Confluence 연결"""
    global confluence_client

    try:
        print(f"🔗 Confluence 연결 시도...")
        print(f"   Base URL: {config.base_url}")
        
        confluence_client = ConfluenceClient(
            base_url=config.base_url,
            email=config.email,
            api_token=config.api_token
        )

        print(f"📡 페이지 조회 중...")
        test_pages = confluence_client.get_pages_with_category(config.space_key)

        print(f"✅ 성공! {len(test_pages)}개 페이지 발견")
        return {
            "status": "success",
            "message": f"Confluence 연결 성공! (총 {len(test_pages)}개 페이지)",
            "page_count": len(test_pages)
        }
    except Exception as e:
        print(f"❌ Confluence 연결 실패: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Confluence 연결 실패: {str(e)}")


@app.post("/api/confluence/categories")
async def get_categories(config: ConfluenceConfig):
    """카테고리 조회"""
    try:
        client = ConfluenceClient(
            base_url=config.base_url,
            email=config.email,
            api_token=config.api_token
        )

        df = client.get_pages_dataframe(config.space_key)

        categories = {}
        level_cols = [col for col in df.columns if col.startswith("level_")]

        for col in level_cols:
            categories[col] = sorted(df[col].dropna().unique().tolist())

        pages = df[['id', 'title', 'path']].to_dict('records')

        if 'level_1' in df.columns and 'level_2' in df.columns:
            grouped = df.groupby(['level_1', 'level_2']).size().to_dict()
            category_tree = {}
            for (l1, l2), count in grouped.items():
                if l1 not in category_tree:
                    category_tree[l1] = {}
                if l2:
                    category_tree[l1][l2] = count
        else:
            category_tree = {}

        return {
            "status": "success",
            "categories": categories,
            "category_tree": category_tree,
            "pages": pages,
            "total_pages": len(pages)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"카테고리 조회 실패: {str(e)}")


@app.post("/api/confluence/filter-pages")
async def filter_pages(config: ConfluenceConfig, filters: Dict[str, str]):
    """페이지 필터링"""
    try:
        client = ConfluenceClient(
            base_url=config.base_url,
            email=config.email,
            api_token=config.api_token
        )

        page_ids = client.filter_pages_by_category(config.space_key, filters)

        return {
            "status": "success",
            "page_ids": page_ids,
            "count": len(page_ids),
            "filters": filters
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"페이지 필터링 실패: {str(e)}")


@app.post("/api/embedding/initialize")
async def initialize_embedding():
    """임베딩 초기화"""
    global embedding_manager, chatbot

    try:
        upstage_api_key = os.getenv("UPSTAGE_API_KEY")
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")

        if not all([upstage_api_key, qdrant_url, qdrant_api_key]):
            raise ValueError("환경변수가 설정되지 않았습니다. (.env 파일 확인)")

        embedding_manager = EmbeddingManager(
            upstage_api_key=upstage_api_key,
            qdrant_url=qdrant_url,
            qdrant_api_key=qdrant_api_key
        )
        embedding_manager.ensure_collection_exists()

        chatbot = ConfluenceChatbot(
            upstage_api_key=upstage_api_key,
            qdrant_url=qdrant_url,
            qdrant_api_key=qdrant_api_key
        )

        info = embedding_manager.get_collection_info()

        return {
            "status": "success",
            "message": "임베딩 매니저 및 챗봇 초기화 완료",
            "collection_info": info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"초기화 실패: {str(e)}")


@app.post("/api/embedding/embed-pages")
async def embed_pages(config: ConfluenceConfig, request: EmbeddingRequest):
    """페이지 임베딩"""
    global embedding_manager

    if not embedding_manager:
        raise HTTPException(status_code=400, detail="임베딩 매니저가 초기화되지 않았습니다.")

    try:
        client = ConfluenceClient(
            base_url=config.base_url,
            email=config.email,
            api_token=config.api_token
        )

        titles = []
        contents = []
        valid_page_ids = []

        for page_id in request.page_ids:
            page_data = client.get_page_content(page_id)
            if page_data:
                # ✅ 수정: 이제 parse_storage_html이 임포트 되어서 에러 안 납니다!
                parsed = parse_storage_html(
                    page_id,
                    page_data['html'],
                    client.get_child_pages
                )

                if parsed['combined_text'].strip():
                    titles.append(page_data['title'])
                    contents.append(parsed['combined_text'])
                    valid_page_ids.append(page_id)

        if not valid_page_ids:
            return {
                "status": "error",
                "message": "유효한 페이지가 없습니다."
            }

        embedding_manager.upsert_multiple_pages(
            page_ids=valid_page_ids,
            titles=titles,
            contents=contents,
            base_url=config.base_url
        )

        return {
            "status": "success",
            "message": f"{len(valid_page_ids)}개 페이지 임베딩 완료",
            "embedded_pages": len(valid_page_ids)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"임베딩 실패: {str(e)}")


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """질문하기"""
    global chatbot

    if not chatbot:
        raise HTTPException(status_code=400, detail="챗봇이 초기화되지 않았습니다.")

    try:
        result = chatbot.ask(
            query=request.query,
            top_k=request.top_k,
            score_threshold=request.score_threshold,
            verbose=False
        )

        return {
            "status": "success",
            "answer": result["answer"],
            "sources": result["sources"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"챗봇 응답 실패: {str(e)}")


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """스트리밍 응답"""
    global chatbot

    if not chatbot:
        raise HTTPException(status_code=400, detail="챗봇이 초기화되지 않았습니다.")

    async def generate():
        try:
            for chunk in chatbot.ask_streaming(
                query=request.query,
                top_k=request.top_k,
                score_threshold=request.score_threshold
            ):
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.01)
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/api/collection/info")
async def get_collection_info():
    """컬렉션 정보 조회"""
    global embedding_manager

    if not embedding_manager:
        raise HTTPException(status_code=400, detail="임베딩 매니저가 초기화되지 않았습니다.")

    try:
        info = embedding_manager.get_collection_info()
        return {
            "status": "success",
            "collection_info": info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"컬렉션 정보 조회 실패: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)