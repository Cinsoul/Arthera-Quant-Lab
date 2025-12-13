"""
设置相关API端点
处理API密钥配置、服务状态管理等
"""

import os
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging

from backend.data_provider.service_config_manager import (
    get_service_config_manager, 
    update_service_api_key,
    test_service_connection
)
from .preferences_store import load_preferences, save_preferences
from .security import (
    require_admin,
    require_csrf,
    issue_csrf_token,
)

logger = logging.getLogger(__name__)

# 创建路由器
router = APIRouter(prefix="/api/settings", tags=["settings"])

# 请求模型
class ApiKeyUpdate(BaseModel):
    service: str
    api_key: str

class ServiceTest(BaseModel):
    service: str

class PreferencesPayload(BaseModel):
    preferences: Dict[str, Any]

# API端点
@router.get("/csrf-token")
async def get_csrf_token(response: Response, _: str = Depends(require_admin)):
    token = issue_csrf_token(response)
    ttl = int(os.getenv("SETTINGS_SESSION_TTL", "3600"))
    return {"success": True, "csrfToken": token, "expiresIn": ttl}

@router.get("/services/status")
async def get_services_status(_: str = Depends(require_admin)):
    """获取所有服务状态"""
    try:
        manager = get_service_config_manager()
        status = manager.get_all_services_status()
        
        return {
            "success": True,
            "services": status,
            "message": "服务状态获取成功"
        }
        
    except Exception as e:
        logger.error(f"获取服务状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api-key/update")
async def update_api_key(
    request: ApiKeyUpdate,
    _: str = Depends(require_admin),
    __: str = Depends(require_csrf)
):
    """更新API密钥"""
    try:
        success = await update_service_api_key(request.service, request.api_key)
        
        if success:
            return {
                "success": True,
                "message": f"{request.service} API密钥更新成功"
            }
        else:
            return {
                "success": False,
                "error": "API密钥更新失败"
            }
            
    except Exception as e:
        logger.error(f"更新API密钥失败 {request.service}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/service/test")
async def test_service(
    request: ServiceTest,
    _: str = Depends(require_admin),
    __: str = Depends(require_csrf)
):
    """测试服务连接"""
    try:
        result = await test_service_connection(request.service)
        
        return {
            "success": result.get("success", False),
            "service": request.service,
            "message": "连接测试完成",
            "details": result
        }
        
    except Exception as e:
        logger.error(f"服务连接测试失败 {request.service}: {e}")
        return {
            "success": False,
            "service": request.service,
            "error": str(e),
            "message": "连接测试失败"
        }

@router.delete("/api-key/{service}")
async def remove_api_key(
    service: str,
    _: str = Depends(require_admin),
    __: str = Depends(require_csrf)
):
    """移除API密钥"""
    try:
        manager = get_service_config_manager()
        success = manager.remove_api_key(service)
        
        if success:
            return {
                "success": True,
                "message": f"{service} API密钥已移除"
            }
        else:
            return {
                "success": False,
                "error": "API密钥移除失败"
            }
            
    except Exception as e:
        logger.error(f"移除API密钥失败 {service}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config/export")
async def export_config(_: str = Depends(require_admin)):
    """导出配置"""
    try:
        manager = get_service_config_manager()
        config = manager.export_config()
        
        return {
            "success": True,
            "config": config,
            "message": "配置导出成功"
        }
        
    except Exception as e:
        logger.error(f"导出配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available-services")
