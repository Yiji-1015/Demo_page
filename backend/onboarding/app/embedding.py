"""
임베딩 및 Elasticsearch 관리 모듈 (사내 임베딩 서버 BGE-M3 연동 버전)
- 데이터 정의서 표준화: 불필요한 필드(text, created_at) 제거 및 타입 안정화
"""

import os
import requests
from typing import List, Dict, Any
from datetime import datetime
from elasticsearch import Elasticsearch, helpers
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class EmbeddingManager:
    def __init__(
        self,
        embedding_api_url: str,
        elasticsearch_url: str,
        elasticsearch_user: str = None,
        elasticsearch_password: str = None,
        index_name: str = "confluence_docs"
    ):
        self.index_name = index_name
        self.embedding_api_url = embedding_api_url

        print(f"🔒 [보안점검] ES 접속 시도 URL: {elasticsearch_url}")
        print(f"🔗 [연결점검] 임베딩 API URL: {self.embedding_api_url}")

        es_config = {
            "hosts": [elasticsearch_url],
            "verify_certs": False,         
            "ssl_show_warn": False,        
            "request_timeout": 60
        }
        
        if elasticsearch_user and elasticsearch_password:
            es_config["basic_auth"] = (elasticsearch_user, elasticsearch_password)

        self.es_client = Elasticsearch(**es_config)

        try:
            info = self.es_client.info()
            print(f"✅ Elasticsearch 연결 성공! (버전: {info['version']['number']})")
        except Exception as e:
            print(f"❌ Elasticsearch 연결 실패 (초기화 중): {e}")

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=3000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )
    
    def embedding(self, text: str) -> List[float]:
        try:
            response = requests.post(
                self.embedding_api_url,
                json={"input": text},
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            response.raise_for_status()
            return response.json()['data'][0]['embedding']
        except Exception as e:
            print(f"❌ 임베딩 생성 실패: {e}")
            return []

    def embedding_batch(self, texts: List[str]) -> List[List[float]]:
        try:
            print(f" 🧠 {len(texts)}개 텍스트 청크를 사내 임베딩 API로 전송 중...")
            response = requests.post(
                self.embedding_api_url,
                json={"input": texts},
                headers={"Content-Type": "application/json"},
                timeout=60
            )
            response.raise_for_status()
            data = response.json()['data']
            sorted_data = sorted(data, key=lambda x: x['index'])
            return [item['embedding'] for item in sorted_data]
        except Exception as e:
            print(f"❌ 대량 임베딩 생성 실패 (폴백 가동): {e}")
            return [self.embedding(t) for t in texts]

    def ensure_collection_exists(self):
        if self.es_client.indices.exists(index=self.index_name):
            return

        # 🌟 데이터 정의서 100% 반영: page_id는 keyword로, 불필요한 필드는 제외
        mapping_body = {
             "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "analysis": {
                    "analyzer": {
                        "nori_analyzer": {
                            "tokenizer": "nori_tokenizer"
                        }
                    }
                }
            },
            "mappings": {
                "properties": {
                    "chunk_id": { "type": "integer" },
                    "content": {
                        "type": "text",
                        "analyzer": "nori_analyzer",
                        "fields": {
                            "keyword": { "type": "keyword", "ignore_above": 256 }
                        }
                    },
                    "doc_id": { "type": "keyword" },
                    "embedding": {
                        "type": "dense_vector",
                        "dims": 1024,  
                        "index": True,
                        "similarity": "cosine",
                        "index_options": {
                            "type": "int8_hnsw",
                            "m": 16,
                            "ef_construction": 100
                        }
                    },
                    "page_id": { "type": "keyword" }, # 🌟 keyword로 변경
                    "primary_contributor": { "type": "keyword" },
                    "source": { "type": "keyword" },
                    "space": { "type": "keyword" },
                    "tags": { "type": "keyword" },
                    "title": {
                        "type": "text",
                        "analyzer": "nori_analyzer",
                        "fields": {
                            "keyword": { "type": "keyword" }
                        }
                    },
                    "updated_at": { "type": "date" },
                    "url": { "type": "keyword" }
                }
            }
        }

        try:
            self.es_client.indices.create(index=self.index_name, body=mapping_body)
            print(f"📦 인덱스 '{self.index_name}' 생성 완료 (차원: 1024, 표준화 버전)")
        except Exception as e:
            print(f"❌ 인덱스 생성 오류: {e}")

    def is_page_indexed(self, page_id: str) -> bool:
        if not self.es_client.indices.exists(index=self.index_name):
            return False
        try:
            query = {"term": {"page_id": str(page_id)}} # 🌟 keyword이므로 .keyword 생략
            res = self.es_client.count(index=self.index_name, query=query)
            return res['count'] > 0
        except Exception as e:
            print(f"⚠️ 페이지 확인 중 오류: {e}")
            return False

    def delete_page_vectors(self, page_id: str):
        if not self.es_client.indices.exists(index=self.index_name):
            return
        try:
            query = {"term": {"page_id": str(page_id)}}
            self.es_client.delete_by_query(index=self.index_name, query=query, refresh=True)
        except Exception as e:
            print(f" ⚠️ 삭제 중 오류 (무시 가능): {e}")

    def create_documents(self, titles, page_ids, contents, base_url, spaces=None, updated_ats=None, primary_contributors=None) -> List[Document]:
        documents = []
        if not spaces: spaces = ["UNKNOWN"] * len(titles)
        if not updated_ats: updated_ats = [datetime.now().isoformat()] * len(titles)
        if not primary_contributors: primary_contributors = ["알 수 없음"] * len(titles)

        for title, page_id, content, space, updated_at, contributor in zip(titles, page_ids, contents, spaces, updated_ats, primary_contributors):
            if not content or not content.strip():
                continue

            clean_base_url = base_url.rstrip('/')
            final_url = f"{clean_base_url}/spaces/{space}/pages/{page_id}"

            metadata = {
                "title": title,
                "page_id": str(page_id),
                "source": "confluence",
                "url": final_url,
                "space": space,
                "updated_at": updated_at,
                "primary_contributor": contributor 
            }
            
            doc = Document(page_content=content, metadata=metadata)
            documents.append(doc)
        return documents

    def chunk_documents(self, documents: List[Document]) -> List[Document]:
            split_docs = self.text_splitter.split_documents(documents)
            for doc in split_docs:
                title = doc.metadata.get("title", "제목 없음")
                doc.page_content = f"[문서 제목: {title}]\n{doc.page_content}"
                
            print(f"✂️ 청킹 완료! 문서 {len(documents)}개 → 청크 {len(split_docs)}개 (제목 병합 완료!)")
            return split_docs

    def upsert_multiple_pages(
        self,
        page_ids: List[str],
        titles: List[str],
        contents: List[str],
        base_url: str,
        spaces: List[str] = None,
        updated_ats: List[str] = None,
        primary_contributors: List[str] = None,
        batch_size: int = 50,
        force_update: bool = False
    ):
        target_indices = []
        skipped_count = 0

        print(f"🧐 중복 문서 확인 중... (총 {len(page_ids)}개)")

        for i, pid in enumerate(page_ids):
            if not force_update and self.is_page_indexed(pid):
                skipped_count += 1
                continue
            target_indices.append(i)

        if skipped_count > 0:
            print(f"⏩ {skipped_count}개 문서는 이미 최신 상태라 건너뛰었습니다.")

        if not target_indices:
            print("🎉 모든 문서가 이미 임베딩되어 있습니다!")
            return

        print(f"🚀 {len(target_indices)}개 신규 문서 임베딩 시작...")

        t_page_ids = [page_ids[i] for i in target_indices]
        t_titles = [titles[i] for i in target_indices]
        t_contents = [contents[i] for i in target_indices]
        t_spaces = [spaces[i] for i in target_indices] if spaces else None
        t_updated_ats = [updated_ats[i] for i in target_indices] if updated_ats else None
        t_contributors = [primary_contributors[i] for i in target_indices] if primary_contributors else None

        for pid in t_page_ids:
            self.delete_page_vectors(pid)

        documents = self.create_documents(
            t_titles, t_page_ids, t_contents, base_url, t_spaces, 
            t_updated_ats, t_contributors
        )
        split_docs = self.chunk_documents(documents)

        total_chunks = len(split_docs)
        if total_chunks == 0:
            return

        page_chunk_counts = {}
        for doc in split_docs:
            pid = doc.metadata["page_id"]
            if pid not in page_chunk_counts:
                page_chunk_counts[pid] = 0
            doc.metadata["chunk_id"] = page_chunk_counts[pid]
            page_chunk_counts[pid] += 1

        print(f"📦 총 {total_chunks}개 청크를 {batch_size}개씩 묶어서 API로 전송합니다!")

        for i in range(0, total_chunks, batch_size):
            batch_docs = split_docs[i : i + batch_size]
            batch_texts = [doc.page_content for doc in batch_docs]
            
            batch_vectors = self.embedding_batch(batch_texts)

            actions = []
            for doc, vector in zip(batch_docs, batch_vectors):
                pid = doc.metadata["page_id"]
                cid = doc.metadata["chunk_id"]
                
                # 🌟 데이터 정의서 100% 매칭! (text, created_at 필드 삭제)
                action = {
                    "_index": self.index_name,
                    "_id": f"{pid}_{cid}",
                    "_source": {
                        "doc_id": f"{pid}_{cid}",
                        "chunk_id": cid,
                        "page_id": str(pid),
                        "title": doc.metadata.get("title"),
                        "space": doc.metadata.get("space", "UNKNOWN"),
                        "url": doc.metadata.get("url"),
                        "source": doc.metadata.get("source"),
                        "content": doc.page_content,
                        "embedding": vector,
                        "updated_at": doc.metadata.get("updated_at"),
                        "primary_contributor": doc.metadata.get("primary_contributor"),
                        "tags": []
                    }
                }
                actions.append(action)

            if actions:
                try:
                    helpers.bulk(self.es_client, actions, stats_only=True)
                    print(f" ✅ {i+1} ~ {min(i+batch_size, total_chunks)} 번째 청크 DB 저장 완료")
                except Exception as e:
                    print(f"❌ Bulk 업로드 실패: {e}")

        print("🎉 모든 임베딩 및 DB 저장 완료!")


