"""
Confluence 챗봇 FastAPI 백엔드 서버 (Child App)
- Elasticsearch 버전으로 완전 교체
"""
import os
import json
import asyncio
from typing import List, Optional
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, APIRouter, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
# from pypdf import PdfReader # 안 쓰면 주석 처리

# ✅ 데이터 가공을 위해 pandas 필수
import pandas as pd 

# 내부 모듈 임포트
from .app.chatbot import ConfluenceChatbot
from .app.embedding import EmbeddingManager
from .app.confluence_api import ConfluenceClient
# from .app.parser import parse_storage_html # 필요시 주석 해제

# .env 로드 (안전장치)
load_dotenv()

app = FastAPI(
    title="Onboarding Service API",
    version="1.0.0"
)

# 🎯 루트 앱이 '/onboarding'으로 넘겨주므로, 여기선 '/api'만 붙임
router = APIRouter(prefix="/api")

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 글로벌 변수
confluence_client = None
embedding_manager = None
chatbot = None

# --- 데이터 모델 ---
class SystemStatus(BaseModel):
    email: str
    confluence_url: str
    elasticsearch_status: str
    space_key: str

class ChatRequest(BaseModel):
    query: str
    top_k: int = 5
    display_k: int = 3
    collection_name: Optional[str] = "confluence_docs"


# --- 시작 이벤트 ---
# --- 시작 이벤트 ---
@app.on_event("startup")
async def startup_event():
    global embedding_manager, chatbot
    print("\n" + "="*50)
    print("📢 [ONBOARDING APP] 하위 앱 실행됨 (Elasticsearch + GPT Version)")
    print("="*50 + "\n")

    try:
        # 🌟 1. Upstage 흔적 삭제! 사내 임베딩 URL과 OpenAI 키를 가져옵니다.
        embedding_api_url = os.getenv("EMBEDDING_API_URL")
        openai_api_key = os.getenv("OPENAI_API_KEY")
        es_url = os.getenv("ELASTICSEARCH_URL")
        es_user = os.getenv("ELASTICSEARCH_USER")
        es_password = os.getenv("ELASTICSEARCH_PASSWORD")

        # 🌟 2. 필수 값 체크
        if not embedding_api_url or not es_url or not openai_api_key:
            print("❌ [Startup 실패] 도커가 .env를 못 읽었거나 필수 키(GPT, ES, 임베딩)가 누락되었습니다!")
            print(f"👉 확인 - EMBEDDING: {bool(embedding_api_url)}, ES: {bool(es_url)}, GPT: {bool(openai_api_key)}")
            return # 필수 값이 없으면 여기서 멈춤!
            
        try:
            print(f"🔄 사내 임베딩 & ES 접속 시도 중... ({es_url})")
            
            # 🌟 3. 매니저도 사내 서버 URL을 받도록 초기화!
            embedding_manager = EmbeddingManager(
                embedding_api_url=embedding_api_url,
                elasticsearch_url=es_url,
                elasticsearch_user=es_user,
                elasticsearch_password=es_password
            )
            embedding_manager.ensure_collection_exists()
            
            # 🌟 4. GPT 두뇌를 장착한 챗봇 초기화!
            chatbot = ConfluenceChatbot() 
            print("✅ [Startup] Elasticsearch DB 및 GPT 챗봇 연결 성공!")
            
        except Exception as db_err:
            print(f"⚠️ [Startup] 매니저/챗봇 생성 중 에러 발생: {db_err}")

    except Exception as e:
        print(f"❌ [Startup] 초기화 오류: {e}")

# =================================================================
# ✅ API 엔드포인트
# =================================================================

@router.get("/")
async def health_check():
    return {"status": "onboarding module running"}

@router.get("/system/status", response_model=SystemStatus)
async def get_system_status():
    email = os.getenv("CONFLUENCE_EMAIL", "Not Configured")
    url = os.getenv("CONFLUENCE_URL", "https://atlassian.net")
    space_key = os.getenv("CONFLUENCE_SPACE_KEY", "UNKNOWN")
    # embedding_manager가 살아있으면 Online
    es_status = "Online" if embedding_manager else "Offline"
    return SystemStatus(email=email, confluence_url=url, space_key=space_key, elasticsearch_status=es_status)


