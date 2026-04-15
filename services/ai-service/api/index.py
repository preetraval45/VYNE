"""Vercel Python serverless entrypoint for the VYNE AI service (FastAPI).

Vercel auto-discovers any `api/*.py` module and exposes its ASGI `app`
instance as a serverless function. This module re-exports the FastAPI
app defined in `services/ai-service/src/main.py` so the same codebase
runs locally (uvicorn) and on Vercel (serverless).

Deploy:
    cd services/ai-service
    vercel --prod

Requires these env vars to be set in the Vercel project:
    POSTGRES_URL            (from Neon / Vyne-Postgesql)
    KV_REST_API_URL         (from Vyne-Redis)
    KV_REST_API_TOKEN
    BLOB_READ_WRITE_TOKEN   (from Vyne-database blob)
    ANTHROPIC_API_KEY       (optional, enables live LLM)
    JWT_SECRET
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure `src/` is importable when Vercel invokes this file from /api/
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.main import app  # noqa: E402  (ASGI app exposed to Vercel)

__all__ = ["app"]
