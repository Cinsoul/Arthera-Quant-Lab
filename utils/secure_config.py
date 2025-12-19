"""
安全配置管理器
处理API密钥加密存储和访问控制
"""

import os
import json
import base64
import hashlib
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

class SecureConfigManager:
    """安全配置管理器"""
    
    def __init__(self, config_path: str = ".env"):
        self.config_path = config_path
        self.encrypted_keys_path = "config/encrypted_keys.json"
        self._encryption_key = None
        self._load_environment()
        
    def _load_environment(self):
        """加载环境变量"""
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            os.environ[key.strip()] = value.strip()
                logger.info("✅ 环境变量加载成功")
            except Exception as e:
                logger.error(f"❌ 环境变量加载失败: {e}")
        else:
            logger.warning("⚠️ 未找到.env文件，使用系统环境变量")
            
    def _get_encryption_key(self) -> bytes:
        """获取或生成加密密钥"""
        if self._encryption_key:
            return self._encryption_key
            
        # 从环境变量获取
        env_key = os.getenv('ENCRYPTION_KEY')
        if env_key:
            self._encryption_key = env_key.encode()
            return self._encryption_key
            
        # 生成新密钥
        self._encryption_key = Fernet.generate_key()
        logger.warning("⚠️ 生成了新的加密密钥，请保存ENCRYPTION_KEY环境变量")
        return self._encryption_key
        
    def encrypt_sensitive_data(self, data: Dict[str, Any]) -> str:
        """加密敏感数据"""
        try:
            f = Fernet(self._get_encryption_key())
            json_data = json.dumps(data)
            encrypted = f.encrypt(json_data.encode())
            return base64.b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"❌ 数据加密失败: {e}")
            raise
            
    def decrypt_sensitive_data(self, encrypted_data: str) -> Dict[str, Any]:
        """解密敏感数据"""
        try:
            f = Fernet(self._get_encryption_key())
            encrypted = base64.b64decode(encrypted_data.encode())
            decrypted = f.decrypt(encrypted)
            return json.loads(decrypted.decode())
        except Exception as e:
            logger.error(f"❌ 数据解密失败: {e}")
            raise
            
    def get_api_key(self, service: str, required: bool = False) -> Optional[str]:
        """安全获取API密钥"""
        # 环境变量名映射
        key_mapping = {
            'tushare': 'TUSHARE_TOKEN',
            'finnhub': 'FINNHUB_API_KEY',
            'alpha_vantage': 'ALPHA_VANTAGE_API_KEY',
            'polygon': 'POLYGON_API_KEY',
            'alpaca_key': 'ALPACA_API_KEY',
            'alpaca_secret': 'ALPACA_SECRET_KEY',
            'openai': 'OPENAI_API_KEY',
            'deepseek': 'DEEPSEEK_API_KEY',
            'claude': 'CLAUDE_API_KEY',
            'coinbase_key': 'COINBASE_API_KEY',
            'coinbase_secret': 'COINBASE_API_SECRET'
        }
        
        env_var = key_mapping.get(service, service.upper() + '_API_KEY')
        api_key = os.getenv(env_var)
        
        if not api_key and required:
            logger.error(f"❌ 必需的API密钥缺失: {service}")
            raise ValueError(f"Missing required API key for service: {service}")
            
        if api_key:
            # 记录密钥使用（隐藏实际值）
            masked_key = api_key[:4] + '*' * (len(api_key) - 8) + api_key[-4:] if len(api_key) > 8 else '*' * len(api_key)
            logger.debug(f"🔑 API密钥获取: {service} -> {masked_key}")
            
        return api_key
        
    def validate_api_keys(self) -> Dict[str, bool]:
        """验证API密钥有效性"""
        validation_results = {}
        
        critical_keys = ['tushare', 'alpaca_key', 'alpaca_secret']
        optional_keys = ['finnhub', 'alpha_vantage', 'openai', 'deepseek']
        
        for key in critical_keys:
            api_key = self.get_api_key(key)
            validation_results[key] = {
                'present': bool(api_key),
                'valid_format': self._validate_key_format(key, api_key) if api_key else False,
                'critical': True
            }
            
        for key in optional_keys:
            api_key = self.get_api_key(key)
            validation_results[key] = {
                'present': bool(api_key),
                'valid_format': self._validate_key_format(key, api_key) if api_key else False,
                'critical': False
            }
            
        return validation_results
        
    def _validate_key_format(self, service: str, key: str) -> bool:
        """验证密钥格式"""
        if not key:
            return False
            
        # 基本格式验证
        format_rules = {
            'tushare': lambda k: len(k) >= 20 and k.isalnum(),
            'finnhub': lambda k: len(k) >= 20 and k.replace('_', '').replace('-', '').isalnum(),
            'alpha_vantage': lambda k: len(k) >= 15 and k.isalnum(),
            'alpaca_key': lambda k: len(k) >= 20 and k.isalnum(),
            'alpaca_secret': lambda k: len(k) >= 30,
            'openai': lambda k: k.startswith('sk-') and len(k) > 20,
            'deepseek': lambda k: len(k) >= 20
        }
        
        validator = format_rules.get(service)
        return validator(key) if validator else len(key) >= 10
        
    def is_production_environment(self) -> bool:
        """检查是否为生产环境"""
        env = os.getenv('ENVIRONMENT', 'development').lower()
        demo_mode = os.getenv('DEMO_MODE', 'true').lower() == 'true'
        return env == 'production' and not demo_mode
        
    def check_security_status(self) -> Dict[str, Any]:
        """检查安全状态"""
        validation = self.validate_api_keys()
        
        security_status = {
            'environment': os.getenv('ENVIRONMENT', 'development'),
            'demo_mode': os.getenv('DEMO_MODE', 'true') == 'true',
            'encryption_enabled': bool(os.getenv('ENCRYPTION_KEY')),
            'critical_keys_present': all(v['present'] for k, v in validation.items() if v.get('critical')),
            'api_key_validation': validation,
            'recommendations': []
        }
        
        # 安全建议
        if not security_status['encryption_enabled']:
            security_status['recommendations'].append("设置ENCRYPTION_KEY环境变量以启用数据加密")
            
        if security_status['environment'] == 'production' and security_status['demo_mode']:
            security_status['recommendations'].append("生产环境应禁用DEMO_MODE")
            
        missing_critical = [k for k, v in validation.items() if v.get('critical') and not v['present']]
        if missing_critical:
            security_status['recommendations'].append(f"配置关键API密钥: {', '.join(missing_critical)}")
            
        return security_status
        
    def safe_config_export(self) -> Dict[str, Any]:
        """安全导出配置（隐藏敏感信息）"""
        safe_config = {}
        
        # 非敏感配置项
        safe_keys = [
            'ENVIRONMENT', 'DEMO_MODE', 'REQUEST_TIMEOUT', 'POOLS_CONFIG_PATH',
            'POSTGRES_URL', 'REDIS_URL', 'IOS_WEBSOCKET_PORT', 'LOG_LEVEL'
        ]
        
        for key in safe_keys:
            value = os.getenv(key)
            if value:
                # 对数据库URL进行部分隐藏
                if 'URL' in key and '://' in value:
                    parts = value.split('@')
                    if len(parts) > 1:
                        safe_config[key] = parts[0].split('://')[0] + '://***@' + parts[1]
                    else:
                        safe_config[key] = value
                else:
                    safe_config[key] = value
                    
        return safe_config

# 全局配置管理器实例
config_manager = SecureConfigManager()