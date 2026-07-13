from fastapi import FastAPI

app = FastAPI(title="Terra Space API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
