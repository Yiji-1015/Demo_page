"""
Confluence 챗봇 FastAPI 백엔드 서버
"""

import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Query
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
from fastapi import UploadFile, File
import io
from pypdf import PdfReader

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




# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


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


class EmbedPagesRequest(BaseModel):
    """페이지 임베딩 통합 요청"""
    base_url: str
    email: str
    api_token: str
    space_key: str
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
async def filter_pages(
    config: ConfluenceConfig,
    level_1: Optional[str] = Query(None),
    level_2: Optional[str] = Query(None),
    level_3: Optional[str] = Query(None),
    level_4: Optional[str] = Query(None)
):
    """페이지 필터링"""
    try:
        client = ConfluenceClient(
            base_url=config.base_url,
            email=config.email,
            api_token=config.api_token
        )

        # 쿼리 파라미터를 dict로 변환
        filters = {}
        if level_1:
            filters['level_1'] = level_1
        if level_2:
            filters['level_2'] = level_2
        if level_3:
            filters['level_3'] = level_3
        if level_4:
            filters['level_4'] = level_4

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
async def embed_pages(request: EmbedPagesRequest):
    global embedding_manager
    if not embedding_manager:
        raise HTTPException(status_code=400, detail="초기화 필요")

    try:
        # =========================================================
        # 1. [스마트 건너뛰기] DB에 없는 문서만 골라내기
        # =========================================================
        ids_to_process = []
        skipped_count = 0
        
        print(f"\n🧐 [중복 검사 시작] 요청된 {len(request.page_ids)}개 문서 확인 중...")

        for pid in request.page_ids:
            # page_id를 문자열로 변환하여 조회 (필수!)
            if embedding_manager.is_page_indexed(str(pid)):
                skipped_count += 1
                # print(f"  ⏭️ Skip: {pid} (이미 있음)") # 로그 너무 길면 주석처리
            else:
                ids_to_process.append(pid)

        print(f"📊 [검사 결과] 전체: {len(request.page_ids)} | 통과(Skip): {skipped_count} | 작업 대상: {len(ids_to_process)}")

        # 작업할 게 없으면 여기서 바로 종료! (Confluence 접속 안 함)
        if not ids_to_process:
            print("🎉 모든 문서가 최신 상태입니다! (0초 컷)")
            return {
                "status": "success",
                "message": f"모든 문서({skipped_count}개)가 이미 학습되어 있습니다.",
                "embedded_pages": 0,
                "skipped_pages": skipped_count
            }

        # =========================================================
        # 2. [다운로드] 없는 문서만 Confluence에서 가져오기
        # =========================================================
        print(f"🚀 신규 문서 {len(ids_to_process)}개 다운로드 및 학습 시작...")
        
        client = ConfluenceClient(
            base_url=request.base_url,
            email=request.email,
            api_token=request.api_token
        )

        titles = []
        contents = []
        valid_page_ids = []

        for idx, page_id in enumerate(ids_to_process, 1):
            print(f"   📥 [{idx}/{len(ids_to_process)}] 다운로드 중... (ID: {page_id})")
            page_data = client.get_page_content(page_id)
            
            if page_data:
                # HTML 파싱
                parsed = parse_storage_html(
                    page_id,
                    page_data['html'],
                    client.get_child_pages
                )

                if parsed['combined_text'].strip():
                    titles.append(page_data['title'])
                    contents.append(parsed['combined_text'])
                    valid_page_ids.append(page_id)
                else:
                    print(f"   ⚠️ 내용 없음 (Skip)")
            else:
                print(f"   ❌ 다운로드 실패")

        # =========================================================
        # 3. [저장] 벡터 DB에 업로드
        # =========================================================
        if valid_page_ids:
            # force_update=True: 이미 위에서 걸러냈으니 여기서는 무조건 저장
            embedding_manager.upsert_multiple_pages(
                page_ids=valid_page_ids,
                titles=titles,
                contents=contents,
                base_url=request.base_url,
                force_update=True 
            )

        return {
            "status": "success",
            "message": f"작업 완료: 신규 {len(valid_page_ids)}개 학습, {skipped_count}개 건너뜀",
            "embedded_pages": len(valid_page_ids),
            "skipped_pages": skipped_count
        }

    except Exception as e:
        print(f"❌ 에러 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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

@app.post("/api/embedding/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """파일 업로드 및 임베딩 (PDF, TXT 지원)"""
    global embedding_manager
    if not embedding_manager:
        raise HTTPException(status_code=400, detail="초기화 필요")

    try:
        titles = []
        contents = []
        file_ids = [] # page_id 대신 파일명 사용
        
        print(f"📂 파일 {len(files)}개 업로드 처리 시작...")

        for file in files:
            content = ""
            filename = file.filename
            print(f"   📄 읽는 중: {filename}")

            # 1. 파일 내용 읽기
            file_bytes = await file.read()

            # 2. 확장자에 따른 파싱 (Loader)
            if filename.lower().endswith('.pdf'):
                # PDF 파싱
                try:
                    pdf = PdfReader(io.BytesIO(file_bytes))
                    for page in pdf.pages:
                        content += page.extract_text() + "\n"
                except Exception as e:
                    print(f"   ❌ PDF 읽기 실패 ({filename}): {e}")
                    continue

            elif filename.lower().endswith('.txt') or filename.lower().endswith('.md'):
                # 텍스트 파일 파싱
                try:
                    content = file_bytes.decode('utf-8')
                except:
                    content = file_bytes.decode('cp949', errors='ignore') # 한글 인코딩 대응
            
            else:
                print(f"   ⚠️ 지원하지 않는 형식 (Skip): {filename}")
                continue

            # 3. 내용이 있으면 리스트에 추가
            if content.strip():
                titles.append(filename)
                contents.append(content)
                file_ids.append(f"FILE_{filename}") # ID 충돌 방지용 접두사
            else:
                print(f"   ⚠️ 내용 없음: {filename}")

        # 4. 벡터 DB 저장 (Confluence와 동일한 로직 사용)
        if file_ids:
            # 기존 upsert_multiple_pages 함수 재사용
            # base_url은 파일이므로 'local_file'로 대체
            embedding_manager.upsert_multiple_pages(
                page_ids=file_ids,
                titles=titles,
                contents=contents,
                base_url="local_file", 
                force_update=True
            )

        return {
            "status": "success",
            "message": f"파일 {len(file_ids)}개 학습 완료",
            "embedded_files": len(file_ids)
        }

    except Exception as e:
        print(f"❌ 업로드 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)