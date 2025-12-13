"""
Financial Modeling Prep API集成服务
提供美股财务数据、估值指标、财务报表等
"""

import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class FMPService:
    """
    Financial Modeling Prep API数据服务
    提供：财务报表、估值指标、股票筛选、经济指标
    """
    
    def __init__(self, api_key: str = None):
        if api_key is None:
            # 从配置管理器获取API密钥
            try:
                from .service_config_manager import get_service_config_manager
                config_manager = get_service_config_manager()
                self.api_key = config_manager.get_api_key('fmp')
            except Exception:
                self.api_key = None
        else:
            self.api_key = api_key
            
        self.base_url = "https://financialmodelingprep.com/api/v3"
        self.session = None
        
    async def get_session(self):
        """获取HTTP会话"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close(self):
        """关闭会话"""
        if self.session:
            await self.session.close()
    
    async def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """统一API请求方法"""
        try:
            session = await self.get_session()
            
            # 添加API密钥到参数
            if params is None:
                params = {}
            params['apikey'] = self.api_key
            
            url = f"{self.base_url}/{endpoint}"
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return {"success": True, "data": data}
                elif response.status == 429:
                    return {"success": False, "error": "API请求频率超限"}
                else:
                    error_text = await response.text()
                    return {"success": False, "error": f"HTTP {response.status}: {error_text}"}
                    
        except Exception as e:
            logger.error(f"FMP API请求失败: {e}")
            return {"success": False, "error": str(e)}

    # ============================================================================
    # 股票基本信息
    # ============================================================================
    
    async def get_company_quote(self, symbol: str) -> Dict[str, Any]:
        """获取股票实时报价"""
        try:
            result = await self._make_request(f"quote/{symbol}")
            
            if result.get("success") and result.get("data"):
                quotes = result["data"]
                if quotes and len(quotes) > 0:
                    quote = quotes[0]
                    return {
                        "success": True,
                        "symbol": symbol,
                        "data": {
                            "price": quote.get("price"),
                            "change": quote.get("change"),
                            "changePercent": quote.get("changesPercentage"),
                            "volume": quote.get("volume"),
                            "marketCap": quote.get("marketCap"),
                            "eps": quote.get("eps"),
                            "pe": quote.get("pe")
                        },
                        "source": "fmp"
                    }
            
            return {"success": False, "error": f"无法获取{symbol}的报价"}
            
        except Exception as e:
            logger.error(f"FMP报价获取失败: {e}")
            return {"success": False, "error": str(e)}

    async def get_company_profile(self, symbol: str) -> Dict[str, Any]:
        """获取公司档案"""
        result = await self._make_request(f"profile/{symbol}")
        
        if result["success"] and result["data"]:
            profile_data = result["data"]
            if isinstance(profile_data, list) and len(profile_data) > 0:
                profile = profile_data[0]
                
                return {
                    "success": True,
                    "symbol": symbol,
                    "data": {
                        "company_name": profile.get("companyName"),
                        "sector": profile.get("sector"),
                        "industry": profile.get("industry"),
                        "website": profile.get("website"),
                        "description": profile.get("description"),
                        "ceo": profile.get("ceo"),
                        "employees": profile.get("fullTimeEmployees"),
                        "country": profile.get("country"),
                        "currency": profile.get("currency"),
                        "exchange": profile.get("exchangeShortName"),
                        "market_cap": profile.get("mktCap"),
                        "price": profile.get("price"),
                        "beta": profile.get("beta"),
                        "vol_avg": profile.get("volAvg"),
                        "last_div": profile.get("lastDiv"),
                        "range": profile.get("range"),
                        "changes": profile.get("changes"),
                        "image": profile.get("image")
                    },
                    "source": "fmp"
                }
        
        return {"success": False, "error": "无法获取公司档案"}
    
    async def search_stocks(self, query: str, limit: int = 20) -> Dict[str, Any]:
        """搜索股票"""
        result = await self._make_request("search", {"query": query, "limit": limit})
        
        if result["success"] and result["data"]:
            search_results = result["data"]
            
            stocks = []
            for item in search_results:
                stocks.append({
                    "symbol": item.get("symbol"),
                    "name": item.get("name"),
                    "currency": item.get("currency"),
                    "stock_exchange": item.get("stockExchange"),
                    "exchange_short_name": item.get("exchangeShortName")
                })
            
            return {
                "success": True,
                "query": query,
                "total_found": len(stocks),
                "data": stocks,
                "source": "fmp"
            }
        
        return result

    # ============================================================================
    # 财务报表
    # ============================================================================
    
    async def get_income_statement(self, symbol: str, period: str = "annual", 
                                 limit: int = 5) -> Dict[str, Any]:
        """获取损益表"""
        endpoint = f"income-statement/{symbol}"
        params = {"period": period, "limit": limit}
        
        result = await self._make_request(endpoint, params)
        
        if result["success"] and result["data"]:
            statements = result["data"]
            
            processed_statements = []
            for stmt in statements:
                processed_statements.append({
                    "date": stmt.get("date"),
                    "symbol": stmt.get("symbol"),
                    "reported_currency": stmt.get("reportedCurrency"),
                    "cik": stmt.get("cik"),
                    "filling_date": stmt.get("fillingDate"),
                    "accepted_date": stmt.get("acceptedDate"),
                    "calendar_year": stmt.get("calendarYear"),
                    "period": stmt.get("period"),
                    "revenue": stmt.get("revenue"),
                    "cost_of_revenue": stmt.get("costOfRevenue"),
                    "gross_profit": stmt.get("grossProfit"),
                    "gross_profit_ratio": stmt.get("grossProfitRatio"),
                    "research_and_development": stmt.get("researchAndDevelopmentExpenses"),
                    "general_admin": stmt.get("generalAndAdministrativeExpenses"),
                    "selling_marketing": stmt.get("sellingAndMarketingExpenses"),
                    "selling_general_admin": stmt.get("sellingGeneralAndAdministrativeExpenses"),
                    "other_expenses": stmt.get("otherExpenses"),
                    "operating_expenses": stmt.get("operatingExpenses"),
                    "cost_and_expenses": stmt.get("costAndExpenses"),
                    "interest_income": stmt.get("interestIncome"),
                    "interest_expense": stmt.get("interestExpense"),
                    "depreciation_amortization": stmt.get("depreciationAndAmortization"),
                    "ebitda": stmt.get("ebitda"),
                    "operating_income": stmt.get("operatingIncome"),
                    "operating_income_ratio": stmt.get("operatingIncomeRatio"),
                    "total_other_income": stmt.get("totalOtherIncomeExpensesNet"),
                    "income_before_tax": stmt.get("incomeBeforeTax"),
                    "income_before_tax_ratio": stmt.get("incomeBeforeTaxRatio"),
                    "income_tax_expense": stmt.get("incomeTaxExpense"),
                    "net_income": stmt.get("netIncome"),
                    "net_income_ratio": stmt.get("netIncomeRatio"),
                    "eps": stmt.get("eps"),
                    "eps_diluted": stmt.get("epsdiluted"),
                    "weighted_average_shares": stmt.get("weightedAverageShsOut"),
                    "weighted_average_shares_diluted": stmt.get("weightedAverageShsOutDil")
                })
            
            return {
                "success": True,
                "symbol": symbol,
                "period": period,
                "statements": processed_statements,
                "total_count": len(processed_statements),
                "source": "fmp"
            }
        
        return {"success": False, "error": "无法获取损益表"}
    
    async def get_balance_sheet(self, symbol: str, period: str = "annual", 
                              limit: int = 5) -> Dict[str, Any]:
        """获取资产负债表"""
        endpoint = f"balance-sheet-statement/{symbol}"
        params = {"period": period, "limit": limit}
        
        result = await self._make_request(endpoint, params)
        
        if result["success"] and result["data"]:
            statements = result["data"]
            
            processed_statements = []
            for stmt in statements:
                processed_statements.append({
                    "date": stmt.get("date"),
                    "symbol": stmt.get("symbol"),
                    "reported_currency": stmt.get("reportedCurrency"),
                    "cik": stmt.get("cik"),
                    "filling_date": stmt.get("fillingDate"),
                    "accepted_date": stmt.get("acceptedDate"),
                    "calendar_year": stmt.get("calendarYear"),
                    "period": stmt.get("period"),
                    # 资产
                    "cash_and_cash_equivalents": stmt.get("cashAndCashEquivalents"),
                    "short_term_investments": stmt.get("shortTermInvestments"),
                    "cash_and_short_term_investments": stmt.get("cashAndShortTermInvestments"),
                    "net_receivables": stmt.get("netReceivables"),
                    "inventory": stmt.get("inventory"),
                    "other_current_assets": stmt.get("otherCurrentAssets"),
                    "total_current_assets": stmt.get("totalCurrentAssets"),
                    "property_plant_equipment": stmt.get("propertyPlantEquipmentNet"),
                    "goodwill": stmt.get("goodwill"),
                    "intangible_assets": stmt.get("intangibleAssets"),
                    "goodwill_and_intangible": stmt.get("goodwillAndIntangibleAssets"),
                    "long_term_investments": stmt.get("longTermInvestments"),
                    "tax_assets": stmt.get("taxAssets"),
                    "other_non_current_assets": stmt.get("otherNonCurrentAssets"),
                    "total_non_current_assets": stmt.get("totalNonCurrentAssets"),
                    "other_assets": stmt.get("otherAssets"),
                    "total_assets": stmt.get("totalAssets"),
                    # 负债
                    "account_payables": stmt.get("accountPayables"),
                    "short_term_debt": stmt.get("shortTermDebt"),
                    "tax_payables": stmt.get("taxPayables"),
                    "deferred_revenue": stmt.get("deferredRevenue"),
                    "other_current_liabilities": stmt.get("otherCurrentLiabilities"),
                    "total_current_liabilities": stmt.get("totalCurrentLiabilities"),
                    "long_term_debt": stmt.get("longTermDebt"),
                    "deferred_revenue_non_current": stmt.get("deferredRevenueNonCurrent"),
                    "deferred_tax_liabilities": stmt.get("deferredTaxLiabilitiesNonCurrent"),
                    "other_non_current_liabilities": stmt.get("otherNonCurrentLiabilities"),
                    "total_non_current_liabilities": stmt.get("totalNonCurrentLiabilities"),
                    "other_liabilities": stmt.get("otherLiabilities"),
                    "capital_lease_obligations": stmt.get("capitalLeaseObligations"),
                    "total_liabilities": stmt.get("totalLiabilities"),
                    # 股东权益
                    "preferred_stock": stmt.get("preferredStock"),
                    "common_stock": stmt.get("commonStock"),
                    "retained_earnings": stmt.get("retainedEarnings"),
                    "accumulated_other_comprehensive_income": stmt.get("accumulatedOtherComprehensiveIncomeLoss"),
                    "other_stockholder_equity": stmt.get("othertotalStockholdersEquity"),
                    "total_stockholders_equity": stmt.get("totalStockholdersEquity"),
                    "total_equity": stmt.get("totalEquity"),
                    "total_liabilities_and_equity": stmt.get("totalLiabilitiesAndStockholdersEquity"),
                    "minority_interest": stmt.get("minorityInterest"),
                    "total_liabilities_and_total_equity": stmt.get("totalLiabilitiesAndTotalEquity"),
                    "total_investments": stmt.get("totalInvestments"),
                    "total_debt": stmt.get("totalDebt"),
                    "net_debt": stmt.get("netDebt")
                })
            
            return {
                "success": True,
                "symbol": symbol,
                "period": period,
                "statements": processed_statements,
                "total_count": len(processed_statements),
                "source": "fmp"
            }
        
        return {"success": False, "error": "无法获取资产负债表"}

    # ============================================================================
    # 估值指标
    # ============================================================================
    
    async def get_ratios(self, symbol: str, period: str = "annual", 
                        limit: int = 5) -> Dict[str, Any]:
        """获取财务比率"""
        endpoint = f"ratios/{symbol}"
        params = {"period": period, "limit": limit}
        
        result = await self._make_request(endpoint, params)
        
        if result["success"] and result["data"]:
            ratios = result["data"]
            
            processed_ratios = []
            for ratio in ratios:
                processed_ratios.append({
                    "date": ratio.get("date"),
                    "symbol": ratio.get("symbol"),
                    "period": ratio.get("period"),
                    # 流动性比率
                    "current_ratio": ratio.get("currentRatio"),
                    "quick_ratio": ratio.get("quickRatio"),
                    "cash_ratio": ratio.get("cashRatio"),
                    "days_of_sales_outstanding": ratio.get("daysOfSalesOutstanding"),
                    "days_of_inventory_outstanding": ratio.get("daysOfInventoryOutstanding"),
                    "operating_cycle": ratio.get("operatingCycle"),
                    "days_of_payables_outstanding": ratio.get("daysOfPayablesOutstanding"),
                    "cash_conversion_cycle": ratio.get("cashConversionCycle"),
                    # 盈利能力比率
                    "gross_profit_margin": ratio.get("grossProfitMargin"),
                    "operating_profit_margin": ratio.get("operatingProfitMargin"),
                    "pretax_profit_margin": ratio.get("pretaxProfitMargin"),
                    "net_profit_margin": ratio.get("netProfitMargin"),
                    "effective_tax_rate": ratio.get("effectiveTaxRate"),
                    "return_on_assets": ratio.get("returnOnAssets"),
                    "return_on_equity": ratio.get("returnOnEquity"),
                    "return_on_capital_employed": ratio.get("returnOnCapitalEmployed"),
                    "net_income_per_ebt": ratio.get("netIncomePerEBT"),
                    "ebt_per_ebit": ratio.get("ebtPerEbit"),
                    "ebit_per_revenue": ratio.get("ebitPerRevenue"),
                    # 杠杆比率
                    "debt_ratio": ratio.get("debtRatio"),
                    "debt_equity_ratio": ratio.get("debtEquityRatio"),
                    "long_term_debt_to_capitalization": ratio.get("longTermDebtToCapitalization"),
                    "total_debt_to_capitalization": ratio.get("totalDebtToCapitalization"),
                    "interest_coverage": ratio.get("interestCoverage"),
                    "cash_flow_to_debt_ratio": ratio.get("cashFlowToDebtRatio"),
                    "company_equity_multiplier": ratio.get("companyEquityMultiplier"),
                    # 效率比率
                    "receivables_turnover": ratio.get("receivablesTurnover"),
                    "payables_turnover": ratio.get("payablesTurnover"),
                    "inventory_turnover": ratio.get("inventoryTurnover"),
                    "fixed_asset_turnover": ratio.get("fixedAssetTurnover"),
                    "asset_turnover": ratio.get("assetTurnover"),
                    # 价格比率
                    "price_book_value_ratio": ratio.get("priceBookValueRatio"),
                    "price_to_book_ratio": ratio.get("priceToBookRatio"),
                    "price_to_sales_ratio": ratio.get("priceToSalesRatio"),
                    "price_earnings_ratio": ratio.get("priceEarningsRatio"),
                    "price_to_free_cash_flows_ratio": ratio.get("priceToFreeCashFlowsRatio"),
                    "price_to_operating_cash_flows_ratio": ratio.get("priceToOperatingCashFlowsRatio"),
                    "price_cash_flow_ratio": ratio.get("priceCashFlowRatio"),
                    "price_earnings_to_growth_ratio": ratio.get("priceEarningsToGrowthRatio"),
                    "price_sales_ratio": ratio.get("priceSalesRatio"),
                    "dividend_yield": ratio.get("dividendYield"),
                    "enterprise_value_multiple": ratio.get("enterpriseValueMultiple"),
                    "price_fair_value": ratio.get("priceFairValue")
                })
            
            return {
                "success": True,
                "symbol": symbol,
                "period": period,
                "ratios": processed_ratios,
                "total_count": len(processed_ratios),
                "source": "fmp"
            }
        
        return {"success": False, "error": "无法获取财务比率"}
    
    async def get_key_metrics(self, symbol: str, period: str = "annual", 
                            limit: int = 5) -> Dict[str, Any]:
        """获取关键指标"""
        endpoint = f"key-metrics/{symbol}"
        params = {"period": period, "limit": limit}
        
        result = await self._make_request(endpoint, params)
        
        if result["success"] and result["data"]:
            metrics = result["data"]
            
            processed_metrics = []
            for metric in metrics:
                processed_metrics.append({
                    "date": metric.get("date"),
                    "symbol": metric.get("symbol"),
                    "period": metric.get("period"),
                    "revenue_per_share": metric.get("revenuePerShare"),
                    "net_income_per_share": metric.get("netIncomePerShare"),
                    "operating_cash_flow_per_share": metric.get("operatingCashFlowPerShare"),
                    "free_cash_flow_per_share": metric.get("freeCashFlowPerShare"),
                    "cash_per_share": metric.get("cashPerShare"),
                    "book_value_per_share": metric.get("bookValuePerShare"),
                    "tangible_book_value_per_share": metric.get("tangibleBookValuePerShare"),
                    "shareholders_equity_per_share": metric.get("shareholdersEquityPerShare"),
                    "interest_debt_per_share": metric.get("interestDebtPerShare"),
                    "market_cap": metric.get("marketCap"),
                    "enterprise_value": metric.get("enterpriseValue"),
                    "pe_ratio": metric.get("peRatio"),
                    "price_to_sales_ratio": metric.get("priceToSalesRatio"),
                    "pocfratio": metric.get("pocfratio"),
                    "pfcfRatio": metric.get("pfcfRatio"),
                    "pb_ratio": metric.get("pbRatio"),
                    "ptb_ratio": metric.get("ptbRatio"),
                    "ev_to_sales": metric.get("evToSales"),
                    "enterprise_value_over_ebitda": metric.get("enterpriseValueOverEBITDA"),
                    "ev_to_operating_cash_flow": metric.get("evToOperatingCashFlow"),
                    "ev_to_free_cash_flow": metric.get("evToFreeCashFlow"),
                    "earnings_yield": metric.get("earningsYield"),
                    "free_cash_flow_yield": metric.get("freeCashFlowYield"),
                    "debt_to_equity": metric.get("debtToEquity"),
                    "debt_to_assets": metric.get("debtToAssets"),
                    "net_debt_to_ebitda": metric.get("netDebtToEBITDA"),
                    "current_ratio": metric.get("currentRatio"),
                    "interest_coverage": metric.get("interestCoverage"),
                    "income_quality": metric.get("incomeQuality"),
                    "dividend_yield": metric.get("dividendYield"),
                    "payout_ratio": metric.get("payoutRatio"),
                    "sales_general_and_administrative_to_revenue": metric.get("salesGeneralAndAdministrativeToRevenue"),
                    "research_and_ddevelopement_to_revenue": metric.get("researchAndDdevelopementToRevenue"),
                    "intangibles_to_total_assets": metric.get("intangiblesToTotalAssets"),
                    "capex_to_operating_cash_flow": metric.get("capexToOperatingCashFlow"),
                    "capex_to_revenue": metric.get("capexToRevenue"),
                    "capex_to_depreciation": metric.get("capexToDepreciation"),
                    "stock_based_compensation_to_revenue": metric.get("stockBasedCompensationToRevenue"),
                    "graham_number": metric.get("grahamNumber"),
                    "roic": metric.get("roic"),
                    "return_on_tangible_assets": metric.get("returnOnTangibleAssets"),
                    "graham_net_net": metric.get("grahamNetNet"),
                    "working_capital": metric.get("workingCapital"),
                    "tangible_asset_value": metric.get("tangibleAssetValue"),
                    "net_current_asset_value": metric.get("netCurrentAssetValue"),
                    "invested_capital": metric.get("investedCapital"),
                    "average_receivables": metric.get("averageReceivables"),
                    "average_payables": metric.get("averagePayables"),
                    "average_inventory": metric.get("averageInventory"),
                    "days_sales_outstanding": metric.get("daysSalesOutstanding"),
                    "days_payables_outstanding": metric.get("daysPayablesOutstanding"),
                    "days_of_inventory_on_hand": metric.get("daysOfInventoryOnHand"),
                    "receivables_turnover": metric.get("receivablesTurnover"),
                    "payables_turnover": metric.get("payablesTurnover"),
                    "inventory_turnover": metric.get("inventoryTurnover"),
                    "roe": metric.get("roe"),
                    "capex_per_share": metric.get("capexPerShare")
                })
            
            return {
                "success": True,
                "symbol": symbol,
                "period": period,
                "metrics": processed_metrics,
                "total_count": len(processed_metrics),
                "source": "fmp"
            }
        
        return {"success": False, "error": "无法获取关键指标"}

    # ============================================================================
    # 股票筛选
    # ============================================================================
    
    async def screen_stocks(self, market_cap_lower: int = None, market_cap_upper: int = None,
                          pe_lower: float = None, pe_upper: float = None,
                          dividend_lower: float = None, dividend_upper: float = None,
                          volume_lower: int = None, volume_upper: int = None,
                          sector: str = None, industry: str = None,
                          exchange: str = None, limit: int = 50) -> Dict[str, Any]:
        """股票筛选器"""
        endpoint = "stock-screener"
        params = {}
        
        # 构建筛选参数
        if market_cap_lower is not None:
            params['marketCapLowerThan'] = market_cap_lower
        if market_cap_upper is not None:
            params['marketCapMoreThan'] = market_cap_upper
        if pe_lower is not None:
            params['peLowerThan'] = pe_lower
        if pe_upper is not None:
            params['peMoreThan'] = pe_upper
        if dividend_lower is not None:
            params['dividendLowerThan'] = dividend_lower
        if dividend_upper is not None:
            params['dividendMoreThan'] = dividend_upper
        if volume_lower is not None:
            params['volumeLowerThan'] = volume_lower
        if volume_upper is not None:
            params['volumeMoreThan'] = volume_upper
        if sector:
            params['sector'] = sector
        if industry:
            params['industry'] = industry
        if exchange:
            params['exchange'] = exchange
        
        params['limit'] = limit
        
        result = await self._make_request(endpoint, params)
        
        if result["success"] and result["data"]:
            stocks = result["data"]
            
            return {
                "success": True,
                "criteria": params,
                "stocks": stocks,
                "total_count": len(stocks),
                "source": "fmp"
            }
        
        return result

# 创建全局FMP服务实例
fmp_service = None

def get_fmp_service() -> FMPService:
    """获取FMP服务实例"""
    global fmp_service
    if fmp_service is None:
        fmp_service = FMPService()
    return fmp_service

async def close_fmp_service():
    """关闭FMP服务"""
    global fmp_service
    if fmp_service:
        await fmp_service.close()
        fmp_service = None

# 测试函数
async def test_fmp_service():
    """测试FMP API服务"""
    service = get_fmp_service()
    
    print("🧪 测试FMP API服务...")
    
    # 测试公司档案
    print("\n1. 测试公司档案 (AAPL)...")
    profile_result = await service.get_company_profile("AAPL")
    print(f"结果: {profile_result.get('success', False)}")
    if profile_result.get('success'):
        data = profile_result['data']
        print(f"公司名称: {data.get('company_name')}")
        print(f"行业: {data.get('sector')} - {data.get('industry')}")
    
    # 测试损益表
    print("\n2. 测试损益表 (AAPL)...")
    income_result = await service.get_income_statement("AAPL", "annual", 2)
    print(f"结果: {income_result.get('success', False)}")
    if income_result.get('success'):
        statements = income_result.get('statements', [])
        print(f"损益表数量: {len(statements)}")
    
    # 测试财务比率
    print("\n3. 测试财务比率 (AAPL)...")
    ratios_result = await service.get_ratios("AAPL", "annual", 2)
    print(f"结果: {ratios_result.get('success', False)}")
    
    # 测试股票筛选
    print("\n4. 测试股票筛选...")
    screen_result = await service.screen_stocks(
        market_cap_lower=1000000000,  # 10亿美元以上
        pe_lower=5,
        pe_upper=30,
        limit=10
    )
    print(f"结果: {screen_result.get('success', False)}")
    if screen_result.get('success'):
        print(f"筛选出股票数量: {screen_result.get('total_count', 0)}")
    
    await service.close()
    print("\n✅ FMP API测试完成")

if __name__ == "__main__":
    asyncio.run(test_fmp_service())