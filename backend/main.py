"""
LLOYDK 통합 백엔드 메인 서버 (Gateway)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# 1. 하위 모듈 앱과 그 앱의 '시작 스위치(startup_event)'를 같이 가져옵니다! 🌟
from onboarding.main import app as onboarding_app, startup_event as onboarding_startup

root_app = FastAPI(title="LLOYDK Integrated Backend")

# 2. 🔒 CORS 설정 (모든 하위 앱에 공통 적용)
root_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🌟 3. 통합 서버가 켜질 때, 하위 앱들의 스위치도 같이 딸깍! 켜줍니다.
@root_app.on_event("startup")
async def root_startup_event():
    print("🚀 [Gateway] 통합 메인 서버 시작! 하위 모듈들을 깨웁니다...")
    await onboarding_startup() # 👈 onboarding 앱의 DB 매니저 생성 스위치 ON!

# 4. 🏠 하위 서비스 마운트 (정거장 연결)
root_app.mount("/onboarding", onboarding_app)

@root_app.get("/")
def read_root():
    return {
        "message": "LLOYDK 통합 백엔드 서버가 정상 동작 중입니다.",
        "active_modules": ["onboarding"],
        "elasticsearch_target": "192.168.123.43"
    }