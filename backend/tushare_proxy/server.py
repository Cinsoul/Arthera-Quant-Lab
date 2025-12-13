from __future__ import annotations

import os
import random
from datetime import datetime
from typing import Any, Dict, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

TUSHARE_API = "http://api.tushare.pro"
TUSHARE_TOKEN = os.getenv("TUSHARE_TOKEN")

app = FastAPI(title="Tushare Proxy", version="1.0.0")


class TusharePayload(BaseModel):
    api_name: str
    token: Optional[str] = None
    params: Dict[str, Any] = {}
    fields: Optional[str] = None


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "healthy", "service": "tushare-proxy"}


@app.post("/api/v1/tushare")
async def proxy(payload: TusharePayload) -> Dict[str, Any]:
    token = payload.token or TUSHARE_TOKEN
    request_body = {
        "api_name": payload.api_name,
        "token": token or "demo-token",
        "params": payload.params,
        "fields": payload.fields,
    }

    if token:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(TUSHARE_API, json=request_body)
                response.raise_for_status()
                data = response.json()
                if data.get("code") != 0:
                    raise HTTPException(status_code=502, detail=data.get("msg", "Tushare error"))
                return data
        except (httpx.HTTPError, HTTPException) as exc:
            raise HTTPException(status_code=502, detail=f"Tushare proxy error: {exc}")

    # Mock 数据回退
    return generate_mock_response(payload.api_name)


def generate_mock_response(api_name: str) -> Dict[str, Any]:
    random.seed(api_name)
    if api_name == 'daily':
        fields = ["ts_code", "trade_date", "open", "high", "low", "close", "vol"]
        items = [
            ["600519.SH", "20240101", 100 + i, 102 + i, 99 + i, 101 + i, 1000000 + i * 1000]
            for i in range(5)
        ]
    elif api_name == 'stock_basic':
        fields = ["ts_code", "symbol", "name", "area", "industry", "market"]
        items = [["600519.SH", "600519", "贵州茅台", "贵州", "白酒", "SH"]]
    else:
        fields = ["ts_code", "value"]
        items = [["600519.SH", random.uniform(0, 100)]]

    return {
        "request_id": datetime.utcnow().isoformat(),
        "code": 0,
        "msg": "mock",
        "data": {
            "fields": fields,
            "items": items,
            "has_more": False,
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.tushare_proxy.server:app", host="0.0.0.0", port=8010, reload=True)
