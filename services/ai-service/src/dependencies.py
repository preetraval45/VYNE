from __future__ import annotations

import psycopg2
import psycopg2.pool
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from typing import Generator

from .config import settings

# ---------------------------------------------------------------------------
# Connection pool (created lazily on first use)
# ---------------------------------------------------------------------------

_pool: psycopg2.pool.SimpleConnectionPool | None = None


def _get_pool() -> psycopg2.pool.SimpleConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=settings.database_url,
        )
    return _pool


# ---------------------------------------------------------------------------
# JWT auth
# ---------------------------------------------------------------------------

_bearer = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """
    Verifies an HS256 JWT and returns the claims dict:
    { id, email, org_id, role }
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    required = {"id", "email", "org_id", "role"}
    missing = required - payload.keys()
    if missing:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token missing required claims: {missing}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "id": payload["id"],
        "email": payload["email"],
        "org_id": payload["org_id"],
        "role": payload["role"],
    }


# ---------------------------------------------------------------------------
# DB connection
# ---------------------------------------------------------------------------


def get_db() -> Generator:
    """
    Yields a psycopg2 connection from the pool.
    The connection is returned to the pool when the request finishes.
    """
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)
