# backend/Dockerfile

FROM python:3.9-slim

WORKDIR /app

# 1. 하위 폴더인 onboarding에서 requirements.txt를 복사해옵니다.
COPY requirements.txt . 

# 2. 패키지 설치
RUN pip install --no-cache-dir -r requirements.txt

# 3. backend 폴더 내의 모든 파일(onboarding, main.py 등)을 컨테이너 /app으로 복사
COPY . .

# 4. uvicorn 실행 (main.py의 root_app)
CMD ["uvicorn", "main:root_app", "--host", "0.0.0.0", "--port", "8000"]