"""Market universe providers for real-time symbol metadata."""
from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from statistics import mean, pstdev
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

try:  # Optional heavy dependencies
    import akshare as ak
except Exception:  # pragma: no cover - optional dependency
    ak = None

try:
    import tushare as ts
except Exception:  # pragma: no cover - optional dependency
    ts = None


class YahooMarketProvider:
    """Lightweight wrapper around Yahoo Finance search/quote APIs."""

    SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search"
    QUOTE_SUMMARY_URL = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}"
    CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

    def __init__(self, client: httpx.AsyncClient, *, default_region: str = "US") -> None:
        self.client = client
        self.default_region = default_region

    async def search(self, query: str, *, region: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Search symbols and enrich the results with quote details."""
        raw_quotes = await self._search_raw(query, region=region, limit=limit * 2)
        filtered: List[Dict[str, Any]] = []
        region_filter = (region or "").upper()
        for quote in raw_quotes:
            if not quote.get("symbol"):
                continue
            quote_region = (quote.get("region") or quote.get("quoteSourceName") or "").upper()
            if region_filter and region_filter not in quote_region:
                continue
            filtered.append(quote)
            if len(filtered) >= limit:
                break
        tasks = [self._enrich_quote(quote) for quote in filtered]
        return await self._collect(tasks)

    async def lookup_symbol(self, symbol: str, *, region: Optional[str] = None) -> Dict[str, Any]:
        """Return detailed metadata for a single symbol."""
        matches = await self.search(symbol, region=region, limit=1)
        if matches:
            return matches[0]
        # If search did not return anything, try to fetch summary directly.
        fallback = {"symbol": symbol, "shortname": symbol, "region": region or self.default_region}
        enriched = await self._enrich_quote(fallback)
        if not enriched:
            raise ValueError(f"Unable to fetch metadata for {symbol}")
        return enriched

    async def _collect(self, tasks: List[asyncio.Future]) -> List[Dict[str, Any]]:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        enriched: List[Dict[str, Any]] = []
        for item in results:
            if isinstance(item, Exception):
                logger.warning("Universe enrichment failed: %s", item)
                continue
            if item:
                enriched.append(item)
        return enriched

    async def _search_raw(self, query: str, *, region: Optional[str], limit: int) -> List[Dict[str, Any]]:
        params = {
            "q": query,
            "quotesCount": max(limit, 6),
            "lang": "en-US",
            "region": region or self.default_region,
        }
        response = await self.client.get(self.SEARCH_URL, params=params, headers=self._headers())
        response.raise_for_status()
        payload = response.json()
        return payload.get("quotes", [])

    async def _enrich_quote(self, quote: Dict[str, Any]) -> Dict[str, Any]:
        symbol = quote.get("symbol")
        if not symbol:
            return {}
        summary_task = asyncio.create_task(self._fetch_summary(symbol))
        chart_task = asyncio.create_task(self._fetch_chart_metrics(symbol))
        summary, chart = await asyncio.gather(summary_task, chart_task, return_exceptions=True)

        enriched: Dict[str, Any] = {
            "symbol": symbol,
            "name": quote.get("shortname") or quote.get("longname") or symbol,
            "exchange": quote.get("exchDisp") or quote.get("fullExchangeName"),
            "region": quote.get("region") or quote.get("quoteSourceName") or self.default_region,
            "currency": quote.get("currency"),
            "last_price": quote.get("regularMarketPrice"),
            "change_pct": quote.get("regularMarketChangePercent"),
            "change": quote.get("regularMarketChange"),
            "previous_close": quote.get("regularMarketPreviousClose"),
            "open": quote.get("regularMarketOpen"),
            "day_high": quote.get("regularMarketDayHigh"),
            "day_low": quote.get("regularMarketDayLow"),
            "volume": quote.get("regularMarketVolume"),
            "market_cap": quote.get("marketCap"),
            "quote_type": quote.get("quoteType"),
        }

        if isinstance(summary, Exception):
            logger.debug("Summary fetch for %s failed: %s", symbol, summary)
        else:
            enriched.update({k: v for k, v in summary.items() if v is not None})

        if isinstance(chart, Exception):
            logger.debug("Chart fetch for %s failed: %s", symbol, chart)
        else:
            enriched.update({k: v for k, v in chart.items() if v is not None})

        return enriched

    async def _fetch_summary(self, symbol: str) -> Dict[str, Any]:
        params = {"modules": "price,summaryProfile,defaultKeyStatistics,summaryDetail"}
        response = await self.client.get(
            self.QUOTE_SUMMARY_URL.format(symbol=symbol),
            params=params,
            headers=self._headers(),
        )
        response.raise_for_status()
        payload = response.json().get("quoteSummary", {})
        results = payload.get("result") or []
        if not results:
            return {}
        entry = results[0]
        price = entry.get("price", {})
        profile = entry.get("summaryProfile", {})
        stats = entry.get("defaultKeyStatistics", {})
        detail = entry.get("summaryDetail", {})

        def raw(field: Any) -> Optional[float]:
            if isinstance(field, dict):
                return field.get("raw")
            return field

        return {
            "market_cap": raw(price.get("marketCap")) or raw(detail.get("marketCap")),
            "beta": raw(stats.get("beta")),
            "pe_ratio": raw(detail.get("trailingPE")) or raw(price.get("trailingPE")),
            "forward_pe": raw(detail.get("forwardPE")),
            "dividend_yield": raw(detail.get("dividendYield")),
            "sector": profile.get("sector"),
            "industry": profile.get("industry"),
            "country": profile.get("country"),
        }

    async def _fetch_chart_metrics(self, symbol: str) -> Dict[str, Any]:
        params = {"range": "1y", "interval": "1d", "includePrePost": "false"}
        response = await self.client.get(
            self.CHART_URL.format(symbol=symbol), params=params, headers=self._headers()
        )
        response.raise_for_status()
        chart = response.json().get("chart", {})
        results = chart.get("result") or []
        if not results:
            return {}
        entry = results[0]
        timestamps = entry.get("timestamp") or []
        indicators = entry.get("indicators", {}).get("quote", [{}])[0]
        closes = indicators.get("close", [])
        volumes = indicators.get("volume", [])

        price_series = [
            (ts, close, volumes[idx] if idx < len(volumes) else None)
            for idx, (ts, close) in enumerate(zip(timestamps, closes))
            if close is not None and ts is not None
        ]
        if not price_series:
            return {}

        closes_only = [close for _, close, _ in price_series]
        latest_close = closes_only[-1]

        def pct_change(current: Optional[float], past: Optional[float]) -> Optional[float]:
            if current is None or past in (None, 0):
                return None
            try:
                return (current / past) - 1
            except ZeroDivisionError:
                return None

        def volatility(values: List[float]) -> Optional[float]:
            returns: List[float] = []
            for i in range(1, len(values)):
                prev, curr = values[i - 1], values[i]
                if prev in (None, 0) or curr is None:
                    continue
                returns.append((curr / prev) - 1)
            if len(returns) < 2:
                return None
            return pstdev(returns)

        momentum_3m = None
        if len(closes_only) >= 63:
            momentum_3m = pct_change(latest_close, closes_only[-63])

        vol_30d = volatility(closes_only[-31:]) if len(closes_only) > 31 else None
        volumes_20d = [vol for _, _, vol in price_series[-20:] if vol]
        avg_volume_20d = mean(volumes_20d) if volumes_20d else None

        closes_1y = closes_only[-252:]
        fifty_two_week_high = max(c for c in closes_1y if c is not None) if closes_1y else None
        fifty_two_week_low = min(c for c in closes_1y if c is not None) if closes_1y else None

        last_timestamp = price_series[-1][0]
        last_updated = datetime.fromtimestamp(last_timestamp, tz=timezone.utc).isoformat()

        return {
            "momentum_3m": momentum_3m,
            "volatility_30d": vol_30d,
            "avg_volume_20d": avg_volume_20d,
            "fifty_two_week_high": fifty_two_week_high,
            "fifty_two_week_low": fifty_two_week_low,
            "last_updated": last_updated,
        }

    def _headers(self) -> Dict[str, str]:
        return {"User-Agent": "ArtheraTradingEngine/1.0"}


class ChinaAStockProvider:
    """Real-time search provider for China A-shares via AkShare/Tushare."""

    SPOT_CACHE_TTL = 30  # seconds
    BASIC_CACHE_TTL = 3600

    def __init__(self, *, tushare_token: Optional[str] = None) -> None:
        if ak is None:  # pragma: no cover - dependency guard
            raise RuntimeError("akshare package is required for ChinaAStockProvider")

        self.tushare_token = tushare_token or os.getenv("TUSHARE_TOKEN")
        self.ts_client = None
        self._spot_cache: List[Dict[str, Any]] = []
        self._spot_cached_at: float = 0
        self._basic_cache: Dict[str, Dict[str, Any]] = {}
        self._basic_cached_at: float = 0

        if self.tushare_token:
            try:
                self._configure_tushare_sync(self.tushare_token)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Failed to initialise Tushare: %s", exc)

    async def search(self, query: str) -> Dict[str, Any]:
        """Search A-share universe and return all matches."""
        query_lower = query.strip().lower()
        if not query_lower:
            return {"results": [], "total": 0}

        rows = await self._get_spot_rows()
        basics = await self._get_basic_lookup()

        matches: List[Dict[str, Any]] = []
        for row in rows:
            code = str(row.get("代码") or row.get("symbol") or "").strip()
            name = str(row.get("名称") or row.get("name") or "").strip()
            if not code:
                continue
            if query_lower not in code.lower() and query_lower not in name.lower():
                continue
            symbol = self._format_symbol(code)
            basic = basics.get(symbol) or basics.get(code.upper())
            matches.append(self._build_payload(symbol, row, basic))

        return {"results": matches, "total": len(matches)}

    async def lookup_symbol(self, symbol: str) -> Dict[str, Any]:
        """Return metadata for a concrete A-share symbol."""
        target = self._strip_suffix(symbol)
        rows = await self._get_spot_rows()
        basics = await self._get_basic_lookup()
        for row in rows:
            code = str(row.get("代码") or row.get("symbol") or "").strip()
            if not code:
                continue
            if code == target:
                normalized = self._format_symbol(code)
                basic = basics.get(normalized) or basics.get(code.upper())
                return self._build_payload(normalized, row, basic)
        raise ValueError(f"Symbol {symbol} not found in A-share provider")

    async def set_tushare_token(self, token: Optional[str]) -> None:
        """Configure or reset the Tushare client dynamically."""
        cleaned = token.strip() if token else None
        await asyncio.to_thread(self._configure_tushare_sync, cleaned)

    def status(self) -> Dict[str, Any]:
        return {
            "tushare_enabled": self.ts_client is not None,
            "tushare_token_configured": bool(self.tushare_token)
        }

    def _configure_tushare_sync(self, token: Optional[str]) -> None:
        if token:
            if ts is None:
                raise RuntimeError("tushare package is not installed")
            ts.set_token(token)
            self.ts_client = ts.pro_api()
            self.tushare_token = token
            self._basic_cache = {}
            self._basic_cached_at = 0
            logger.info("Tushare token configured successfully")
        else:
            self.ts_client = None
            self.tushare_token = None

    async def _get_spot_rows(self) -> List[Dict[str, Any]]:
        if self._spot_cache and (time.time() - self._spot_cached_at) < self.SPOT_CACHE_TTL:
            return self._spot_cache
        loop = asyncio.get_running_loop()
        df = await loop.run_in_executor(None, ak.stock_zh_a_spot_em)
        records = df.to_dict("records") if hasattr(df, "to_dict") else []
        self._spot_cache = records
        self._spot_cached_at = time.time()
        return records

    async def _get_basic_lookup(self) -> Dict[str, Dict[str, Any]]:
        if not self.ts_client:
            return {}
        if self._basic_cache and (time.time() - self._basic_cached_at) < self.BASIC_CACHE_TTL:
            return self._basic_cache
        loop = asyncio.get_running_loop()
        df = await loop.run_in_executor(
            None,
            lambda: self.ts_client.query(
                "stock_basic",
                exchange="",
                list_status="L",
                fields="ts_code,name,area,industry,market,list_date"
            )
        )
        lookup: Dict[str, Dict[str, Any]] = {}
        if hasattr(df, "to_dict"):
            for row in df.to_dict("records"):
                ts_code = (row.get("ts_code") or "").upper()
                if ts_code:
                    lookup[ts_code] = row
        self._basic_cache = lookup
        self._basic_cached_at = time.time()
        return lookup

    def _build_payload(self, symbol: str, spot_row: Dict[str, Any], basic: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        price = self._to_float(spot_row.get("最新价") or spot_row.get("price"))
        change_pct = self._to_float(spot_row.get("涨跌幅") or spot_row.get("change"))
        volume = self._to_float(spot_row.get("成交量") or spot_row.get("volume"))
        market_cap = self._to_float(spot_row.get("总市值") or spot_row.get("market_cap"))
        sector = basic.get("industry") if basic else None
        region = "CN"
        exchange = "SSE" if symbol.endswith((".SS", ".SH")) else ("SZSE" if symbol.endswith(".SZ") else "CN")

        return {
            "symbol": symbol,
            "name": (basic.get("name") if basic else None) or spot_row.get("名称") or symbol,
            "displayName": (basic.get("name") if basic else None) or spot_row.get("名称") or symbol,
            "exchange": exchange,
            "region": region,
            "currency": "CNY",
            "price": price,
            "last_price": price,
            "change": change_pct,
            "change_pct": change_pct,
            "volume": volume,
            "marketCap": self._format_market_cap_label(market_cap),
            "market_cap": market_cap,
            "sector": sector or "A-SHARE",
            "industry": sector or "A-SHARE",
            "data_source": "akshare/tushare",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    def _format_symbol(self, code: str) -> str:
        prefix = code[:1]
        if prefix in {"6", "5"} or code.startswith("688"):
            suffix = ".SS"
        elif prefix in {"8", "4"}:
            suffix = ".BJ"
        else:
            suffix = ".SZ"
        return f"{code.upper()}{suffix}"

    def _strip_suffix(self, symbol: str) -> str:
        return symbol.replace(".SS", "").replace(".SH", "").replace(".SZ", "").replace(".BJ", "")

    def _to_float(self, value: Any) -> Optional[float]:
        try:
            if value is None or value == "":
                return None
            return float(str(value).replace('%', '').replace(',', ''))
        except (TypeError, ValueError):
            return None

    def _format_market_cap_label(self, value: Optional[float]) -> str:
        if not value:
            return "N/A"
        units = [(1e12, "T"), (1e8, "亿"), (1e6, "M"), (1e4, "万")]
        for threshold, label in units:
            if value >= threshold:
                return f"¥{value / threshold:.2f}{label}"
        return f"¥{value:.0f}"
