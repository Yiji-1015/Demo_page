# 사내 임베딩서버 연결 테스트^^

import requests
import json
import time

# 1. 정보 설정 (전달해주신 정보 반영)
EMBEDDING_API_URL = "http://192.168.123.33:5435/v1/embeddings"
TEST_INPUT = "LLOYDK 포털의 사내 문서를 임베딩 중입니다."

def test_embedding_server(text: str):
    """
    사내 임베딩 서버 연결 테스트 함수
    """
    headers = {
        "Content-Type": "application/json"
    }
    
    payload = {
        "input": text
    }

    print(f"--- [START] 임베딩 요청 송신 ---")
    print(f"Target URL: {EMBEDDING_API_URL}")
    print(f"Input Text: {text}")
    
    try:
        start_time = time.time()
        
        # API 호출
        response = requests.post(EMBEDDING_API_URL, json=payload, headers=headers, timeout=10)
        
        # 응답 확인
        response.raise_for_status() # 4xx, 5xx 에러 발생 시 예외 처리
        result = response.json()
        
        end_time = time.time()
        
        # 2. 출력 결과 파싱 및 확인
        embedding_vector = result['data'][0]['embedding']
        vector_dim = len(embedding_vector)
        model_name = result.get('model', 'Unknown')
        
        print(f"\n--- [SUCCESS] 서버 응답 완료 ({end_time - start_time:.2f}s) ---")
        print(f"사용한 모델: {model_name}")
        print(f"임베딩 벡터 차원 수: {vector_dim}")
        print(f"벡터 샘플 (앞 5개): {embedding_vector[:5]}")
        print(f"토큰 사용량: {result.get('usage', {})}")
        
        return embedding_vector

    except requests.exceptions.ConnectTimeout:
        print("\n❌ [ERROR] 연결 시간이 초과되었습니다. (서버가 꺼져있거나 네트워크 경로 문제)")
    except requests.exceptions.HTTPError as e:
        print(f"\n❌ [ERROR] HTTP 에러 발생: {e}")
    except Exception as e:
        print(f"\n❌ [ERROR] 알 수 없는 에러 발생: {e}")

if __name__ == "__main__":
    test_embedding_server(TEST_INPUT)