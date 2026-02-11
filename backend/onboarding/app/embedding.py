"""
임베딩 및 Qdrant 벡터 DB 관리 모듈 (중복 방지 기능 강화)
"""

import os
import uuid
from typing import List, Dict, Any
from openai import OpenAI
from qdrant_client import QdrantClient, models
from qdrant_client.models import Distance, VectorParams
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

class EmbeddingManager:
    """임베딩 및 벡터 DB 관리 클래스"""

    def __init__(
        self,
        upstage_api_key: str,
        qdrant_url: str,
        qdrant_api_key: str,
        collection_name: str = "confluence_docs"
    ):
        self.collection_name = collection_name

        # Upstage 클라이언트
        self.client_upstage = OpenAI(
            api_key=upstage_api_key,
            base_url="https://api.upstage.ai/v1"
        )

        # Qdrant 클라이언트
        self.client_qdrant = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key
        )

        # 텍스트 분할기
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=3000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )

    def embedding(self, text: str) -> List[float]:
        response = self.client_upstage.embeddings.create(
            input=text,
            model="embedding-query"
        )
        return response.data[0].embedding

    def embedding_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        response = self.client_upstage.embeddings.create(
            input=texts,
            model="embedding-query"
        )
        return [data.embedding for data in response.data]

    def ensure_collection_exists(self):
        """Qdrant 컬렉션 및 인덱스 보장 (중요!)"""
        # 1. 컬렉션이 없으면 생성
        if not self.client_qdrant.collection_exists(collection_name=self.collection_name):
            self.client_qdrant.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=4096, # Upstage Solar Embedding 차원 수
                    distance=Distance.COSINE
                ),
            )
            print(f"📦 Qdrant 컬렉션 '{self.collection_name}' 신규 생성 완료")
        else:
            print(f"📦 Qdrant 컬렉션 '{self.collection_name}'이 이미 존재합니다.")

        # 2. 🚨 필수: 컬렉션이 있든 없든 인덱스는 반드시 확인/생성해야 함
        try:
            self.client_qdrant.create_payload_index(
                collection_name=self.collection_name,
                field_name="page_id",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
            print(f"🔍 page_id 인덱스 생성(또는 확인) 완료")
        except Exception as e:
            # 이미 인덱스가 있으면 에러가 날 수 있으므로 무시 (정상)
            pass

    def get_collection_info(self) -> Dict[str, Any]:
        try:
            collection_info = self.client_qdrant.get_collection(self.collection_name)
            return {
                "collection_name": self.collection_name,
                "points_count": collection_info.points_count,
                "status": collection_info.status,
            }
        except Exception as e:
            return {"error": str(e)}

    # ✅ [핵심] 이미 저장된 페이지인지 확인하는 함수
    def is_page_indexed(self, page_id: str) -> bool:
        """
        특정 page_id가 이미 DB에 존재하는지 확인합니다.
        """
        try:
            # page_id를 반드시 문자열로 변환하여 검색 (매우 중요!)
            target_id = str(page_id)
            
            count_result = self.client_qdrant.count(
                collection_name=self.collection_name,
                count_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="page_id",
                            match=models.MatchValue(value=target_id)
                        )
                    ]
                )
            )
            
            # 디버깅용 로그 (필요시 주석 해제)
            # if count_result.count > 0:
            #     print(f"   🧐 ID {target_id}는 이미 존재합니다.")
            
            return count_result.count > 0
            
        except Exception as e:
            print(f"⚠️ 페이지 확인 중 오류: {e}")
            return False

    def create_documents(self, titles, page_ids, contents, base_url) -> List[Document]:
        documents = []
        for title, page_id, content in zip(titles, page_ids, contents):
            if not content or not content.strip():
                continue

            doc = Document(
                page_content=content,
                metadata={
                    "title": title,
                    "page_id": str(page_id),
                    "source": f"{base_url}/pages/{page_id}"
                }
            )
            documents.append(doc)
        return documents

    def chunk_documents(self, documents: List[Document]) -> List[Document]:
        split_docs = self.text_splitter.split_documents(documents)
        print(f"✂️ 청킹 완료! 문서 {len(documents)}개 → 청크 {len(split_docs)}개")
        return split_docs

    def delete_page_vectors(self, page_id: str):
        try:
            self.client_qdrant.delete(
                collection_name=self.collection_name,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="page_id",
                                match=models.MatchValue(value=str(page_id))
                            )
                        ]
                    )
                )
            )
            # print(f"   🗑️  페이지 {page_id} 기존 데이터 삭제 완료")
        except Exception as e:
            print(f"   ⚠️  삭제 중 경고: {e}")

    def upsert_documents(self, page_id: str, documents: List[Document], batch_size: int = 32):
        # 기존 데이터 삭제 (업데이트 시 중복 방지)
        self.delete_page_vectors(page_id)

        total_docs = len(documents)
        print(f"🔄 [Upsert] Page {page_id}: {total_docs}개 청크 업로드 시작")

        for i in range(0, total_docs, batch_size):
            batch_docs = documents[i : i + batch_size]
            batch_texts = [doc.page_content for doc in batch_docs]
            
            # 임베딩 생성
            batch_vectors = self.embedding_batch(batch_texts)

            points = []
            for doc, vector in zip(batch_docs, batch_vectors):
                payload = doc.metadata.copy()
                payload["page_content"] = doc.page_content
                
                points.append(models.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload=payload
                ))

            if points:
                self.client_qdrant.upload_points(
                    collection_name=self.collection_name,
                    points=points
                )
        print(f"   ✅ Page {page_id} 업로드 완료")

    # ✅ [핵심 로직] 이미 있는 문서는 건너뛰고, 없는 것만 처리
    def upsert_multiple_pages(
        self,
        page_ids: List[str],
        titles: List[str],
        contents: List[str],
        base_url: str,
        batch_size: int = 32,
        force_update: bool = False # 강제 업데이트 옵션
    ):
        """
        여러 페이지를 임베딩합니다. (기존에 없는 페이지만 처리)
        """
        target_page_ids = []
        target_titles = []
        target_contents = []
        skipped_count = 0

        print(f"🧐 중복 문서 확인 중... (총 {len(page_ids)}개)")

        for pid, title, content in zip(page_ids, titles, contents):
            # 1. 강제 업데이트가 아니고
            # 2. 이미 DB에 존재한다면 -> 건너뛰기
            if not force_update and self.is_page_indexed(pid):
                skipped_count += 1
                continue
            
            # 3. 없는 문서만 리스트에 추가
            target_page_ids.append(pid)
            target_titles.append(title)
            target_contents.append(content)

        if skipped_count > 0:
            print(f"⏩ {skipped_count}개 문서는 이미 최신 상태라 건너뛰었습니다.")

        # 4. 처리할 문서가 하나도 없으면 바로 종료
        if not target_page_ids:
            print("🎉 모든 문서가 이미 임베딩되어 있습니다! (작업 없음)")
            return

        print(f"🚀 {len(target_page_ids)}개 신규 문서 임베딩 시작...")

        # 5. 여기서부터는 신규 문서만 처리됨
        documents = self.create_documents(target_titles, target_page_ids, target_contents, base_url)
        split_docs = self.chunk_documents(documents)

        # 그룹화
        page_docs_map = {}
        for doc in split_docs:
            pid = doc.metadata["page_id"]
            if pid not in page_docs_map:
                page_docs_map[pid] = []
            page_docs_map[pid].append(doc)

        # 업로드 실행
        for pid, docs in page_docs_map.items():
            self.upsert_documents(pid, docs, batch_size)