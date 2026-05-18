from fastapi import FastAPI
from app.routers import apps

app = FastAPI(
    title="KubeFlow Platform API",
    description="Self-service developer platform on Kubernetes",
    version="0.1.0"
)

app.include_router(apps.router, prefix="/apps", tags=["apps"])

@app.get("/health")
def health():
    return {"status": "ok"}
