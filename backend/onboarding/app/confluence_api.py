"""
Confluence API 관련 기능 모듈
- 카테고리 조회
- 페이지 목록 가져오기
- 하위 페이지 조회
"""

import requests
import pandas as pd
from typing import List, Dict, Any, Optional


class ConfluenceClient:
    """Confluence API 클라이언트"""

    def __init__(self, base_url: str, email: str, api_token: str):
        """
        Args:
            base_url: Confluence 위키 베이스 URL (예: https://your-domain.atlassian.net/wiki)
            email: 사용자 이메일
            api_token: API 토큰
        """
        self.base_url = base_url.rstrip('/')
        self.email = email
        self.api_token = api_token
        self.auth = (email, api_token)
        self.headers = {"Accept": "application/json"}

    def get_pages_with_category(self, space_key: str) -> List[Dict[str, str]]:
        """
        Space의 모든 페이지를 카테고리(경로) 정보와 함께 가져옵니다.

        Args:
            space_key: Confluence Space 키 (예: "LLOYDK")

        Returns:
            페이지 정보 리스트 [{"id": "...", "title": "...", "path": "..."}, ...]
        """
        page_infos = []
        start = 0
        limit = 200

        while True:
            url = f"{self.base_url}/rest/api/content"
            params = {
                "spaceKey": space_key,
                "type": "page",
                "limit": limit,
                "start": start,
                "expand": "ancestors",
            }

            try:
                r = requests.get(url, auth=self.auth, headers=self.headers, params=params)
                r.raise_for_status()
                data = r.json()
            except Exception as e:
                print(f"페이지 조회 실패: {e}")
                break

            results = data.get("results", [])
            if not results:
                break

            for p in results:
                ancestors = p.get("ancestors", [])
                titles = [a["title"] for a in ancestors] + [p["title"]]
                path = " / ".join(titles)

                page_infos.append({
                    "id": p["id"],
                    "title": p["title"],
                    "path": path,
                })

            if "_links" in data and "next" in data["_links"]:
                start += limit
            else:
                break

        return page_infos

    def get_pages_dataframe(self, space_key: str) -> pd.DataFrame:
        """
        페이지 정보를 DataFrame으로 변환하여 계층 구조를 분석합니다.

        Args:
            space_key: Confluence Space 키

        Returns:
            계층 구조가 포함된 DataFrame
        """
        pages = self.get_pages_with_category(space_key)
        df = pd.DataFrame(pages)

        if df.empty:
            return df

        def split_path(path: str) -> List[str]:
            return [p.strip() for p in path.split("/") if p.strip()]

        df["parts"] = df["path"].apply(split_path)

        max_level = df["parts"].apply(len).max()

        for i in range(max_level):
            df[f"level_{i}"] = df["parts"].apply(
                lambda x, i=i: x[i] if len(x) > i else None
            )

        df = df.drop(columns=["parts"])

        cols = [c for c in df.columns if c != "path"] + ["path"]
        df = df[cols]

        return df

    def get_categories(self, space_key: str) -> Dict[str, List[str]]:
        """
        Space의 카테고리 계층 구조를 반환합니다.

        Args:
            space_key: Confluence Space 키

        Returns:
            {"level_1": [...], "level_2": [...], ...} 형태의 카테고리 딕셔너리
        """
        df = self.get_pages_dataframe(space_key)

        if df.empty:
            return {}

        categories = {}
        level_cols = [col for col in df.columns if col.startswith("level_")]

        for col in level_cols:
            unique_values = df[col].dropna().unique().tolist()
            categories[col] = sorted(unique_values)

        return categories

    def get_child_pages(self, page_id: str) -> List[Dict[str, str]]:
        """
        특정 페이지의 하위(Child) 페이지 목록을 조회합니다.

        Args:
            page_id: 상위 페이지 ID

        Returns:
            [{"title": "...", "id": "..."}, ...]
        """
        url = f"{self.base_url}/rest/api/content/{page_id}/child/page"
        params = {"limit": 100}

        try:
            response = requests.get(url, auth=self.auth, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()

            children: List[Dict[str, str]] = []
            for item in data.get("results", []):
                children.append({
                    "title": item.get("title", ""),
                    "id": item.get("id", ""),
                })
            return children
        except Exception as e:
            print(f"하위 페이지 조회 실패: {e}")
            return []

    def get_page_content(self, page_id: str) -> Optional[Dict[str, Any]]:
        """
        특정 페이지의 내용을 가져옵니다.

        Args:
            page_id: 페이지 ID

        Returns:
            {"title": "...", "html": "...", "id": "..."}
        """
        url = f"{self.base_url}/rest/api/content/{page_id}?expand=body.storage"

        try:
            response = requests.get(url, auth=self.auth, headers=self.headers)
            response.raise_for_status()
            data = response.json()

            return {
                "id": data["id"],
                "title": data["title"],
                "html": data["body"]["storage"]["value"]
            }
        except Exception as e:
            print(f"페이지 내용 조회 실패 (ID: {page_id}): {e}")
            return None

    def filter_pages_by_category(
        self,
        space_key: str,
        filters: Dict[str, str]
    ) -> List[int]:
        """
        카테고리 필터를 적용하여 페이지 ID 목록을 반환합니다.

        Args:
            space_key: Confluence Space 키
            filters: {"level_1": "...", "level_2": "...", ...} 형태의 필터

        Returns:
            필터링된 페이지 ID 리스트
        """
        df = self.get_pages_dataframe(space_key)

        if df.empty:
            return []

        filtered = df
        for level, value in filters.items():
            if level in df.columns:
                filtered = filtered[filtered[level] == value]

        return filtered['id'].astype(int).tolist()
