"""Security helpers for admin-protected settings APIs."""

from __future__ import annotations

import os
import secrets
import time
from fastapi import HTTPException, Request, Response

from .config import settings

ADMIN_HEADER = "x-admin-token"
CSRF_HEADER = "x-csrf-token"
CSRF_COOKIE_NAME = "arthera_csrf"


class CSRFTokenManager:
    """Simple in-memory CSRF token store with TTL."""

    def __init__(self, ttl: int = 3600):
        self.ttl = ttl
        self._tokens: dict[str, float] = {}

    def issue(self) -> str:
        token = secrets.token_urlsafe(32)
        self._tokens[token] = time.time()
        return token

    def validate(self, token: str) -> bool:
        self._cleanup()
        issued_at = self._tokens.get(token)
        if issued_at is None:
            return False
        if (time.time() - issued_at) > self.ttl:
            self._tokens.pop(token, None)
            return False
        return True

    def _cleanup(self) -> None:
        now = time.time()
        expired = [token for token, ts in self._tokens.items() if (now - ts) > self.ttl]
        for token in expired:
            self._tokens.pop(token, None)


csrf_manager = CSRFTokenManager(ttl=int(os.getenv("SETTINGS_SESSION_TTL", "3600")))


def require_admin(request: Request) -> str:
    expected = os.getenv("SETTINGS_ADMIN_TOKEN")
    if not expected:
        raise HTTPException(status_code=500, detail="SETTINGS_ADMIN_TOKEN 未配置")

    provided = request.headers.get(ADMIN_HEADER)
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=403, detail="未授权访问设置接口")

    return provided


def issue_csrf_token(response: Response) -> str:
    token = csrf_manager.issue()
    response.set_cookie(
        CSRF_COOKIE_NAME,
        token,
        secure=not settings.DEBUG,
        httponly=True,
        samesite="strict",
        max_age=csrf_manager.ttl,
    )
    return token


def require_csrf(request: Request) -> str:
    header_token = request.headers.get(CSRF_HEADER)
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)

    if not header_token or not cookie_token:
        raise HTTPException(status_code=403, detail="缺少 CSRF 令牌")

    if header_token != cookie_token:
        raise HTTPException(status_code=403, detail="CSRF 令牌不匹配")

    if not csrf_manager.validate(header_token):
        raise HTTPException(status_code=403, detail="CSRF 令牌已失效")

    return header_token


__all__ = [
    "ADMIN_HEADER",
    "CSRF_HEADER",
    "CSRF_COOKIE_NAME",
    "require_admin",
    "require_csrf",
    "issue_csrf_token",
]
