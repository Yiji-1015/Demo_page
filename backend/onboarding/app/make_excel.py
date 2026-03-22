import pandas as pd
import os

def create_data_definition_excel():
    # 1. 엑셀에 들어갈 데이터 정의서 내용 (딕셔너리 리스트 형태)
    data = [
        {"필드명": "doc_id", "ES 데이터 타입": "keyword", "Python 타입": "str", "설명 및 용도": "청크(Chunk) 단위 고유 ID", "데이터 예시": "23953680_0"},
        {"필드명": "chunk_id", "ES 데이터 타입": "integer", "Python 타입": "int", "설명 및 용도": "긴 문서를 쪼갰을 때의 청크 순번", "데이터 예시": "0"},
        {"필드명": "page_id", "ES 데이터 타입": "keyword", "Python 타입": "str", "설명 및 용도": "원본 컨플루언스 페이지 고유 ID", "데이터 예시": "23953680"},
        {"필드명": "title", "ES 데이터 타입": "text (nori) / keyword", "Python 타입": "str", "설명 및 용도": "원본 문서의 제목", "데이터 예시": "신규 입사자 온보딩 가이드"},
        {"필드명": "content", "ES 데이터 타입": "text (nori) / keyword", "Python 타입": "str", "설명 및 용도": "RAG 및 검색용 텍스트 (제목 포함)", "데이터 예시": "[문서 제목: 가이드] 환영합니다"},
        {"필드명": "primary_contributor", "ES 데이터 타입": "keyword", "Python 타입": "str", "설명 및 용도": "해당 문서를 가장 많이 수정한 찐 전문가", "데이터 예시": "위승민민(Laura)"},
        {"필드명": "updated_at", "ES 데이터 타입": "date", "Python 타입": "str", "설명 및 용도": "문서 최종 수정 일시 (ISO-8601)", "데이터 예시": "2025-09-17T05:34:09.804Z"},
        {"필드명": "space", "ES 데이터 타입": "keyword", "Python 타입": "str", "설명 및 용도": "컨플루언스 스페이스 키 (분류용)", "데이터 예시": "LLOYDK"},
        {"필드명": "source", "ES 데이터 타입": "keyword", "Python 타입": "str", "설명 및 용도": "데이터 출처 (현재는 confluence 고정)", "데이터 예시": "confluence"},
        {"필드명": "url", "ES 데이터 타입": "keyword", "Python 타입": "str", "설명 및 용도": "사용자가 클릭할 원본 문서 하이퍼링크", "데이터 예시": "https://.../spaces/LLOYDK/.../"},
        {"필드명": "tags", "ES 데이터 타입": "keyword", "Python 타입": "List[str]", "설명 및 용도": "LLM이 분석한 직무/분류 태그 (대기열)", "데이터 예시": "['HR', '온보딩']"},
        {"필드명": "embedding", "ES 데이터 타입": "dense_vector", "Python 타입": "List[float]", "설명 및 용도": "1024차원 임베딩 벡터", "데이터 예시": "[0.012, -0.045, ...]"}
    ]

    # 2. 데이터를 pandas 데이터프레임(표 형식)으로 변환
    df = pd.DataFrame(data)

    # 3. 엑셀 파일로 저장할 이름 설정
    file_name = "Confluence_Data_Definition.xlsx"
    
    try:
        # index=False는 맨 앞에 0, 1, 2... 같은 불필요한 번호를 빼주는 옵션입니다.
        df.to_excel(file_name, index=False, engine='openpyxl')
        print(f"🎉 대성공! 엑셀 파일이 예쁘게 생성되었습니다: {os.path.abspath(file_name)}")
    except ImportError:
        print("🚨 에러: 엑셀을 만들려면 'openpyxl' 라이브러리가 필요합니다.")
        print("터미널에 아래 명령어를 쳐서 설치해 주세요: pip install openpyxl")

if __name__ == "__main__":
    create_data_definition_excel()