"""
错误处理和日志增强系统
提供统一的错误处理、日志记录和监控功能
"""

import logging
import sys
import traceback
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import asyncio
from enum import Enum
from pathlib import Path

class ErrorSeverity(Enum):
    """错误严重程度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    """错误类别"""
    API_ERROR = "api_error"
    DATA_ERROR = "data_error"
    SECURITY_ERROR = "security_error"
    SYSTEM_ERROR = "system_error"
    NETWORK_ERROR = "network_error"
    VALIDATION_ERROR = "validation_error"
    AUTHENTICATION_ERROR = "auth_error"

class EnhancedFormatter(logging.Formatter):
    """增强的日志格式化器"""
    
    def __init__(self):
        super().__init__()
        
    def format(self, record):
        # 为不同日志级别使用不同的格式和颜色
        colors = {
            'DEBUG': '\033[36m',    # 青色
            'INFO': '\033[32m',     # 绿色  
            'WARNING': '\033[33m',  # 黄色
            'ERROR': '\033[31m',    # 红色
            'CRITICAL': '\033[35m', # 紫色
        }
        
        reset = '\033[0m'
        color = colors.get(record.levelname, '')
        
        # 构建增强的日志消息
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        
        formatted_message = (
            f"{color}[{timestamp}] "
            f"{record.levelname:8s} "
            f"{record.name:20s} "
            f"│ {record.getMessage()}"
            f"{reset}"
        )
        
        # 添加异常信息
        if record.exc_info:
            formatted_message += f"\n{color}Exception: {self.formatException(record.exc_info)}{reset}"
            
        return formatted_message

class ErrorCollector:
    """错误收集器"""
    
    def __init__(self, max_errors: int = 1000):
        self.max_errors = max_errors
        self.errors: List[Dict[str, Any]] = []
        self._lock = asyncio.Lock()
        
    async def add_error(
        self,
        error: Exception,
        severity: ErrorSeverity,
        category: ErrorCategory,
        context: Optional[Dict[str, Any]] = None,
        request_info: Optional[Dict[str, Any]] = None
    ):
        """添加错误记录"""
        async with self._lock:
            error_record = {
                "timestamp": datetime.now().isoformat(),
                "error_type": type(error).__name__,
                "message": str(error),
                "severity": severity.value,
                "category": category.value,
                "context": context or {},
                "request_info": request_info or {},
                "traceback": traceback.format_exc() if hasattr(error, '__traceback__') else None
            }
            
            self.errors.append(error_record)
            
            # 保持错误记录在限制范围内
            if len(self.errors) > self.max_errors:
                self.errors = self.errors[-self.max_errors:]
                
    def get_recent_errors(self, limit: int = 50) -> List[Dict[str, Any]]:
        """获取最近的错误"""
        return self.errors[-limit:]
        
    def get_error_stats(self) -> Dict[str, Any]:
        """获取错误统计"""
        if not self.errors:
            return {
                "total_errors": 0,
                "by_severity": {},
                "by_category": {},
                "recent_24h": 0
            }
            
        # 按严重程度统计
        severity_counts = {}
        category_counts = {}
        recent_24h = 0
        now = datetime.now()
        
        for error in self.errors:
            severity_counts[error["severity"]] = severity_counts.get(error["severity"], 0) + 1
            category_counts[error["category"]] = category_counts.get(error["category"], 0) + 1
            
            # 计算24小时内的错误
            error_time = datetime.fromisoformat(error["timestamp"].replace('Z', '+00:00'))
            if (now - error_time.replace(tzinfo=None)).days == 0:
                recent_24h += 1
                
        return {
            "total_errors": len(self.errors),
            "by_severity": severity_counts,
            "by_category": category_counts,
            "recent_24h": recent_24h,
            "last_error": self.errors[-1] if self.errors else None
        }

class TradingEngineErrorHandler:
    """交易引擎错误处理器"""
    
    def __init__(self, log_file: Optional[str] = None):
        self.error_collector = ErrorCollector()
        self.logger = self._setup_logger(log_file)
        
    def _setup_logger(self, log_file: Optional[str] = None) -> logging.Logger:
        """设置增强的日志记录器"""
        logger = logging.getLogger("arthera_trading")
        logger.setLevel(logging.DEBUG)
        
        # 清除现有的处理器
        logger.handlers.clear()
        
        # 控制台处理器
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(EnhancedFormatter())
        logger.addHandler(console_handler)
        
        # 文件处理器
        if log_file:
            log_path = Path(log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)
            
            file_handler = logging.FileHandler(log_file, encoding='utf-8')
            file_handler.setLevel(logging.DEBUG)
            file_formatter = logging.Formatter(
                '%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
            
        # 错误文件处理器
        if log_file:
            error_file = log_path.parent / f"{log_path.stem}_errors.log"
            error_handler = logging.FileHandler(error_file, encoding='utf-8')
            error_handler.setLevel(logging.ERROR)
            error_handler.setFormatter(file_formatter)
            logger.addHandler(error_handler)
            
        return logger
        
    async def handle_api_error(
        self,
        request: Request,
        error: Exception,
        context: Optional[Dict[str, Any]] = None
    ) -> JSONResponse:
        """处理API错误"""
        
        # 确定错误类型和严重程度
        if isinstance(error, HTTPException):
            severity = ErrorSeverity.MEDIUM if error.status_code >= 500 else ErrorSeverity.LOW
            category = ErrorCategory.API_ERROR
        elif isinstance(error, (ConnectionError, TimeoutError)):
            severity = ErrorSeverity.HIGH
            category = ErrorCategory.NETWORK_ERROR
        elif isinstance(error, (ValueError, TypeError)):
            severity = ErrorSeverity.MEDIUM
            category = ErrorCategory.VALIDATION_ERROR
        elif isinstance(error, PermissionError):
            severity = ErrorSeverity.HIGH
            category = ErrorCategory.SECURITY_ERROR
        else:
            severity = ErrorSeverity.HIGH
            category = ErrorCategory.SYSTEM_ERROR
            
        # 收集请求信息
        request_info = {
            "method": request.method,
            "url": str(request.url),
            "headers": dict(request.headers),
            "client_ip": request.client.host if request.client else None
        }
        
        # 隐藏敏感信息
        if "authorization" in request_info["headers"]:
            request_info["headers"]["authorization"] = "***HIDDEN***"
            
        # 记录错误
        await self.error_collector.add_error(
            error=error,
            severity=severity,
            category=category,
            context=context,
            request_info=request_info
        )
        
        # 记录日志
        if severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
            self.logger.error(
                f"API错误 [{severity.value.upper()}]: {str(error)} | "
                f"Path: {request.url.path} | "
                f"Method: {request.method} | "
                f"IP: {request_info['client_ip']}"
            )
        else:
            self.logger.warning(
                f"API警告: {str(error)} | Path: {request.url.path}"
            )
            
        # 构建错误响应
        if isinstance(error, HTTPException):
            status_code = error.status_code
            detail = error.detail
        else:
            status_code = 500
            detail = "内部服务器错误"
            
        # 在开发环境中提供更多错误信息
        error_response = {
            "error": {
                "message": detail,
                "type": type(error).__name__,
                "timestamp": datetime.now().isoformat(),
                "request_id": id(request)
            }
        }
        
        # 在开发模式下添加调试信息
        if context and context.get("debug_mode"):
            error_response["error"]["debug_info"] = {
                "traceback": traceback.format_exc(),
                "context": context
            }
            
        return JSONResponse(
            status_code=status_code,
            content=error_response
        )
        
    async def handle_data_error(
        self,
        error: Exception,
        data_source: str,
        symbol: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        """处理数据错误"""
        
        error_context = {
            "data_source": data_source,
            "symbol": symbol,
            **(context or {})
        }
        
        await self.error_collector.add_error(
            error=error,
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.DATA_ERROR,
            context=error_context
        )
        
        self.logger.warning(
            f"数据源错误 [{data_source}]: {str(error)} | Symbol: {symbol}"
        )
        
    async def handle_security_error(
        self,
        error: Exception,
        operation: str,
        user_info: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        """处理安全错误"""
        
        error_context = {
            "operation": operation,
            "user_info": user_info or {},
            **(context or {})
        }
        
        await self.error_collector.add_error(
            error=error,
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.SECURITY_ERROR,
            context=error_context
        )
        
        self.logger.critical(
            f"安全错误 [{operation}]: {str(error)} | "
            f"User: {user_info.get('user_id', 'unknown') if user_info else 'unknown'}"
        )
        
    def log_info(self, message: str, **kwargs):
        """记录信息日志"""
        self.logger.info(f"{message} | {json.dumps(kwargs) if kwargs else ''}")
        
    def log_warning(self, message: str, **kwargs):
        """记录警告日志"""
        self.logger.warning(f"{message} | {json.dumps(kwargs) if kwargs else ''}")
        
    def log_error(self, message: str, **kwargs):
        """记录错误日志"""
        self.logger.error(f"{message} | {json.dumps(kwargs) if kwargs else ''}")
        
    def log_debug(self, message: str, **kwargs):
        """记录调试日志"""
        self.logger.debug(f"{message} | {json.dumps(kwargs) if kwargs else ''}")
        
    async def get_health_status(self) -> Dict[str, Any]:
        """获取错误处理器健康状态"""
        error_stats = self.error_collector.get_error_stats()
        
        # 计算健康分数
        health_score = 100
        if error_stats["recent_24h"] > 100:
            health_score -= 20
        if error_stats["by_severity"].get("critical", 0) > 0:
            health_score -= 30
        if error_stats["by_severity"].get("high", 0) > 10:
            health_score -= 15
            
        health_status = "healthy"
        if health_score < 70:
            health_status = "degraded"
        if health_score < 50:
            health_status = "unhealthy"
            
        return {
            "status": health_status,
            "health_score": max(0, health_score),
            "error_statistics": error_stats,
            "logging_active": True,
            "handlers_count": len(self.logger.handlers),
            "timestamp": datetime.now().isoformat()
        }

# 全局错误处理器实例
error_handler = TradingEngineErrorHandler(
    log_file="logs/trading_engine.log"
)