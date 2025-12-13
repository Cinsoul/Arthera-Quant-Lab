"""
服务配置管理器
动态管理各服务的API密钥配置，连接Settings界面与数据服务
"""

import json
import os
import base64
import secrets
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from .finnhub_service import FinnhubService, get_finnhub_service
from .fmp_service import FMPService, get_fmp_service
from .tiingo_service import TiingoService, get_tiingo_service
from .twelvedata_service import TwelveDataService, get_twelvedata_service
from .databento_service import DatabentoService, get_databento_service
from .news_api_service import NewsAPIService, get_news_api_service

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DEFAULT_SECRETS_DIR = os.path.join(BASE_DIR, '.secrets')
DEFAULT_CONFIG_FILE = os.path.join(DEFAULT_SECRETS_DIR, 'service_keys.json')

ENV_VAR_MAPPING = {
    'finnhub': 'FINNHUB_API_KEY',
    'fmp': 'FMP_API_KEY',
    'news_api': 'NEWSAPI_API_KEY',
    'tiingo': 'TIINGO_API_KEY',
    'twelvedata': 'TWELVEDATA_API_KEY',
    'databento': 'DATABENTO_API_KEY',
    'fred': 'FRED_API_KEY',
    'alpha_vantage': 'ALPHAVANTAGE_API_KEY',
    'quandl': 'QUANDL_API_KEY'
}