async def get_available_services(_: str = Depends(require_admin)):
    """获取可用服务列表"""
    try:
        services = [
            {
                "id": "finnhub",
                "name": "Finnhub",
                "description": "股票、外汇、加密货币实时数据",
                "website": "https://finnhub.io",
                "data_types": ["实时股价", "技术指标", "财报数据", "新闻"]
            },
            {
                "id": "fmp",
                "name": "Financial Modeling Prep",
                "description": "美股财务数据和估值指标",
                "website": "https://financialmodelingprep.com",
                "data_types": ["财务报表", "估值指标", "股票筛选", "财务比率"]
            },
            {
                "id": "tiingo",
                "name": "Tiingo",
                "description": "股票和ETF历史数据",
                "website": "https://api.tiingo.com",
                "data_types": ["历史价格", "分红数据", "基本面数据", "新闻"]
            },
            {
                "id": "twelvedata",
                "name": "Twelve Data",
                "description": "股票、外汇、加密货币、ETF数据",
                "website": "https://twelvedata.com",
                "data_types": ["实时价格", "历史数据", "技术指标", "基本面"]
            },
            {
                "id": "databento",
                "name": "Databento", 
                "description": "专业级高频市场数据",
                "website": "https://databento.com",
                "data_types": ["Level1/Level2", "Tick数据", "成交量分布", "历史数据"]
            },
            {
                "id": "fred",
                "name": "FRED",
                "description": "美联储经济数据",
                "website": "https://fred.stlouisfed.org",
                "data_types": ["GDP", "通胀率", "失业率", "利率"]
            },
            {
                "id": "alpha_vantage",
                "name": "Alpha Vantage",
                "description": "股票和外汇数据",
                "website": "https://www.alphavantage.co",
                "data_types": ["股票价格", "技术指标", "外汇汇率", "数字货币"]
            },
            {
                "id": "quandl",
                "name": "Quandl",
                "description": "金融和经济数据",
                "website": "https://www.quandl.com",
                "data_types": ["股票数据", "期货数据", "经济指标", "另类数据"]
            },
            {
                "id": "news_api",
                "name": "News API",
                "description": "全球新闻和财经资讯",
                "website": "https://newsapi.org",
                "data_types": ["财经新闻", "市场资讯", "公司新闻", "情绪分析"]
            }
        ]
        
        return {
            "success": True,
            "services": services,
            "total_services": len(services),
            "message": "可用服务列表获取成功"
        }
        
    except Exception as e:
        logger.error(f"获取可用服务列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/service/{service_name}/info")
async def get_service_info(service_name: str):
    """获取特定服务的详细信息"""
    try:
        manager = get_service_config_manager()
        
        # 服务详细信息
        service_info_map = {
            "finnhub": {
                "name": "Finnhub",
                "description": "实时股票、外汇、加密货币数据提供商",
                "api_doc": "https://finnhub.io/docs/api",
                "rate_limits": "每分钟60次请求",
                "data_coverage": "全球股票市场、加密货币、外汇",
                "free_tier": "每月1000次API调用"
            },
            "fmp": {
                "name": "Financial Modeling Prep",
                "description": "美股财务数据和基本面分析",
                "api_doc": "https://financialmodelingprep.com/developer/docs",
                "rate_limits": "每分钟300次请求",
                "data_coverage": "美股财务报表、估值指标、财务比率",
                "free_tier": "每天250次API调用"
            },
            # 添加其他服务信息...
        }
        
        if service_name not in service_info_map:
            raise HTTPException(status_code=404, detail="服务未找到")
        
        service_info = service_info_map[service_name]
        service_status = manager.get_all_services_status().get(service_name, {})
        
        return {
            "success": True,
            "service": {
                **service_info,
                "id": service_name,
                "status": service_status
            },
            "message": "服务信息获取成功"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取服务信息失败 {service_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preferences")
async def get_preferences(_: str = Depends(require_admin)):
    try:
        prefs = load_preferences()
        return {
            "success": True,
            "preferences": prefs
        }
    except Exception as e:
        logger.error(f"加载偏好设置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preferences")
async def update_preferences(
    payload: PreferencesPayload,
    _: str = Depends(require_admin),
    __: str = Depends(require_csrf)
):
    try:
        saved = save_preferences(payload.preferences)
        return {
            "success": True,
            "preferences": saved,
            "message": "偏好设置已更新"
        }
    except Exception as e:
        logger.error(f"更新偏好设置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
