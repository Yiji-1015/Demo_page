"""
RAG 챗봇 및 검색 모듈
- Qdrant 벡터 검색
- LLM 기반 답변 생성
- 출처 인용
"""

from typing import List, Dict, Any
from openai import OpenAI
from qdrant_client import QdrantClient
from langchain_upstage import ChatUpstage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser


class ConfluenceChatbot:
    """Confluence RAG 챗봇 클래스"""

    def __init__(
        self,
        upstage_api_key: str,
        qdrant_url: str,
        qdrant_api_key: str,
        collection_name: str = "confluence_docs",
        llm_model: str = "solar-pro"
    ):
        """
        Args:
            upstage_api_key: Upstage API 키
            qdrant_url: Qdrant 클라우드 URL
            qdrant_api_key: Qdrant API 키
            collection_name: Qdrant 컬렉션 이름
            llm_model: 사용할 LLM 모델 (solar-pro, solar-mini 등)
        """
        self.collection_name = collection_name

        # Upstage 임베딩 클라이언트
        self.client_upstage = OpenAI(
            api_key=upstage_api_key,
            base_url="https://api.upstage.ai/v1"
        )

        # Qdrant 클라이언트
        self.client_qdrant = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key
        )

        # LLM 모델
        self.llm = ChatUpstage(
            model=llm_model,
            api_key=upstage_api_key
        )

        # 프롬프트 템플릿
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", """
            당신은 사내 위키(Confluence) 정보를 바탕으로 직원의 질문에 답변하는 친절한 AI 어시스턴트입니다.

            반드시 아래 제공된 [Context]에 있는 내용만을 바탕으로 답변하세요.
            만약 [Context]에 정답이 없다면 솔직하게 "제공된 문서에서 관련 정보를 찾을 수 없습니다."라고 말하세요.
            거짓 정보를 지어내지 마세요.

            답변은 명확하고 구체적으로 작성하며, 필요하다면 번호나 불릿 포인트를 사용하세요.

            [Context]
            {context}
            """),
            ("human", "{question}"),
        ])

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

    def search_documents(
            self,
            query: str,
            top_k: int = 3,
            score_threshold: float = 0.0
        ) -> List[Dict[str, Any]]:
            """질문과 유사한 문서를 Qdrant에서 검색하고 링크를 보정합니다."""
            print(f"🔍 검색어: '{query}'")

            query_vector = self.embedding(query)

            search_result = self.client_qdrant.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=top_k,
                with_payload=True,
                score_threshold=score_threshold
            )

            hits = search_result.points
            results = []
            
            for hit in hits:
                score = hit.score
                payload = hit.payload

                # --- 🔗 [긴급 수정] 링크 보정 로직 시작 ---
                raw_url = payload.get('source', '')
                page_id = payload.get('page_id', 'Unknown')
                space_key = payload.get('space_key', 'LLOYDK') # 기본값 설정

                # 1. 공백 제거 및 기본 도메인 추출 (예: lloydk.atlassian.net/wiki)
                if raw_url:
                    # 슬래시가 겹치거나 프로토콜이 빠진 경우를 대비해 도메인 부분만 정제
                    base_domain = raw_url.split('/pages/')[0].rstrip('/')
                    if not base_domain.startswith('http'):
                        base_domain = f'https://{base_domain}'
                    
                    # 2. 요청하신 표준 형식으로 재조합
                    # 형식: https://도메인/spaces/공간키/pages/페이지ID
                    sanitized_url = f"{base_domain}/spaces/{space_key}/pages/{page_id}"
                else:
                    sanitized_url = "#" # 링크가 없을 경우
                # --- 🔗 링크 보정 로직 끝 ---

                results.append({
                    "score": score,
                    "title": payload.get('title', '제목 없음'),
                    "content": payload.get('page_content', ''),
                    "page_id": page_id,
                    "source": sanitized_url,  # 보정된 URL로 교체
                    "url": sanitized_url      # 프론트엔드용 필드
                })

            return results

    def format_documents(self, docs: List[Dict[str, Any]]) -> str:
        """
        검색된 문서 리스트를 하나의 Context 문자열로 합칩니다.

        Args:
            docs: 검색 결과 리스트

        Returns:
            Context 문자열
        """
        context_text = ""
        for i, doc in enumerate(docs):
            context_text += f"[문서 {i+1}]: {doc['title']}\n"
            context_text += f"{doc['content']}\n"
            context_text += "-" * 20 + "\n"

        return context_text

    def ask(
        self,
        query: str,
        top_k: int = 3,
        score_threshold: float = 0.0,
        verbose: bool = True
    ) -> Dict[str, Any]:
        """
        질문에 대한 답변을 생성합니다.

        Args:
            query: 사용자 질문
            top_k: 검색할 문서 개수
            score_threshold: 최소 유사도 점수
            verbose: 상세 출력 여부

        Returns:
            {
                "answer": "답변 텍스트",
                "sources": [검색된 문서 리스트]
            }
        """
        # 1. 문서 검색
        retrieved_docs = self.search_documents(query, top_k, score_threshold)

        if not retrieved_docs:
            return {
                "answer": "죄송합니다. 관련 문서를 찾지 못했습니다.",
                "sources": []
            }

        # 2. Context 생성
        context_str = self.format_documents(retrieved_docs)

        # 3. LLM으로 답변 생성
        chain = self.prompt_template | self.llm | StrOutputParser()

        answer = chain.invoke({
            "context": context_str,
            "question": query
        })

        # 4. 결과 출력 (verbose)
        if verbose:
            print("\n" + "="*50)
            print("🤖 AI 답변:")
            print(answer)
            print("="*50)

            print("\n📚 참고한 문서:")
            for doc in retrieved_docs:
                print(f"- {doc['title']} (유사도: {doc['score']:.2f})")
                print(f"  링크: {doc['source']}")

        return {
            "answer": answer,
            "sources": retrieved_docs
        }

    def ask_streaming(
        self,
        query: str,
        top_k: int = 3,
        score_threshold: float = 0.0
    ):
        """
        질문에 대한 답변을 스트리밍으로 생성합니다.

        Args:
            query: 사용자 질문
            top_k: 검색할 문서 개수
            score_threshold: 최소 유사도 점수

        Yields:
            답변 청크 및 출처 정보
        """
        # 1. 문서 검색
        retrieved_docs = self.search_documents(query, top_k, score_threshold)

        if not retrieved_docs:
            yield {
                "type": "answer",
                "content": "죄송합니다. 관련 문서를 찾지 못했습니다."
            }
            yield {
                "type": "sources",
                "content": []
            }
            return

        # 2. Context 생성
        context_str = self.format_documents(retrieved_docs)

        # 3. LLM으로 스트리밍 답변 생성
        chain = self.prompt_template | self.llm

        for chunk in chain.stream({
            "context": context_str,
            "question": query
        }):
            yield {
                "type": "answer",
                "content": chunk.content
            }

        # 4. 출처 정보 전송
        yield {
            "type": "sources",
            "content": retrieved_docs
        }