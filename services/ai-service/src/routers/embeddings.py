from __future__ import annotations

import json
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..config import settings
from ..dependencies import get_current_user

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/embeddings", tags=["embeddings"])

_EMBED_DIM = 1536  # Titan Embed v2 dimension


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: list[float]
    model: str
    dimensions: int


class BatchEmbedRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=100)


class BatchEmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dimensions: int
    count: int


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------


def _embed_single(text: str) -> tuple[list[float], str]:
    """
    Embed a single string via Bedrock Titan Embed.
    Returns (embedding, model_id).
    Falls back to zero-vector in dev.
    """
    try:
        import boto3  # noqa: PLC0415

        client = boto3.client("bedrock-runtime", region_name=settings.aws_region)
        body = json.dumps({"inputText": text})
        response = client.invoke_model(
            modelId=settings.bedrock_embed_model_id,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        result = json.loads(response["body"].read())
        embedding: list[float] = result["embedding"]
        return embedding, settings.bedrock_embed_model_id
    except Exception as exc:  # noqa: BLE001
        log.warning(
            "bedrock_embed_unavailable",
            error=str(exc),
            mode="dev_fallback",
        )
        return [0.0] * _EMBED_DIM, "dev-zero-vector"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/generate", response_model=EmbedResponse)
async def generate_embedding(
    body: EmbedRequest,
    _user: dict = Depends(get_current_user),
) -> EmbedResponse:
    """
    Generate an embedding vector for a single text string.
    In development (Bedrock unavailable), returns a 1536-dimensional zero vector.
    """
    if not body.text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="text must not be empty",
        )

    embedding, model = _embed_single(body.text)
    return EmbedResponse(
        embedding=embedding,
        model=model,
        dimensions=len(embedding),
    )


@router.post("/batch", response_model=BatchEmbedResponse)
async def batch_embeddings(
    body: BatchEmbedRequest,
    _user: dict = Depends(get_current_user),
) -> BatchEmbedResponse:
    """
    Generate embeddings for up to 100 text strings.
    Each text is embedded individually (Titan Embed does not support batch natively).
    In development (Bedrock unavailable), returns zero vectors.
    """
    non_empty = [t for t in body.texts if t.strip()]
    if not non_empty:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one non-empty text is required",
        )

    embeddings: list[list[float]] = []
    model_used = "dev-zero-vector"

    for text in body.texts:
        embedding, model_used = _embed_single(text)
        embeddings.append(embedding)

    return BatchEmbedResponse(
        embeddings=embeddings,
        model=model_used,
        dimensions=len(embeddings[0]) if embeddings else _EMBED_DIM,
        count=len(embeddings),
    )
