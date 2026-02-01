"""
임베딩 및 Qdrant 벡터 DB 관리 모듈
- 문서 청킹
- 임베딩 생성
- Qdrant 업로드/삭제
"""

import os
import uuid
from typing import List, Dict, Any, Callable
from openai import OpenAI
from qdrant_client import QdrantClient, models
from qdrant_client.models import Distance, VectorParams, PointStruct
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
        """
        Args:
            upstage_api_key: Upstage API 키
            qdrant_url: Qdrant 클라우드 URL
            qdrant_api_key: Qdrant API 키
            collection_name: Qdrant 컬렉션 이름
        """
        self.collection_name = collection_name

        # Upstage 클라이언트 초기화
        self.client_upstage = OpenAI(
            api_key=upstage_api_key,
            base_url="https://api.upstage.ai/v1"
        )

        # Qdrant 클라이언트 초기화
        self.client_qdrant = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key
        )

        # 텍스트 분할기 초기화
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=3000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )

    def embedding(self, text: str) -> List[float]:
        """
        텍스트를 임베딩 벡터로 변환합니다.

        Args:
            text: 임베딩할 텍스트

        Returns:
            4096 차원의 임베딩 벡터
        """
        response = self.client_upstage.embeddings.create(
            input=text,
            model="embedding-query"
        )
        return response.data[0].embedding

    def embedding_batch(self, texts: List[str]) -> List[List[float]]:
        """
        여러 텍스트를 한 번에 임베딩 벡터로 변환합니다. (배치 처리)

        Args:
            texts: 임베딩할 텍스트 리스트

        Returns:
            임베딩 벡터 리스트
        """
        if not texts:
            return []

        response = self.client_upstage.embeddings.create(
            input=texts,
            model="embedding-query"
        )
        return [data.embedding for data in response.data]

    def ensure_collection_exists(self):
        """Qdrant 컬렉션이 없으면 생성합니다."""
        if not self.client_qdrant.collection_exists(collection_name=self.collection_name):
            self.client_qdrant.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=4096,
                    distance=Distance.COSINE
                ),
            )
            print(f"📦 Qdrant 컬렉션 '{self.collection_name}' 생성 완료")

            # page_id 인덱스 생성
            try:
                self.client_qdrant.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="page_id",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
                print(f"🔍 page_id 인덱스 생성 완료")
            except Exception as e:
                print(f"⚠️ 인덱스 생성 중 경고: {e}")
        else:
            print(f"📦 Qdrant 컬렉션 '{self.collection_name}'이 이미 존재합니다.")

    def get_collection_info(self) -> Dict[str, Any]:
        """컬렉션 정보를 조회합니다."""
        try:
            collection_info = self.client_qdrant.get_collection(self.collection_name)
            return {
                "collection_name": self.collection_name,
                "points_count": collection_info.points_count,
                "status": collection_info.status,
            }
        except Exception as e:
            return {"error": str(e)}

    def create_documents(
        self,
        titles: List[str],
        page_ids: List[str],
        contents: List[str],
        base_url: str
    ) -> List[Document]:
        """
        제목, ID, 본문을 Document 객체로 포장합니다.

        Args:
            titles: 페이지 제목 리스트
            page_ids: 페이지 ID 리스트
            contents: 페이지 본문 리스트
            base_url: Confluence 베이스 URL

        Returns:
            Document 객체 리스트
        """
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
        """
        문서를 청크로 분할합니다.

        Args:
            documents: Document 객체 리스트

        Returns:
            분할된 Document 객체 리스트
        """
        split_docs = self.text_splitter.split_documents(documents)
        print(f"✂️ 청킹 완료! 총 {len(documents)}개 문서 → {len(split_docs)}개 청크")
        return split_docs

    def delete_page_vectors(self, page_id: str):
        """
        특정 페이지의 벡터를 모두 삭제합니다.

        Args:
            page_id: 삭제할 페이지 ID
        """
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
            print(f"   🗑️  페이지 {page_id}의 기존 데이터 삭제 완료")
        except Exception as e:
            print(f"   ⚠️  삭제 중 경고: {e}")

    def upsert_documents(
        self,
        page_id: str,
        documents: List[Document],
        batch_size: int = 32
    ):
        """
        문서를 Qdrant에 업로드합니다. (기존 데이터 삭제 후 새로 추가)

        Args:
            page_id: 페이지 ID (같은 페이지의 기존 데이터 삭제용)
            documents: Document 객체 리스트
            batch_size: 배치 크기
        """
        print(f"🔄 [Upsert] Page ID: {page_id} 작업 시작...")

        # 1. 기존 데이터 삭제
        self.delete_page_vectors(page_id)

        # 2. 배치 처리로 임베딩 및 업로드
        total_docs = len(documents)
        print(f"   🧠 배치 처리 시작 (총 {total_docs}개 청크)")

        for i in range(0, total_docs, batch_size):
            batch_docs = documents[i : i + batch_size]
            batch_texts = [doc.page_content for doc in batch_docs]

            # 진행 상황 표시
            progress = min(i + batch_size, total_docs)
            print(f"   ⏳ 진행 중: {progress}/{total_docs} ({int(progress/total_docs*100)}%)")

            # ✅ 배치 임베딩으로 한 번에 처리 (속도 향상!)
            batch_vectors = self.embedding_batch(batch_texts)

            # PointStruct 생성
            points = []
            for doc, vector in zip(batch_docs, batch_vectors):
                payload = doc.metadata.copy()
                payload["page_content"] = doc.page_content
                payload["page_id"] = str(page_id)

                points.append(models.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload=payload
                ))

            # Qdrant 업로드
            if points:
                self.client_qdrant.upload_points(
                    collection_name=self.collection_name,
                    points=points
                )
                print(f"     ✅ {min(i + batch_size, total_docs)} / {total_docs} 처리 완료")

        print(f"   🎉 모든 업로드 완료!")

    def upsert_multiple_pages(
        self,
        page_ids: List[str],
        titles: List[str],
        contents: List[str],
        base_url: str,
        batch_size: int = 32
    ):
        """
        여러 페이지를 한번에 임베딩하고 업로드합니다.

        Args:
            page_ids: 페이지 ID 리스트
            titles: 페이지 제목 리스트
            contents: 페이지 본문 리스트
            base_url: Confluence 베이스 URL
            batch_size: 배치 크기
        """
        # 1. Document 객체 생성
        documents = self.create_documents(titles, page_ids, contents, base_url)

        if not documents:
            print("⚠️ 임베딩할 문서가 없습니다.")
            return

        # 2. 청킹
        split_docs = self.chunk_documents(documents)

        # 3. 페이지별로 그룹화하여 업로드
        page_docs_map: Dict[str, List[Document]] = {}
        for doc in split_docs:
            pid = doc.metadata["page_id"]
            if pid not in page_docs_map:
                page_docs_map[pid] = []
            page_docs_map[pid].append(doc)

        # 4. 각 페이지별로 upsert
        for pid, docs in page_docs_map.items():
            self.upsert_documents(pid, docs, batch_size)