class ServiceConfigManager:
    """
    服务配置管理器
    负责动态配置各个数据服务的API密钥，支持加密存储和密钥轮转
    """
    
    def __init__(self, config_file: str = DEFAULT_CONFIG_FILE, enable_encryption: bool = True):
        self.config_file = config_file
        self.enable_encryption = enable_encryption
        self.config = self._load_config()
        self.services = {}
        self._encryption_key = None
        self._key_derivation_salt = self._get_or_create_salt()
        
        # 初始化加密
        if self.enable_encryption:
            self._initialize_encryption()
        
        # API密钥轮转配置
        self.key_rotation_days = 90  # 90天轮转
        self.key_usage_stats = {}  # 密钥使用统计
        
    def _get_or_create_salt(self) -> bytes:
        """获取或创建加密盐值"""
        salt_file = f"{self.config_file}.salt"
        try:
            if os.path.exists(salt_file):
                with open(salt_file, 'rb') as f:
                    return f.read()
            else:
                salt = os.urandom(16)
                with open(salt_file, 'wb') as f:
                    f.write(salt)
                return salt
        except Exception as e:
            logger.error(f"处理加密盐值失败: {e}")
            return os.urandom(16)
    
    def _initialize_encryption(self):
        """初始化加密系统"""
        try:
            # 使用系统密钥或生成新密钥
            master_key = self._get_master_key()
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=self._key_derivation_salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(master_key.encode()))
            self._encryption_key = Fernet(key)
            logger.info("API密钥加密系统初始化成功")
        except ImportError:
            logger.warning("cryptography库未安装，禁用加密功能")
            self.enable_encryption = False
        except Exception as e:
            logger.error(f"初始化加密系统失败: {e}")
            self.enable_encryption = False
    
    def _get_master_key(self) -> str:
        """获取主密钥"""
        # 优先从环境变量获取
        master_key = os.environ.get('ARTHERA_MASTER_KEY')
        if master_key:
            return master_key
        
        # 从机器标识生成
        machine_id = self._get_machine_identifier()
        return hashlib.sha256(machine_id.encode()).hexdigest()[:32]
    
    def _get_machine_identifier(self) -> str:
        """获取机器标识符"""
        try:
            import platform
            import uuid
            
            # 组合多个机器特征
            features = [
                platform.node(),
                str(uuid.getnode()),
                platform.system(),
                platform.processor()
            ]
            
            combined = ''.join(filter(None, features))
            return hashlib.md5(combined.encode()).hexdigest()
        except Exception:
            return "arthera-default-key"
    
    def _encrypt_data(self, data: str) -> str:
        """加密数据"""
        if not self.enable_encryption or not self._encryption_key:
            return data
        
        try:
            encrypted = self._encryption_key.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"数据加密失败: {e}")
            return data
    
    def _decrypt_data(self, encrypted_data: str) -> str:
        """解密数据"""
        if not self.enable_encryption or not self._encryption_key:
            return encrypted_data
        
        try:
            decoded = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self._encryption_key.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"数据解密失败: {e}")
            return encrypted_data
    
    def _load_config(self) -> Dict[str, Any]:
        """从文件加载配置"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                
                # 解密API密钥
                if self.enable_encryption:
                    for service_name, service_config in config.items():
                        if isinstance(service_config, dict) and 'api_key_encrypted' in service_config:
                            # 解密API密钥
                            encrypted_key = service_config.pop('api_key_encrypted')
                            service_config['api_key'] = self._decrypt_data(encrypted_key)
                
                return config
            return {}
        except Exception as e:
            logger.error(f"加载配置失败: {e}")
            return {}
    
    def _save_config(self) -> bool:
        """保存配置到文件"""
        try:
            os.makedirs(os.path.dirname(self.config_file), exist_ok=True)

            # 准备要保存的配置
            config_to_save = {}
            
            for service_name, service_config in self.config.items():
                if isinstance(service_config, dict):
                    saved_config = service_config.copy()
                    
                    # 加密API密钥
                    if 'api_key' in saved_config and self.enable_encryption:
                        api_key = saved_config.pop('api_key')
                        saved_config['api_key_encrypted'] = self._encrypt_data(api_key)
                    
                    config_to_save[service_name] = saved_config
                else:
                    config_to_save[service_name] = service_config
            
            # 创建备份
            self._create_backup()
            
            # 保存到文件
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config_to_save, f, ensure_ascii=False, indent=2)
            
            # 设置文件权限（仅所有者可读写）
            try:
                os.chmod(self.config_file, 0o600)
            except Exception:
                pass
            
            return True
        except Exception as e:
            logger.error(f"保存配置失败: {e}")
            return False
    
    def _create_backup(self):
        """创建配置文件备份"""
        try:
            if os.path.exists(self.config_file):
                os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
                backup_file = f"{self.config_file}.backup.{int(datetime.now().timestamp())}"
                with open(self.config_file, 'r') as src:
                    with open(backup_file, 'w') as dst:
                        dst.write(src.read())
                
                # 清理旧备份（只保留最近5个）
                self._cleanup_old_backups()
                
        except Exception as e:
            logger.error(f"创建备份失败: {e}")
    
    def _cleanup_old_backups(self):
        """清理旧备份文件"""
        try:
            backup_dir = os.path.dirname(self.config_file) or '.'
            prefix = os.path.basename(self.config_file) + '.backup.'
            backup_files = []
            for file in os.listdir(backup_dir):
                if file.startswith(prefix):
                    full_path = os.path.join(backup_dir, file)
                    backup_files.append((full_path, os.path.getmtime(full_path)))
            
            # 按修改时间排序，删除最旧的
            backup_files.sort(key=lambda x: x[1], reverse=True)
            
            for file, _ in backup_files[5:]:  # 保留最新5个
                try:
                    os.remove(file)
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"清理备份文件失败: {e}")
    
    def update_api_key(self, service_name: str, api_key: str, force_rotation: bool = False) -> bool:
        """更新指定服务的API密钥"""
        try:
            if not self._validate_api_key(api_key):
                logger.warning(f"API密钥无效: {service_name}")
                return False
            
            # 检查密钥是否需要轮转
            if not force_rotation and self._should_rotate_key(service_name):
                logger.info(f"建议轮转密钥: {service_name}")
            
            # 记录旧密钥（用于回滚）
            old_config = self.config.get(service_name, {})
            
            # 更新配置
            current_time = datetime.now().isoformat()
            self.config[service_name] = {
                "api_key": api_key.strip(),
                "enabled": True,
                "created_at": old_config.get('created_at', current_time),
                "updated_at": current_time,
                "rotation_count": old_config.get('rotation_count', 0) + 1,
                "last_used": current_time,
                "usage_count": old_config.get('usage_count', 0)
            }
            
            # 保存配置
            if self._save_config():
                # 重新初始化对应的服务
                self._reinitialize_service(service_name, api_key.strip())
                
                # 记录密钥轮转日志
                self._log_key_rotation(service_name, force_rotation)
                
                logger.info(f"更新API密钥成功: {service_name}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"更新API密钥失败 {service_name}: {e}")
            return False
    
    def _validate_api_key(self, api_key: str) -> bool:
        """验证API密钥格式"""
        if not api_key or not api_key.strip():
            return False
        
        # 基本长度检查
        if len(api_key.strip()) < 8:
            return False
        
        # 检查是否包含危险字符
        dangerous_chars = ['<', '>', '"', "'", '&', ';', '|', '`']
        if any(char in api_key for char in dangerous_chars):
            return False
        
        return True
    
    def _should_rotate_key(self, service_name: str) -> bool:
        """检查是否应该轮转密钥"""
        config = self.config.get(service_name, {})
        
        # 检查创建时间
        created_at = config.get('created_at')
        if created_at:
            try:
                created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                if datetime.now() - created_time > timedelta(days=self.key_rotation_days):
                    return True
            except:
                pass
        
        # 检查使用次数
        usage_count = config.get('usage_count', 0)
        if usage_count > 10000:  # 使用次数过多
            return True
        
        return False
    
    def _log_key_rotation(self, service_name: str, force_rotation: bool):
        """记录密钥轮转日志"""
        try:
            log_entry = {
                'service': service_name,
                'timestamp': datetime.now().isoformat(),
                'type': 'forced' if force_rotation else 'normal',
                'rotation_count': self.config[service_name].get('rotation_count', 0)
            }
            
            # 记录到审计日志
            audit_log_file = 'api_key_audit.log'
            with open(audit_log_file, 'a') as f:
                f.write(f"{json.dumps(log_entry)}\n")
                
        except Exception as e:
            logger.error(f"记录密钥轮转日志失败: {e}")
    
    def _reinitialize_service(self, service_name: str, api_key: str):
        """重新初始化指定服务"""
        try:
            service_mapping = {
                "finnhub": lambda: FinnhubService(api_key),
                "fmp": lambda: FMPService(api_key),
                "tiingo": lambda: TiingoService(api_key),
                "twelvedata": lambda: TwelveDataService(api_key),
                "databento": lambda: DatabentoService(api_key),
                "news_api": lambda: NewsAPIService(api_key)
            }
            
            if service_name in service_mapping:
                # 创建新的服务实例
                new_service = service_mapping[service_name]()
                self.services[service_name] = new_service
                
                # 更新全局服务实例
                self._update_global_service_instance(service_name, new_service)
                
                logger.info(f"重新初始化服务成功: {service_name}")
            else:
                logger.warning(f"未知服务: {service_name}")
                
        except Exception as e:
            logger.error(f"重新初始化服务失败 {service_name}: {e}")
    
    def _update_global_service_instance(self, service_name: str, new_service):
        """更新全局服务实例"""
        try:
            # 更新各服务模块中的全局实例
            import sys
            
            if service_name == "finnhub":
                import backend.data_provider.finnhub_service as fs
                fs.finnhub_service = new_service
            elif service_name == "fmp":
                import backend.data_provider.fmp_service as fmps
                fmps.fmp_service = new_service
            elif service_name == "tiingo":
                import backend.data_provider.tiingo_service as ts
                ts.tiingo_service = new_service
            elif service_name == "twelvedata":
                import backend.data_provider.twelvedata_service as tds
                tds.twelvedata_service = new_service
            elif service_name == "databento":
                import backend.data_provider.databento_service as ds
                ds.databento_service = new_service
            elif service_name == "news_api":
                import backend.data_provider.news_api_service as nas
                nas.news_api_service = new_service
                
        except Exception as e:
            logger.error(f"更新全局服务实例失败 {service_name}: {e}")
    
    def get_api_key(self, service_name: str) -> Optional[str]:
        """获取指定服务的API密钥"""
        env_override = self._get_env_override(service_name)
        if env_override:
            return env_override

        service_config = self.config.get(service_name, {})
        api_key = service_config.get("api_key")
        
        if api_key:
            # 更新使用统计
            self._update_key_usage_stats(service_name)
        
        return api_key

    def _get_env_override(self, service_name: str) -> Optional[str]:
        env_var = ENV_VAR_MAPPING.get(service_name)
        if not env_var:
            return None
        value = os.getenv(env_var)
        if value and value.strip():
            return value.strip()
        return None
    
    def _update_key_usage_stats(self, service_name: str):
        """更新密钥使用统计"""
        try:
            if service_name in self.config:
                current_time = datetime.now().isoformat()
                self.config[service_name]['last_used'] = current_time
                self.config[service_name]['usage_count'] = self.config[service_name].get('usage_count', 0) + 1
                
                # 异步保存（避免频繁写入）
                if self.config[service_name]['usage_count'] % 100 == 0:
                    self._save_config()
                    
        except Exception as e:
            logger.error(f"更新密钥使用统计失败: {e}")
    
    def is_service_enabled(self, service_name: str) -> bool:
        """检查服务是否启用"""
        if self._get_env_override(service_name):
            return True
        service_config = self.config.get(service_name, {})
        return service_config.get("enabled", False)
    
    def get_all_services_status(self) -> Dict[str, Any]:
        """获取所有服务的状态"""
        status = {}
        
        service_names = [
            "finnhub", "fmp", "tiingo", "twelvedata", 
            "databento", "news_api", "fred", "alpha_vantage", "quandl"
        ]
        
        for service_name in service_names:
            api_key = self.get_api_key(service_name)
            service_config = self.config.get(service_name, {})
            
            status[service_name] = {
                "configured": bool(api_key and api_key.strip()),
                "enabled": self.is_service_enabled(service_name),
                "api_key_masked": f"***{api_key[-4:]}" if api_key and len(api_key) > 4 else None,
                "created_at": service_config.get('created_at'),
                "updated_at": service_config.get('updated_at'),
                "last_used": service_config.get('last_used'),
                "usage_count": service_config.get('usage_count', 0),
                "rotation_count": service_config.get('rotation_count', 0),
                "needs_rotation": self._should_rotate_key(service_name),
                "security_score": self._calculate_security_score(service_name)
            }
        
        return status
    
    def _calculate_security_score(self, service_name: str) -> int:
        """计算服务的安全评分（0-100）"""
        score = 100
        config = self.config.get(service_name, {})
        
        # 密钥年龄扣分
        if self._should_rotate_key(service_name):
            score -= 30
        
        # 使用频率扣分
        usage_count = config.get('usage_count', 0)
        if usage_count > 5000:
            score -= 20
        
        # 轮转历史加分
        rotation_count = config.get('rotation_count', 0)
        if rotation_count > 0:
            score += min(10, rotation_count * 2)
        
        # 加密状态加分
        if self.enable_encryption:
            score += 10
        
        return max(0, min(100, score))
    
    async def test_service_connection(self, service_name: str) -> Dict[str, Any]:
        """测试服务连接"""
        try:
            api_key = self.get_api_key(service_name)
            if not api_key:
                return {
                    "success": False,
                    "error": "API密钥未配置"
                }
            
            # 根据服务类型执行测试
            if service_name == "finnhub":
                service = FinnhubService(api_key)
                result = await service.get_quote("AAPL")
            elif service_name == "fmp":
                service = FMPService(api_key)
                result = await service.get_company_quote("AAPL")
            elif service_name == "tiingo":
                service = TiingoService(api_key)
                result = await service.get_stock_price("AAPL")
            elif service_name == "twelvedata":
                service = TwelveDataService(api_key)
                result = await service.get_real_time_quote("AAPL")
            elif service_name == "databento":
                service = DatabentoService(api_key)
                result = await service.get_quote("AAPL")
            elif service_name == "news_api":
                service = NewsAPIService(api_key)
                result = await service.get_financial_news(5)
            elif service_name in ["fred", "alpha_vantage", "quandl"]:
                if not api_key.strip():
                    return {
                        "success": False,
                        "error": "API密钥未配置"
                    }

                return {
                    "success": True,
                    "tested_at": f"{service_name} API已记录，等待后端启用真实数据",
                    "note": "该数据源当前未启用实时请求，稍后将在数据服务中统一启用"
                }
            else:
                return {
                    "success": False,
                    "error": f"未知服务: {service_name}"
                }
            
            # 清理服务实例
            if hasattr(service, 'close'):
                await service.close()
            
            return {
                "success": result.get("success", False),
                "tested_at": f"{service_name} API测试",
                "error": result.get("error") if not result.get("success") else None
            }
            
        except Exception as e:
            logger.error(f"服务连接测试失败 {service_name}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def remove_api_key(self, service_name: str) -> bool:
        """移除指定服务的API密钥"""
        try:
            if service_name in self.config:
                del self.config[service_name]
                return self._save_config()
            return True
        except Exception as e:
            logger.error(f"移除API密钥失败 {service_name}: {e}")
            return False
    
    def export_config(self) -> Dict[str, Any]:
        """导出配置（不包含敏感信息）"""
        exported = {}
        for service_name, config in self.config.items():
            if isinstance(config, dict):
                exported[service_name] = {
                    "enabled": config.get("enabled", False),
                    "configured": bool(config.get("api_key")),
                    "created_at": config.get("created_at"),
                    "updated_at": config.get("updated_at"),
                    "usage_count": config.get("usage_count", 0),
                    "rotation_count": config.get("rotation_count", 0),
                    "security_score": self._calculate_security_score(service_name)
                }
        return exported
    
    def rotate_all_keys(self) -> Dict[str, bool]:
        """轮转所有需要轮转的密钥"""
        results = {}
        
        for service_name in self.config.keys():
            if self._should_rotate_key(service_name):
                # 这里需要用户手动提供新密钥，仅标记需要轮转
                results[service_name] = False
                logger.warning(f"服务 {service_name} 需要手动轮转密钥")
            else:
                results[service_name] = True
        
        return results
    
    def get_security_audit_report(self) -> Dict[str, Any]:
        """生成安全审计报告"""
        report = {
            "generated_at": datetime.now().isoformat(),
            "total_services": len(self.config),
            "encryption_enabled": self.enable_encryption,
            "services": {},
            "security_summary": {
                "high_risk": 0,
                "medium_risk": 0,
                "low_risk": 0
            }
        }
        
        for service_name, config in self.config.items():
            if isinstance(config, dict):
                security_score = self._calculate_security_score(service_name)
                needs_rotation = self._should_rotate_key(service_name)
                
                service_report = {
                    "security_score": security_score,
                    "needs_rotation": needs_rotation,
                    "usage_count": config.get("usage_count", 0),
                    "last_used": config.get("last_used"),
                    "rotation_count": config.get("rotation_count", 0)
                }
                
                # 分类风险等级
                if security_score < 50:
                    report["security_summary"]["high_risk"] += 1
                    service_report["risk_level"] = "high"
                elif security_score < 75:
                    report["security_summary"]["medium_risk"] += 1
                    service_report["risk_level"] = "medium"
                else:
                    report["security_summary"]["low_risk"] += 1
                    service_report["risk_level"] = "low"
                
                report["services"][service_name] = service_report
        
        return report
    
    def cleanup_expired_data(self):
        """清理过期数据"""
        try:
            # 清理旧的审计日志
            audit_log_file = 'api_key_audit.log'
            if os.path.exists(audit_log_file):
                cutoff_date = datetime.now() - timedelta(days=365)  # 保留1年
                
                with open(audit_log_file, 'r') as f:
                    lines = f.readlines()
                
                filtered_lines = []
                for line in lines:
                    try:
                        entry = json.loads(line.strip())
                        entry_date = datetime.fromisoformat(entry['timestamp'])
                        if entry_date > cutoff_date:
                            filtered_lines.append(line)
                    except:
                        continue
                
                with open(audit_log_file, 'w') as f:
                    f.writelines(filtered_lines)
            
            logger.info("清理过期数据完成")
            
        except Exception as e:
            logger.error(f"清理过期数据失败: {e}")

# 创建全局配置管理器实例
_config_manager = None

def get_service_config_manager() -> ServiceConfigManager:
    """获取服务配置管理器单例"""
    global _config_manager
    if _config_manager is None:
        _config_manager = ServiceConfigManager()
    return _config_manager

async def update_service_api_key(service_name: str, api_key: str) -> bool:
    """更新服务API密钥的便捷方法"""
    manager = get_service_config_manager()
    return manager.update_api_key(service_name, api_key)

async def test_service_connection(service_name: str) -> Dict[str, Any]:
    """测试服务连接的便捷方法"""
    manager = get_service_config_manager()
    return await manager.test_service_connection(service_name)
