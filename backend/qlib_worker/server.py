from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Any, Dict, List

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Qlib Worker", version="1.0.0")


class BacktestRequest(BaseModel):
    strategy_config: Dict[str, Any]
    symbols: List[str]
    start_date: str
    end_date: str
    initial_capital: float = Field(1000000, ge=10000)


def _generate_equity_curve(days: int, capital: float) -> List[Dict[str, float]]:
    random.seed(days)
    curve = []
    cumulative = 1.0
    for i in range(days):
        cumulative *= 1 + random.uniform(-0.02, 0.02)
        curve.append(
            {
                "date": (datetime.utcnow() - timedelta(days=days - i)).strftime("%Y-%m-%d"),
                "equity": round(capital * cumulative, 2),
                "return": round((cumulative - 1) * 100, 2),
            }
        )
    return curve


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "healthy", "service": "qlib-worker"}


@app.post("/api/v1/backtest")
async def run_backtest(payload: BacktestRequest) -> Dict[str, Any]:
    start = datetime.strptime(payload.start_date, "%Y-%m-%d")
    end = datetime.strptime(payload.end_date, "%Y-%m-%d")
    days = max(30, (end - start).days)
    total_return = random.uniform(0.05, 0.35)
    benchmark = 0.08
    result = {
        "strategy_name": payload.strategy_config.get('name', 'Arthera Strategy'),
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "initial_capital": payload.initial_capital,
        "final_capital": round(payload.initial_capital * (1 + total_return), 2),
        "total_return": round(total_return, 4),
        "annualized_return": round(total_return / (days / 252), 4),
        "max_drawdown": round(-abs(random.uniform(0.05, 0.2)), 4),
        "sharpe_ratio": round(random.uniform(1.0, 2.2), 2),
        "volatility": round(random.uniform(0.12, 0.22), 4),
        "benchmark_return": benchmark,
        "alpha": round(total_return - benchmark, 4),
        "beta": round(random.uniform(0.8, 1.3), 2),
        "information_ratio": round(random.uniform(0.5, 1.5), 2),
        "equity_curve": _generate_equity_curve(days, payload.initial_capital),
        "trades": [
            {
                "symbol": symbol,
                "timestamp": payload.start_date,
                "action": "buy" if i % 2 == 0 else "sell",
                "quantity": 100,
                "price": round(random.uniform(20, 200), 2),
                "commission": 5,
                "reason": "Model signal",
            }
            for i, symbol in enumerate(payload.symbols[:5])
        ],
    }
    return {"success": True, "backtest_result": result}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.qlib_worker.server:app", host="0.0.0.0", port=8005, reload=True)
