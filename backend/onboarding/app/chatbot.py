"""
RAG 챗봇 및 검색 모듈 (Docker Native & OpenAI GPT 버전)
- 사내 임베딩 서버 연동 (1024차원)
- LLM 기반 답변 생성 (OpenAI GPT)
"""

import os
from typing import List, Dict, Any
from langchain_openai import ChatOpenAI  # 🌟 Upstage 대신 OpenAI 로드!
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from .embedding import EmbeddingManager

class ConfluenceChatbot:
    def __init__(self):
        # 1. 환경변수 로드
        self.embedding_api_url = os.getenv("EMBEDDING_API_URL")
        self.openai_api_key = os.getenv("OPENAI_API_KEY") 
        self.es_url = os.getenv("ELASTICSEARCH_URL")
        self.es_user = os.getenv("ELASTICSEARCH_USER")
        self.es_password = os.getenv("ELASTICSEARCH_PASSWORD")
        
        self.index_name = os.getenv("ES_INDEX_NAME", "confluence_docs") 
        # LLM 모델 기본값을 GPT로 변경
        self.llm_model = os.getenv("LLM_MODEL_NAME", "gpt-4o-mini") 
        self.confluence_base_url = os.getenv("CONFLUENCE_URL")
        self.default_space_key = os.getenv("CONFLUENCE_SPACE_KEY")

        if not all([self.embedding_api_url, self.es_url, self.openai_api_key]):
            print("⚠️ [경고] 필수 환경변수(OPENAI_API_KEY 등)가 누락되었습니다!")

        # 2. EmbeddingManager 초기화 (사내 모델)
        self.em = EmbeddingManager(
            embedding_api_url=self.embedding_api_url,
            elasticsearch_url=self.es_url,
            elasticsearch_user=self.es_user,
            elasticsearch_password=self.es_password,
            index_name=self.index_name
        )

        # 3. LLM 모델 설정 (🌟 GPT로 교체 완료!)
        self.llm = ChatOpenAI(
            model=self.llm_model,
            api_key=self.openai_api_key,
            temperature=0.0  # RAG 시스템이므로 상상력(환각)을 억제하기 위해 0으로 세팅
        )

        # 4. 프롬프트 템플릿 (더 유연하고 친절하게 수정)
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", """
            당신은 로이드케이 사내 위키 정보를 바탕으로 직원의 질문에 답변하는 전문가 어시스턴트입니다.

            [지침]
            1. 제공된 [Context]를 꼼꼼히 읽고, 사용자의 질문에 가장 적합한 내용을 요약하여 답변하세요.
            2. 문서에 '체크리스트'라는 단어가 명시되지 않았더라도, '절차', '할 일', '주요 내용' 등이 있다면 이를 바탕으로 체크리스트를 만들어 답변해 주세요.
            3. 답변은 읽기 좋게 불릿 포인트나 번호를 사용하세요.
            4. 최대한 답변하려고 노력하세요.

            [Context]
            {context}
            """),
            ("human", "{question}"),
        ])
        
        print(f"🤖 챗봇 초기화 완료 (Index: {self.index_name} | Model: {self.llm_model})")

    def search_documents(
        self,
        query: str,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        print(f"🔍 검색어: '{query}'")

        query_vector = self.em.embedding(query)
        if not query_vector:
            return []

# 🌟 하이브리드 검색 쿼리 (벡터 3 : BM25 2)
        search_body = {
            "size": top_k,
            "knn": {
                "field": "embedding",
                "query_vector": query_vector,
                "k": top_k,
                "num_candidates": 100,
                "boost": 3.0  
            },
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["title^2", "content"],
                    "analyzer": "nori_analyzer", 
                    "boost": 2.0  
                }
            },
            # 🌟 수정 1: updated_at 확실하게 포함!
            "_source": [
                "title", "content", "page_id", "source", 
                "space", "url", "primary_contributor", "tags", "updated_at" 
            ]
        }

        try:
            response = self.em.es_client.search(
                index=self.index_name,
                body=search_body
            )
            
            hits = response['hits']['hits']
            results = []

            for hit in hits:
                score = hit['_score']
                payload = hit['_source']

                page_id = payload.get('page_id', '')
                space_key = payload.get('space') or self.default_space_key

                sanitized_url = ""
                if self.confluence_base_url and page_id and space_key:
                    base_url = self.confluence_base_url.rstrip('/')
                    sanitized_url = f"{base_url}/spaces/{space_key}/pages/{page_id}"
                else:
                    sanitized_url = payload.get('url', '#')

                main_content = payload.get('content', payload.get('text', '내용 없음'))

                # 🌟 수정 2: 프론트엔드로 전달할 데이터
                results.append({
                    "score": score,
                    "title": payload.get('title', '제목 없음'),
                    "content": main_content, 
                    "page_id": page_id,
                    "source": sanitized_url,
                    "url": sanitized_url,
                    "updated_at": payload.get('updated_at', ''),                  # 👈 추가!
                    "primary_contributor": payload.get('primary_contributor', ''),# 👈 추가!
                    "tags": payload.get('tags', [])                               # 👈 추가!
                })
            
            return results

        except Exception as e:
            print(f"❌ 검색 중 오류 발생: {e}")
            return []

    def format_documents(self, docs: List[Dict[str, Any]]) -> str:
        context_text = ""
        for i, doc in enumerate(docs):
            context_text += f"[문서 {i+1}]: {doc['title']}\n{doc['content']}\n" + "-" * 20 + "\n"
        return context_text

    def ask(self, query: str, top_k: int = 5, display_k: int = 3, verbose: bool = True) -> Dict[str, Any]:
        # 1. DB에서 5개(top_k)를 긁어옵니다.
        retrieved_docs = self.search_documents(query, top_k)

        if not retrieved_docs:
            return {"answer": "죄송합니다. 관련 문서를 찾지 못했습니다.", "sources": []}

        # 2. GPT에게는 5개 전부를 컨텍스트로 던져줍니다! (최대한 똑똑하게 대답하도록)
        context_str = self.format_documents(retrieved_docs)
        if verbose:
            print("\n" + "!"*50)
            print(f"🔍 [DEBUG] GPT가 읽고 있는 컨텍스트 내용 ({len(retrieved_docs)}개):")
            print(context_str)
            print("!"*50 + "\n")
        
        chain = self.prompt_template | self.llm | StrOutputParser()
        answer = chain.invoke({"context": context_str, "question": query})

        # 3. 🌟 핵심! 프론트엔드에 내려줄 때는 점수가 제일 높은 상위 display_k개만 자릅니다.
        display_docs = retrieved_docs[:display_k]

        if verbose:
            print("\n📎 검색된 문서 전체(로그용):")
            for i, doc in enumerate(retrieved_docs):
                print(f"- [{i+1}/{len(retrieved_docs)}] {doc.get('title','제목 없음')} ({doc.get('url','')}) score={doc.get('score','')}")

            print("\n🤖 AI 답변:\n" + answer + f"\n📚 참고 문서 (프론트 노출용 {len(display_docs)}개):")
            for doc in display_docs:
                print(f"- {doc['title']} ({doc['url']})")

        # 4. 프론트엔드로는 잘라낸 3개만 전달!
        return {"answer": answer, "sources": display_docs}