# =====================================================================
# 🚀 리얼 Confluence 문서 연동 (트리 순회 알고리즘 적용 - 누락 방지!)
# =====================================================================
if __name__ == "__main__":
    import requests
    from requests.auth import HTTPBasicAuth
    from bs4 import BeautifulSoup
    from datetime import datetime
    import os
    
    try:
        from confluence_api import ConfluenceClient
    except ImportError:
        try:
            from app.confluence_api import ConfluenceClient
        except ImportError:
            print("⚠️ ConfluenceClient 모듈을 찾을 수 없어 스크립트를 종료합니다.")
            exit(1)


    EMBEDDING_API_URL = os.getenv("EMBEDDING_API_URL")
    ES_URL = os.getenv("ELASTICSEARCH_URL", "http://192.168.123.42:9200")
    ES_USER = os.getenv("ELASTICSEARCH_USER", "elastic")
    ES_PASSWORD = os.getenv("ELASTICSEARCH_PASSWORD")

    CONFLUENCE_BASE_URL = os.getenv("CONFLUENCE_URL")
    CONFLUENCE_EMAIL = os.getenv("CONFLUENCE_EMAIL")
    CONFLUENCE_API_TOKEN = os.getenv("CONFLUENCE_API_TOKEN")
    TARGET_SPACE_KEY = os.getenv("CONFLUENCE_SPACE_KEY", "LLOYDK")
    TARGET_CATEGORY = "LLOYDK에 오신 걸 환영합니다!"

    if not all([EMBEDDING_API_URL, CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN]):
        print("❌ .env 파일에서 정보를 불러오지 못했습니다. (EMBEDDING_API_URL 확인 필요)")
        exit(1)

    client = ConfluenceClient(CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN)

    def fetch_tree_pages(base_url, email, api_token, space_key, root_title):
        auth = HTTPBasicAuth(email, api_token)
        base_api_url = f"{base_url.rstrip('/')}/rest/api/content"
        domain = base_url.split('/wiki')[0] 

        # 🌟 created_ats 리스트 완전 삭제
        page_ids, titles, contents, updated_ats, primary_contributors = [], [], [], [], []

        def safe_date(date_str):
            """연도가 잘리는 버그 방지용 안전 함수"""
            if not date_str: return datetime.now().isoformat()
            # 만약 025- 처럼 맨 앞 2가 잘려있다면 복구
            if date_str.startswith("025-"): 
                return "2" + date_str
            return date_str

        print(f"🔍 루트 카테고리 '{root_title}' 검색 중...")
        res = requests.get(base_api_url, params={"spaceKey": space_key, "title": root_title, "expand": "body.storage,version,history"}, auth=auth)
        
        if res.status_code != 200 or not res.json().get("results"):
            print("❌ 루트 페이지를 찾을 수 없습니다.")
            return [], [], [], [], []

        root_page = res.json()["results"][0]
        root_id = root_page["id"]
        print(f"✅ 루트 페이지 ID: {root_id}")

        if "body" in root_page and "storage" in root_page["body"]:
            page_ids.append(root_id)
            titles.append(root_page["title"])
            html_content = root_page["body"]["storage"]["value"]
            contents.append(BeautifulSoup(html_content, "html.parser").get_text(separator=" ", strip=True))
            
            # 🌟 created_at 수집 삭제, updated_at 포맷 안전 처리
            raw_date = root_page.get("version", {}).get("when", "")
            updated_ats.append(safe_date(raw_date))
            primary_contributors.append(client.get_primary_contributor(root_id))

        def fetch_children(parent_id):
            url = f"{base_api_url}/{parent_id}/child/page"
            params = {"expand": "body.storage,version,history", "limit": 100}

            while url:
                resp = requests.get(url, params=params, auth=auth)
                if resp.status_code != 200:
                    break
                data = resp.json()
                pages = data.get("results", [])

                for page in pages:
                    if "body" in page and "storage" in page["body"]:
                        page_id = page["id"]
                        page_ids.append(page_id)
                        titles.append(page["title"])
                        html = page["body"]["storage"]["value"]
                        contents.append(BeautifulSoup(html, "html.parser").get_text(separator=" ", strip=True))
                        
                        raw_date = page.get("version", {}).get("when", "")
                        updated_ats.append(safe_date(raw_date))
                        primary_contributors.append(client.get_primary_contributor(page_id))
                    
                    fetch_children(page["id"])

                if "_links" in data and "next" in data["_links"]:
                    url = domain + data["_links"]["next"]
                    params = {} 
                else:
                    url = None

        print("📡 트리 구조를 따라 모든 하위 문서를 순회하며 싹쓸이 수집합니다...")
        fetch_children(root_id)
        
        print(f"✅ 트리 순회 완료! 꼼꼼하게 총 {len(page_ids)}개의 문서를 찾아냈습니다.")
        return page_ids, titles, contents, updated_ats, primary_contributors

    manager = EmbeddingManager(
        embedding_api_url=EMBEDDING_API_URL,
        elasticsearch_url=ES_URL,
        elasticsearch_user=ES_USER,
        elasticsearch_password=ES_PASSWORD
    )
    
    manager.ensure_collection_exists()

    real_ids, real_titles, real_contents, real_dates, real_contributors = fetch_tree_pages(
        base_url=CONFLUENCE_BASE_URL,
        email=CONFLUENCE_EMAIL,
        api_token=CONFLUENCE_API_TOKEN,
        space_key=TARGET_SPACE_KEY,
        root_title=TARGET_CATEGORY
    )

    if real_ids:
        print("--------------------------------------------------")
        print(f"🚀 [TEST] 수집된 {len(real_ids)}개 문서 임베딩 시작...")
        print("--------------------------------------------------")
        
        spaces = [TARGET_SPACE_KEY] * len(real_ids)

        manager.upsert_multiple_pages(
            page_ids=real_ids,
            titles=real_titles,
            contents=real_contents,
            base_url=CONFLUENCE_BASE_URL,
            spaces=spaces,
            updated_ats=real_dates,
            primary_contributors=real_contributors,
            force_update=True 
        )
        print("--------------------------------------------------")
        print("🎉 사내 임베딩 및 Graph DB용 메타데이터 연동 완료!")