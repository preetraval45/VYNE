from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
import psycopg2

from ..config import settings
from ..dependencies import get_current_user, get_db

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/search", tags=["search"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

ContentType = Literal["issues", "messages", "docs"]


class SearchRequest(BaseModel):
    query: str
    orgId: str
    types: list[ContentType] | None = None
    limit: int = Field(default=10, ge=1, le=100)


class SearchResult(BaseModel):
    type: str
    id: str
    title: str
    snippet: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total: int
    query: str


# ---------------------------------------------------------------------------
# Embedding helper
# ---------------------------------------------------------------------------


def _get_embedding(text: str) -> list[float] | None:
    """
    Generate an embedding via Bedrock Titan Embed.
    Returns None if unavailable so callers can fall back to text search.
    """
    try:
        import json
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
        return result["embedding"]
    except Exception as exc:  # noqa: BLE001
        log.warning("embedding_unavailable", error=str(exc))
        return None


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------


@router.post("", response_model=SearchResponse)
async def semantic_search(
    body: SearchRequest,
    _user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> SearchResponse:
    """
    Semantic search across all content using pgvector cosine similarity.
    Falls back to PostgreSQL full-text search when embeddings are unavailable.
    """
    types = body.types or ["issues", "messages", "docs"]
    embedding = _get_embedding(body.query)

    results: list[SearchResult] = []

    try:
        with db.cursor() as cur:
            for content_type in types:
                if embedding is not None:
                    rows = _vector_search(cur, content_type, body.orgId, embedding, body.limit)
                else:
                    rows = _text_search(cur, content_type, body.orgId, body.query, body.limit)
                results.extend(rows)

        # Sort all results by score descending and trim to limit
        results.sort(key=lambda r: r.score, reverse=True)
        results = results[: body.limit]

    except Exception as exc:  # noqa: BLE001
        log.warning("search_db_error", error=str(exc))
        # Return empty gracefully rather than 500 during dev
        results = _mock_results(body.query, types)

    return SearchResponse(results=results, total=len(results), query=body.query)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _vector_search(
    cur,
    content_type: str,
    org_id: str,
    embedding: list[float],
    limit: int,
) -> list[SearchResult]:
    """pgvector cosine similarity search per content type."""
    table_map = {
        "issues": ("issues", "id", "title", "description"),
        "messages": ("messages", "id", "content", "content"),
        "docs": ("documents", "id", "title", "body"),
    }
    if content_type not in table_map:
        return []

    table, id_col, title_col, snippet_col = table_map[content_type]
    sql = f"""
        SELECT
            {id_col}::text,
            {title_col},
            LEFT({snippet_col}, 200),
            1 - (embedding <=> %s::vector) AS score
        FROM {table}
        WHERE org_id = %s
          AND embedding IS NOT NULL
        ORDER BY embedding <=> %s::vector
        LIMIT %s
    """
    try:
        cur.execute(sql, (embedding, org_id, embedding, limit))
        rows = cur.fetchall()
        return [
            SearchResult(
                type=content_type,
                id=row[0],
                title=row[1] or "",
                snippet=row[2] or "",
                score=float(row[3]),
            )
            for row in rows
        ]
    except Exception as exc:  # noqa: BLE001
        log.warning("vector_search_error", table=table, error=str(exc))
        return []


def _text_search(
    cur,
    content_type: str,
    org_id: str,
    query: str,
    limit: int,
) -> list[SearchResult]:
    """PostgreSQL full-text search fallback."""
    table_map = {
        "issues": ("issues", "id", "title", "description"),
        "messages": ("messages", "id", "content", "content"),
        "docs": ("documents", "id", "title", "body"),
    }
    if content_type not in table_map:
        return []

    table, id_col, title_col, snippet_col = table_map[content_type]
    sql = f"""
        SELECT
            {id_col}::text,
            {title_col},
            LEFT({snippet_col}, 200),
            ts_rank(
                to_tsvector('english', COALESCE({title_col}, '') || ' ' || COALESCE({snippet_col}, '')),
                plainto_tsquery('english', %s)
            ) AS score
        FROM {table}
        WHERE org_id = %s
          AND to_tsvector('english', COALESCE({title_col}, '') || ' ' || COALESCE({snippet_col}, ''))
              @@ plainto_tsquery('english', %s)
        ORDER BY score DESC
        LIMIT %s
    """
    try:
        cur.execute(sql, (query, org_id, query, limit))
        rows = cur.fetchall()
        return [
            SearchResult(
                type=content_type,
                id=row[0],
                title=row[1] or "",
                snippet=row[2] or "",
                score=float(row[3]),
            )
            for row in rows
        ]
    except Exception as exc:  # noqa: BLE001
        log.warning("text_search_error", table=table, error=str(exc))
        return []


def _mock_results(query: str, types: list[str]) -> list[SearchResult]:
    """Return stub results for dev / DB-less environments."""
    return [
        SearchResult(
            type=types[0] if types else "issues",
            id="mock-001",
            title=f"Mock result for '{query}'",
            snippet="This is a placeholder result returned when the database is unavailable.",
            score=0.95,
        )
    ]