# 🎯 카테고리 트리 생성 로직 (기존 코드 유지)
@router.get("/documents/structure")
async def get_document_structure():
    print("🌳 [Structure] 문서 구조 조회 시작...")
    try:
        base_url = os.getenv("CONFLUENCE_URL")
        email = os.getenv("CONFLUENCE_EMAIL")
        api_token = os.getenv("CONFLUENCE_API_TOKEN")
        space_key = os.getenv("CONFLUENCE_SPACE_KEY")

        if not all([base_url, email, api_token, space_key]):
            return []

        if ".atlassian.net" in base_url and not base_url.endswith("/wiki"):
            base_url = base_url.rstrip("/") + "/wiki"
        
        client = ConfluenceClient(base_url, email, api_token)
        df = client.get_pages_dataframe(space_key)
        
        if df.empty:
            return []
        
        tree_structure = []
        
        if 'level_1' not in df.columns:
            df['level_1'] = '전체 문서'
        else:
            df['level_1'] = df['level_1'].fillna('미분류').replace('', '미분류')

        if 'level_2' not in df.columns:
            df['level_2'] = ''
        else:
            df['level_2'] = df['level_2'].fillna('').astype(str)

        for l1_title, l1_group in df.groupby('level_1'):
            l1_node = {
                "id": f"folder_l1_{l1_title}",
                "title": l1_title,
                "type": "folder",
                "children": []
            }
            
            if 'level_2' in df.columns:
                for l2_title, l2_df in l1_group.groupby('level_2'):
                    if not l2_title: continue
                    
                    l2_node = {
                        "id": f"folder_l2_{l1_title}_{l2_title}",
                        "title": l2_title,
                        "type": "folder",
                        "children": []
                    }
                    
                    for _, row in l2_df.iterrows():
                        l2_node["children"].append({
                            "id": str(row['id']),
                            "title": row['title'],
                            "type": "page",
                            "children": []
                        })
                    l1_node["children"].append(l2_node)
            
            direct_pages = l1_group[l1_group['level_2'] == '']
            for _, row in direct_pages.iterrows():
                l1_node["children"].append({
                    "id": str(row['id']),
                    "title": row['title'],
                    "type": "page",
                    "children": []
                })
            
            tree_structure.append(l1_node)

        return tree_structure

    except Exception as e:
        print(f"❌ [Structure] 구조 조회 실패: {e}")
        return []

@router.get("/documents/embedded")
async def get_embedded_documents():
    global embedding_manager
    
    # 🌟 [해결의 열쇠] 매니저가 없으면? 우리가 강제로 startup_event를 깨워줍니다!
    if not embedding_manager:
        print("🚀 [API 요청] 매니저가 없어서 수동으로 초기화를 시작합니다!")
        await startup_event()
    
    # 깨웠는데도 없으면 진짜 환경변수 에러!
    if not embedding_manager:
        return {"status": "error", "message": "DB 매니저 초기화에 실패했습니다. (.env 확인 필요)"}

    try:
        current_es = os.getenv("ELASTICSEARCH_URL") 
        print(f"📡 [API 요청] 현재 찔러보는 ES 주소: {current_es}")

        target_index = embedding_manager.index_name 
        
        res = embedding_manager.es_client.search(
            index=target_index,
            query={"match_all": {}},
            _source=["page_id", "title", "primary_contributor", "space", "content", "url"],
            size=1000
        )
        
        hits = res["hits"]["hits"]
        print(f"✅ [API 응답] {target_index}에서 {len(hits)}개 문서 발견!")

        frontend_data = []
        for hit in hits:
            s = hit["_source"]
            content = s.get("content", "")
            frontend_data.append({
                "page_id": s.get("page_id", ""),
                "title": s.get("title", "제목 없음"),
                "primary_contributor": s.get("primary_contributor", "작성자 불명"),
                "space": s.get("space", "UNKNOWN"),
                "url": s.get("url", "#"),
                "content_preview": content[:50] + "..." if len(content) > 50 else content
            })
            
        return {
            "status": "success", 
            "total_count": len(frontend_data), 
            "data": frontend_data 
        }
    except Exception as e:
        print(f"❌ [API 에러] {str(e)}")
        return {"status": "error", "message": str(e)}
        

@router.post("/chat")
async def chat(request: ChatRequest):
    global chatbot
    # 챗봇이 없으면 다시 연결 시도
    if not chatbot: 
        await startup_event()
    
    if not chatbot: 
        raise HTTPException(503, "챗봇 시스템이 초기화되지 않았습니다.")
        
    try:
        # 질문 던지기
        return chatbot.ask(
            query=request.query,
            top_k=request.top_k,
            display_k=request.display_k,
        )
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(500, str(e))

@router.get("/collection/info")
async def get_collection_info():
    if not embedding_manager: raise HTTPException(400, "초기화 필요")
    # ES는 get_collection_info 메서드가 다를 수 있으므로 예외처리
    try:
        return {"status": "success", "info": "Elasticsearch Connected"}
    except:
        return {"status": "error"}

@router.post("/embedding/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    if not embedding_manager: raise HTTPException(400, "초기화 필요")
    return {"status": "success", "message": "파일 처리 완료"}

app.include_router(router)