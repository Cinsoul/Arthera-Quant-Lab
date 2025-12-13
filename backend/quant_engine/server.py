from __future__ import annotations

import math
import random
from datetime import datetime
from typing import Dict, List

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="QuantEngine Microservice", version="1.0.0")


class FactorRequest(BaseModel):
    symbols: List[str] = Field(..., description="待分析的证券代码")
    start_date: str
    end_date: str
    factor_set: str = "alpha158"


class PredictionRequest(BaseModel):
    symbols: List[str]
    model_type: str = Field("lightgbm", description="模型类型")
    prediction_days: int = 5


class RiskRequest(BaseModel):
    portfolio: Dict[str, float]
    time_horizon: int = 252


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "healthy", "service": "quant-engine"}


@app.post("/api/v1/calculate-factors")
async def calculate_factors(payload: FactorRequest) -> Dict[str, Dict[str, List[Dict[str, float]]]]:
    random.seed(42)
    response: Dict[str, List[Dict[str, float]]] = {}
    for symbol in payload.symbols:
        factors = []
        for name, category in [
            ("VOLUME_MA", "volume"),
            ("PRICE_MOMENTUM", "momentum"),
            ("RSI", "technical"),
            ("VOLATILITY", "volatility"),
            ("PRICE_MA_RATIO", "price"),
        ]:
            factors.append(
                {
                    "name": name,
                    "value": round(random.uniform(-25, 125), 4),
                    "importance": round(random.uniform(0.55, 0.9), 4),
                    "category": category,
                }
            )
        response[symbol] = factors
    return {"success": True, "factors": response, "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/v1/ml-prediction")
async def ml_prediction(payload: PredictionRequest) -> Dict[str, List[Dict[str, float]]]:
    predictions = []
    for symbol in payload.symbols:
        predictions.append(
            {
                "symbol": symbol,
                "prediction": round(random.uniform(-0.05, 0.05), 4),
                "confidence": round(random.uniform(0.6, 0.95), 4),
                "model": payload.model_type,
                "features": {
                    "volume_factor": round(random.uniform(0, 100), 2),
                    "price_momentum": round(random.uniform(-30, 30), 2),
                    "technical_score": round(random.uniform(0, 100), 2),
                },
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
    return {"success": True, "predictions": predictions}


@app.post("/api/v1/risk-assessment")
async def risk_assessment(payload: RiskRequest) -> Dict[str, Dict[str, float]]:
    exposure = sum(payload.portfolio.values()) or 1
    base_score = min(90.0, 50 + 40 * math.log(exposure + 1))
    response = {
        "overall_score": round(base_score, 2),
        "market_risk": round(random.uniform(40, 80), 2),
        "liquidity_risk": round(random.uniform(35, 70), 2),
        "concentration_risk": round(random.uniform(30, 65), 2),
        "correlation_risk": round(random.uniform(35, 75), 2),
        "volatility_risk": round(random.uniform(45, 85), 2),
        "risk_level": "low" if base_score > 80 else "medium" if base_score > 60 else "high",
        "recommendations": [
            "考虑增加分散投资",
            "关注市场流动性变化",
            "调整仓位配置",
        ],
        "warnings": ["当前波动率偏高", "部分资产相关性过高"],
    }
    return {"success": True, "risk_assessment": response}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.quant_engine.server:app", host="0.0.0.0", port=8003, reload=True)
