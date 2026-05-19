from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import apps, logs

app = FastAPI(
    title="KubeFlow Platform API",
    description="Self-service developer platform on Kubernetes",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(apps.router, prefix="/apps", tags=["apps"])
app.include_router(logs.router, prefix="/logs", tags=["logs"])

@app.get("/health")
def health():
    return {"status": "ok"}
