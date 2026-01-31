# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from onboarding.main import app as onboarding_app

root_app = FastAPI()

# 🔒 CORS 설정 추가 (현관문 보안 해제)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.123.42:5173",  # ✅ 프론트엔드 서버 주소 허용
]

root_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 기존 마운트 코드
root_app.mount("/onboarding", onboarding_app)

@root_app.get("/")
def read_root():
    return {"message": "여기는 통합 백엔드 서버입니다!"}