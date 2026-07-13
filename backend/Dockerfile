FROM ghcr.io/astral-sh/uv:0.9.27-python3.13-bookworm-slim AS builder

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

FROM python:3.13-slim-bookworm

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TERRA_DATA_DIR=/data

WORKDIR /app

RUN groupadd --system terra && useradd --system --gid terra --home-dir /app terra

COPY --from=builder /app/.venv /app/.venv
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chown -R terra:terra /app && chmod 755 /app/docker-entrypoint.sh

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=6 CMD ["python", "-c", "from urllib.request import urlopen; urlopen('http://127.0.0.1:8000/api/health', timeout=2)"]

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
