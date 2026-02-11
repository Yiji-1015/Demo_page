from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import os
import httpx

# 온보딩 앱 가져오기
from onboarding.main import app as onboarding_app

root_app = FastAPI()

# 1. 🔒 CORS 설정 (반드시 mount보다 위에, 한 번만 설정)
root_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. 🏠 온보딩 서비스 연결 (사용자님 서버 내부 로직)
root_app.mount("/onboarding", onboarding_app)

BACKEND41_BASE = os.getenv("BACKEND41_BASE", "http://192.168.123.41:8000")

@root_app.api_route("/insight/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_to_41(path: str, request: Request):
    url = f"{BACKEND41_BASE}/api/{path}"
    headers = dict(request.headers)
    headers.pop("host", None)
    body = await request.body()

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.request(
            method=request.method,
            url=url,
            params=dict(request.query_params),
            content=body,
            headers=headers,
        )

    excluded = {"content-encoding", "transfer-encoding", "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "upgrade"}
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers={k: v for k, v in resp.headers.items() if k.lower() not in excluded},
        media_type=resp.headers.get("content-type"),
    )

@root_app.get("/")
def read_root():
    return {"message": "통합 서버가 정상 동작 중입니다!"}