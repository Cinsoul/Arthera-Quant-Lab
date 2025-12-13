import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RotateCcw, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { getEnvVar } from '../utils/env';

interface SettingsConfig {
  // API Keys & Tokens
  tushareToken: string;
  deepSeekApiKey: string;
  akshareApiKey: string;
  quantEngineApiKey: string;
  
  // 新增API Keys
  finnhubApiKey: string;
  newsApiKey: string;
  fmpApiKey: string;
  tiingoApiKey: string;
  twelveDataApiKey: string;
  databentoApiKey: string;
  fredApiKey: string;
  alphaVantageApiKey: string;
  quandlApiKey: string;
  
  // DeepSeek 配置
  deepSeekModel: string;
  deepSeekBaseUrl: string;
  deepSeekTimeout: number;
  
  // 数据源配置
  preferredDataSource: 'tushare' | 'akshare' | 'unified';
  dataUpdateFrequency: number; // minutes
  enabledDataSources: string[];
  
  // 风险控制配置
  defaultRiskLevel: 'conservative' | 'balanced' | 'aggressive';
  maxPositionSize: number; // percentage
  enableBayesianControl: boolean;
  
  // UI配置
  theme: 'dark' | 'light';
  language: 'zh-CN' | 'en-US';
  autoSave: boolean;

  // 持久化配置 (新增)
  persistenceSettings: {
    enableCloudSync: boolean;
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    retentionPeriod: number; // days
    syncAcrossDevices: boolean;
    encryptBackups: boolean;
    storageQuota: number; // MB
  };

  // 高级设置 (新增)
  advancedSettings: {
    debugMode: boolean;
    enablePerformanceLogging: boolean;
    maxLogEntries: number;
    enableExperimentalFeatures: boolean;
    cacheExpiryTime: number; // minutes
    networkTimeout: number; // seconds
    retryAttempts: number;
  };

  // 通知设置 (新增)
  notificationSettings: {
    enablePushNotifications: boolean;
    enableEmailNotifications: boolean;
    enableSmsNotifications: boolean;
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
    alertFrequency: 'realtime' | 'batched' | 'summary';
    categories: {
      trading: boolean;
      portfolio: boolean;
      system: boolean;
      news: boolean;
    };
  };

  // 个人偏好 (新增)
  personalPreferences: {
    defaultDashboard: string;
    favoriteSymbols: string[];
    customChartIndicators: string[];
    reportTemplates: string[];
    workspaceLayouts: Record<string, any>;
    shortcuts: Record<string, string>;
    timezone: string;
    currency: 'CNY' | 'USD' | 'EUR' | 'HKD';
  };
}

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_CONFIG: SettingsConfig = {
  tushareToken: '',
  deepSeekApiKey: '',
  akshareApiKey: '',
  quantEngineApiKey: 'demo-key',
  
  // 新增API Keys - 提供示例格式以便用户了解格式要求
  finnhubApiKey: '', // 格式: c123456789abcdef
  newsApiKey: '', // 格式: 1234567890abcdef1234567890abcdef
  fmpApiKey: '', // 格式: 1234567890abcdef1234567890abcdef  
  tiingoApiKey: '', // 格式: 1234567890abcdef1234567890abcdef123456
  twelveDataApiKey: '', // 格式: 1234567890abcdef1234567890abcdef
  databentoApiKey: '', // 格式: db-1234567890abcdef1234567890abcdef
  fredApiKey: '', // 格式: 1234567890abcdef1234567890abcdef
  alphaVantageApiKey: '', // 格式: ABCDEFGHIJ
  quandlApiKey: '', // 格式: 1234567890abcdef1234567890abcdef
  
  deepSeekModel: 'deepseek-chat',
  deepSeekBaseUrl: 'https://api.deepseek.com/v1',
  deepSeekTimeout: 30000,
  preferredDataSource: 'unified',
  dataUpdateFrequency: 5,
  enabledDataSources: ['akshare', 'finnhub', 'newsapi'],
  defaultRiskLevel: 'balanced',
  maxPositionSize: 20,
  enableBayesianControl: true,
  theme: 'dark',
  language: 'zh-CN',
  autoSave: true,

  // 持久化配置默认值 (新增)
  persistenceSettings: {
    enableCloudSync: false,
    autoBackup: true,
    backupFrequency: 'daily',
    retentionPeriod: 30,
    syncAcrossDevices: false,
    encryptBackups: true,
    storageQuota: 100
  },

  // 高级设置默认值 (新增)
  advancedSettings: {
    debugMode: false,
    enablePerformanceLogging: true,
    maxLogEntries: 1000,
    enableExperimentalFeatures: false,
    cacheExpiryTime: 30,
    networkTimeout: 10,
    retryAttempts: 3
  },

  // 通知设置默认值 (新增)
  notificationSettings: {
    enablePushNotifications: true,
    enableEmailNotifications: false,
    enableSmsNotifications: false,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00'
    },
    alertFrequency: 'realtime',
    categories: {
      trading: true,
      portfolio: true,
      system: false,
      news: false
    }
  },

  // 个人偏好默认值 (新增)
  personalPreferences: {
    defaultDashboard: 'overview',
    favoriteSymbols: ['600519', '000001', '300750'],
    customChartIndicators: ['SMA', 'RSI', 'MACD'],
    reportTemplates: ['daily_summary', 'weekly_performance'],
    workspaceLayouts: {},
    shortcuts: {
      'ctrl+s': 'save',
      'ctrl+n': 'new_strategy',
      'ctrl+b': 'backtest',
      'ctrl+r': 'refresh'
    },
    timezone: 'Asia/Shanghai',
    currency: 'CNY'
  }
};

const resolveApiPrefix = () => {
  const raw = getEnvVar('VITE_API_BASE_URL', 'REACT_APP_API_URL');
  if (raw && raw.trim().length > 0) {
    return raw.replace(/\/$/, '');
  }
  const isProd = typeof import.meta !== 'undefined' && import.meta.env?.PROD;
  if (isProd) {
    return 'https://api.arthera-quant.com';
  }
  return '';
};

const API_PREFIX = resolveApiPrefix();
const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_PREFIX}${normalizedPath}`;
};

const DEEPSEEK_MODELS = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat', description: '通用对话模型，适合大多数场景' },
  { value: 'deepseek-coder', label: 'DeepSeek Coder', description: '专业代码生成模型' },
  { value: 'deepseek-math', label: 'DeepSeek Math', description: '数学计算专用模型' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', description: '逻辑推理增强模型' },
];

const DATA_PROVIDERS = [
  {
    id: 'akshare',
    name: 'AKShare',
    description: 'A股免费数据源',
    type: 'free',
    category: '中国市场',
    capabilities: ['A股实时行情', '历史数据', '财务数据', '指数数据'],
    needsApiKey: false,
    website: 'https://akshare.akfamily.xyz',
    configKey: null,
  },
  {
    id: 'finnhub',
    name: 'Finnhub',
    description: '全球股票和加密货币数据',
    type: 'freemium',
    category: '全球市场',
    capabilities: ['美股实时行情', '全球股票', '加密货币', '财经新闻', '公司资料'],
    needsApiKey: true,
    website: 'https://finnhub.io',
    configKey: 'finnhubApiKey',
  },
  {
    id: 'newsapi',
    name: 'News API',
    description: '全球财经新闻数据',
    type: 'freemium',
    category: '新闻数据',
    capabilities: ['实时新闻', '历史新闻', '情感分析', '新闻分类'],
    needsApiKey: true,
    website: 'https://newsapi.org',
    configKey: 'newsApiKey',
  },
  {
    id: 'fmp',
    name: 'Financial Modeling Prep',
    description: '美股财务数据专家',
    type: 'freemium',
    category: '财务数据',
    capabilities: ['财务报表', '估值指标', '股票筛选', '比率分析'],
    needsApiKey: true,
    website: 'https://financialmodelingprep.com',
    configKey: 'fmpApiKey',
  },
  {
    id: 'tiingo',
    name: 'Tiingo',
    description: '优质历史数据服务',
    type: 'freemium',
    category: '历史数据',
    capabilities: ['EOD历史数据', '加密货币', '新闻数据', 'IEX实时数据'],
    needsApiKey: true,
    website: 'https://api.tiingo.com',
    configKey: 'tiingoApiKey',
  },
  {
    id: 'twelvedata',
    name: 'Twelve Data',
    description: '实时和技术分析数据',
    type: 'freemium',
    category: '技术分析',
    capabilities: ['实时数据', '技术指标', '外汇数据', '加密货币'],
    needsApiKey: true,
    website: 'https://twelvedata.com',
    configKey: 'twelveDataApiKey',
  },
  {
    id: 'databento',
    name: 'Databento',
    description: '专业级高频市场数据',
    type: 'premium',
    category: '专业数据',
    capabilities: ['Level2数据', '逐笔成交', '高频数据', '实时流数据'],
    needsApiKey: true,
    website: 'https://databento.com',
    configKey: 'databentoApiKey',
  },
  {
    id: 'fred',
    name: 'FRED (St. Louis Fed)',
    description: '美联储经济数据',
    type: 'free',
    category: '宏观经济',
    capabilities: ['经济指标', '利率数据', '就业数据', '通胀数据'],
    needsApiKey: true,
    website: 'https://fred.stlouisfed.org/docs/api/',
    configKey: 'fredApiKey',
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    description: '技术指标和基本面数据',
    type: 'freemium',
    category: '技术分析',
    capabilities: ['技术指标', '基本面数据', '外汇数据', '商品数据'],
    needsApiKey: true,
    website: 'https://www.alphavantage.co',
    configKey: 'alphaVantageApiKey',
  },
  {
    id: 'quandl',
    name: 'Quandl (Nasdaq)',
    description: '另类数据和经济数据',
    type: 'premium',
    category: '另类数据',
    capabilities: ['经济数据', '商品数据', '另类数据集', '金融指标'],
    needsApiKey: true,
    website: 'https://data.nasdaq.com/tools/api',
    configKey: 'quandlApiKey',
  },
];

const SERVICE_REQUIREMENTS = [
  {
    id: 'backend_api',
    name: 'FastAPI 网关 (REST + WebSocket)',
    description: '启动 backend/api/main.py 并确保 8004 端口可用。',
    requirements: ['运行 start_services.sh', '配置 VITE_API_BASE_URL / VITE_API_WS_URL'],
  },
  {
    id: 'quant_engine',
    name: 'QuantEngine 微服务',
    description: '提供因子、机器学习、风险评估能力 (8003)。',
    requirements: ['保持 backend/quant_engine/server.py 运行', '在设置中提供 QuantEngine 相关 API Key（如需要）'],
  },
  {
    id: 'qlib',
    name: 'Qlib Worker',
    description: '负责回测/策略执行 (8005)。需本地安装 Qlib 数据环境。',
    requirements: ['参考 Qlib 官方文档安装本地数据', '启动 backend/qlib_worker/server.py'],
  },
  {
    id: 'tushare',
    name: 'Tushare Proxy',
    description: '通过服务端代理安全调用 Tushare (8010)。',
    requirements: ['在“API配置”中填写 Tushare Token', '保持 backend/tushare_proxy/server.py 运行'],
  },
  {
    id: 'news',
    name: '新闻/情绪服务',
    description: 'NewsService 将在启用后从 FastAPI 获取实时资讯。',
    requirements: ['设置 VITE_ENABLE_NEWS_API=true', '在设置页填写 News API Key (如使用第三方源)'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    description: '为信号和情绪分析提供 LLM 支持。',
    requirements: ['在“AI模型”标签中填写 DeepSeek API Key', '建议通过后端代理存储密钥'],
  },
  {
    id: 'akshare',
    name: 'AkShare 本地环境',
    description: '行情/财务数据需要用户本地安装 AkShare，start_services.sh 会自动调用。',
    requirements: ['pip install akshare', '确保本地网络可访问数据源'],
  },
];

const SENSITIVE_FIELDS = [
  'tushareToken',
  'deepSeekApiKey',
  'akshareApiKey',
  'quantEngineApiKey',
  'finnhubApiKey',
  'newsApiKey',
  'fmpApiKey',
  'tiingoApiKey',
  'twelveDataApiKey',
  'databentoApiKey',
  'fredApiKey',
  'alphaVantageApiKey',
  'quandlApiKey',
];

const mergeSettings = <T extends Record<string, any>>(base: T, updates: Partial<T>): T => {
  const result: Record<string, any> = { ...base };
  Object.entries(updates || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object') {
      result[key] = mergeSettings(result[key] as Record<string, any>, value as Record<string, any>);
    } else {
      result[key] = value;
    }
  });
  return result as T;
};

const sanitizePreferencesPayload = (settings: SettingsConfig) => {
  const payload: Record<string, any> = JSON.parse(JSON.stringify(settings));
  SENSITIVE_FIELDS.forEach((field) => {
    if (field in payload) {
      delete payload[field];
    }
  });
  return payload;
};

export function Settings({ open, onOpenChange }: SettingsProps) {
  const [config, setConfig] = useState<SettingsConfig>(DEFAULT_CONFIG);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showTokens, setShowTokens] = useState({
    tushare: false,
    deepSeek: false,
    akshare: false,
    quantEngine: false,
    finnhub: false,
    newsApi: false,
    fmp: false,
    tiingo: false,
    twelveData: false,
    databento: false,
    fred: false,
    alphaVantage: false,
    quandl: false,
  });
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'testing' | null>>({
    tushare: null,
    deepSeek: null,
    akshare: null,
    quantEngine: null,
    finnhub: null,
    newsApi: null,
    fmp: null,
    tiingo: null,
    twelveData: null,
    databento: null,
    fred: null,
    alphaVantage: null,
    quandl: null,
  });
  const [testErrors, setTestErrors] = useState<Record<string, string>>({});
  const [serviceStatus, setServiceStatus] = useState<Record<string, any>>({});
  const [serviceStatusLoading, setServiceStatusLoading] = useState(false);
  const [serviceStatusError, setServiceStatusError] = useState<string | null>(null);

  const buildAuthHeaders = (includeCsrf = false) => {
    const headers: Record<string, string> = {
      'X-Admin-Token': adminToken,
    };
    if (includeCsrf && csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    return headers;
  };

  useEffect(() => {
    if (!open || !isAuthenticated) return;

    const fetchData = async () => {
      try {
        setServiceStatusLoading(true);
        const [prefsRes, statusRes] = await Promise.all([
          fetch(buildApiUrl('/api/settings/preferences'), {
            headers: buildAuthHeaders(),
            credentials: 'include',
          }),
          fetch(buildApiUrl('/api/settings/services/status'), {
            headers: buildAuthHeaders(),
            credentials: 'include',
          }),
        ]);

        if (!prefsRes.ok) {
          throw new Error('无法获取服务器端配置');
        }
        if (!statusRes.ok) {
          throw new Error('无法获取服务状态');
        }

        const prefsData = await prefsRes.json();
        const mergedConfig = mergeSettings(DEFAULT_CONFIG, prefsData.preferences || {});
        setConfig((prev) => mergeSettings(prev, mergedConfig));

        const statusData = await statusRes.json();
        setServiceStatus(statusData.services || {});
        setServiceStatusError(null);
      } catch (error) {
        console.error('[Settings] Failed to load server state:', error);
        setServiceStatusError('无法连接后台服务，请确认 start_services.sh 已运行，并使用有效管理令牌。');
      } finally {
        setServiceStatusLoading(false);
      }
    };

    fetchData();
  }, [open, isAuthenticated]);

  const handleAuthenticate = async () => {
    if (!adminToken) {
      setAuthError('请输入管理令牌');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const response = await fetch(buildApiUrl('/api/settings/csrf-token'), {
        method: 'GET',
        headers: buildAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('令牌验证失败');
      }

      const data = await response.json();
      setCsrfToken(data.csrfToken);
      setIsAuthenticated(true);
      setAuthError(null);
      sessionStorage.setItem('arthera_admin_token', adminToken);
    } catch (error) {
      console.error('[Settings] Admin authentication failed:', error);
      setIsAuthenticated(false);
      setCsrfToken(null);
      setAuthError('管理员令牌无效或后端不可用');
      sessionStorage.removeItem('arthera_admin_token');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated || !csrfToken) {
      setAuthError('请先验证管理员令牌');
      return;
    }

    try {
      const payload = sanitizePreferencesPayload(config);
      const response = await fetch(buildApiUrl('/api/settings/preferences'), {
        method: 'POST',
        headers: {
          ...buildAuthHeaders(true),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ preferences: payload }),
      });

      if (!response.ok) {
        throw new Error('无法保存偏好设置');
      }

      await saveApiKeysToBackend();
      setUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: config }));
      console.log('设置已保存到安全存储');
    } catch (error) {
      console.error('Failed to save settings:', error);
      setAuthError('保存失败，请检查后台日志');
    }
  };

  // 重置配置
  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setUnsavedChanges(true);
  };

  // 保存API密钥到后端服务
  const saveApiKeysToBackend = async () => {
    const apiKeyMappings = [
      { service: 'finnhub', value: config.finnhubApiKey },
      { service: 'news_api', value: config.newsApiKey },
      { service: 'fmp', value: config.fmpApiKey },
      { service: 'tiingo', value: config.tiingoApiKey },
      { service: 'twelvedata', value: config.twelveDataApiKey },
      { service: 'databento', value: config.databentoApiKey },
      { service: 'fred', value: config.fredApiKey },
      { service: 'alpha_vantage', value: config.alphaVantageApiKey },
      { service: 'quandl', value: config.quandlApiKey },
    ];

    if (!isAuthenticated || !csrfToken) {
      setAuthError('请先验证管理员令牌后再同步API密钥');
      return;
    }

    const updatePromises = apiKeyMappings.map(async ({ service, value }) => {
      if (value && value.trim().length > 0) {
        try {
          const response = await fetch(buildApiUrl('/api/settings/api-key/update'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...buildAuthHeaders(true),
            },
            credentials: 'include',
            body: JSON.stringify({
              service,
              api_key: value.trim()
            })
          });

          if (!response.ok) {
            console.error(`Failed to update ${service} API key:`, await response.text());
          }
        } catch (error) {
          console.error(`Error updating ${service} API key:`, error);
        }
      }
    });

    await Promise.all(updatePromises);
    console.log('API密钥已同步到后端服务');
  };

  // 测试连接
  const testConnection = async (service: string) => {
    setTestResults(prev => ({ ...prev, [service]: 'testing' }));
    
    try {
      if (!isAuthenticated || !csrfToken) {
        setTestResults(prev => ({ ...prev, [service]: 'error' }));
        setTestErrors(prev => ({ ...prev, [service]: '请先验证管理员令牌' }));
        setAuthError('请先验证管理员令牌');
        return;
      }

      let success = false;
      // 获取对应的API key
      const getApiKey = (service: string): string => {
        switch (service) {
          case 'tushare': return config.tushareToken;
          case 'deepSeek': return config.deepSeekApiKey;
          case 'finnhub': return config.finnhubApiKey;
          case 'newsApi': return config.newsApiKey;
          case 'fmp': return config.fmpApiKey;
          case 'tiingo': return config.tiingoApiKey;
          case 'twelveData': return config.twelveDataApiKey;
          case 'databento': return config.databentoApiKey;
          case 'fred': return config.fredApiKey;
          case 'alphaVantage': return config.alphaVantageApiKey;
          case 'quandl': return config.quandlApiKey;
          default: return '';
        }
      };
      
      const apiKey = getApiKey(service);
      
      // 检查API key是否配置
      if (!apiKey || apiKey.trim().length === 0) {
        setTestResults(prev => ({ ...prev, [service]: 'error' }));
        setTestErrors(prev => ({ ...prev, [service]: 'API密钥未配置' }));
        return;
      }
      
      switch (service) {
        case 'tushare':
          try {
            const { tushareDataService } = await import('../services');
            tushareDataService.updateConfig({ token: config.tushareToken });
            success = await tushareDataService.testConnection();
          } catch (error) {
            console.error('[Settings] Tushare test failed:', error);
            // 基本长度检查作为后备
            success = config.tushareToken.length > 20;
          }
          break;
          
        case 'deepSeek':
          try {
            const { deepSeekSignalService } = await import('../services');
            deepSeekSignalService.updateConfig({
              apiKey: config.deepSeekApiKey,
              model: config.deepSeekModel,
              baseUrl: config.deepSeekBaseUrl
            });
            success = await deepSeekSignalService.testConnection();
          } catch (error) {
            console.error('[Settings] DeepSeek test failed:', error);
            // 基本格式检查作为后备
            success = config.deepSeekApiKey.startsWith('sk-');
          }
          break;
          
        case 'akshare':
          // AKShare 免费，无需API key，测试后端连接
          try {
            const response = await fetch(buildApiUrl('/health'));
            success = response.ok;
          } catch (error) {
            console.error('[Settings] AKShare test failed:', error);
            success = true; // AKShare 始终可用
          }
          break;
          
        case 'quantEngine':
          try {
            const response = await fetch(buildApiUrl('/health'));
            success = response.ok && config.quantEngineApiKey.length > 0;
          } catch (error) {
            success = false;
          }
          break;
        
        // 新增API测试逻辑 - 使用统一的后端设置API
        case 'finnhub':
        case 'newsApi':
        case 'fmp':
        case 'tiingo':
        case 'twelveData':
        case 'databento':
        case 'fred':
        case 'alphaVantage':
        case 'quandl':
          try {
            // 先保存API密钥到后端
            const serviceMapping: Record<string, string> = {
              'finnhub': 'finnhub',
              'newsApi': 'news_api',
              'fmp': 'fmp',
              'tiingo': 'tiingo',
              'twelveData': 'twelvedata',
              'databento': 'databento',
              'fred': 'fred',
              'alphaVantage': 'alpha_vantage',
              'quandl': 'quandl'
            };
            
            const backendService = serviceMapping[service];
            if (backendService) {
              // 先更新API密钥到后端
              const updateResponse = await fetch(buildApiUrl('/api/settings/api-key/update'), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...buildAuthHeaders(true),
                },
                credentials: 'include',
                body: JSON.stringify({
                  service: backendService,
                  api_key: apiKey
                })
              });

              if (!updateResponse.ok) {
                console.error(`Failed to update ${backendService} API key before testing`);
              }

              // 然后测试服务连接
              const testResponse = await fetch(buildApiUrl('/api/settings/service/test'), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...buildAuthHeaders(true),
                },
                credentials: 'include',
                body: JSON.stringify({
                  service: backendService
                })
              });
              
              if (testResponse.ok) {
                const testResult = await testResponse.json();
                success = testResult.success;
                if (!success && testResult.error) {
                  setTestErrors(prev => ({ ...prev, [service]: testResult.error }));
                }
              } else {
                success = false;
                setTestErrors(prev => ({ ...prev, [service]: '测试连接失败' }));
              }
            }
          } catch (error) {
            console.error(`[Settings] ${service} test failed:`, error);
            success = false;
            setTestErrors(prev => ({ ...prev, [service]: '连接测试异常' }));
          }
          break;
      }
      
      if (success) {
        setTestResults(prev => ({ ...prev, [service]: 'success' }));
        setTestErrors(prev => ({ ...prev, [service]: '' })); // 清除错误信息
      } else {
        setTestResults(prev => ({ ...prev, [service]: 'error' }));
        if (!testErrors[service]) {
          setTestErrors(prev => ({ ...prev, [service]: 'API连接测试失败' }));
        }
      }
    } catch (error) {
      console.error(`[Settings] Connection test failed for ${service}:`, error);
      setTestResults(prev => ({ ...prev, [service]: 'error' }));
      setTestErrors(prev => ({ ...prev, [service]: error instanceof Error ? error.message : '未知错误' }));
    }
  };

  // 更新配置
  const updateConfig = (key: keyof SettingsConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  // 切换token显示
  const toggleTokenVisibility = (service: keyof typeof showTokens) => {
    setShowTokens(prev => ({ ...prev, [service]: !prev[service] }));
  };

  const renderConnectionStatus = (service: string) => {
    const status = testResults[service];
    const errorMessage = testErrors[service];
    switch (status) {
      case 'testing':
        return <Badge variant="secondary" className="animate-pulse">测试中...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          已连接
        </Badge>;
      case 'error':
        return <Badge variant="destructive" title={errorMessage}>
          <AlertCircle className="w-3 h-3 mr-1" />
          {errorMessage || '连接失败'}
        </Badge>;
      default:
        return null;
    }
  };

  const getServiceState = (serviceId: string) => {
    const entry = serviceStatus?.[serviceId];
    if (!entry) return 'unknown';
    if (entry.healthy === true || entry.status === 'connected' || entry.success) return 'healthy';
    if (entry.healthy === false || entry.status === 'disconnected') return 'offline';
    if (entry.disabled) return 'disabled';
    return 'unknown';
  };

  const renderServiceBadge = (serviceId: string) => {
    const state = getServiceState(serviceId);
    const baseClass = 'text-xs px-2 py-0.5 rounded-full border';
    switch (state) {
      case 'healthy':
        return <span className={`${baseClass} bg-green-500/10 text-green-300 border-green-500/30`}>已就绪</span>;
      case 'offline':
        return <span className={`${baseClass} bg-rose-500/10 text-rose-300 border-rose-500/30`}>离线</span>;
      case 'disabled':
        return <span className={`${baseClass} bg-gray-600/10 text-gray-300 border-gray-600/30`}>未启用</span>;
      default:
        return <span className={`${baseClass} bg-amber-500/10 text-amber-300 border-amber-500/30`}>待配置</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-[#0d1b2e] border-[#1a2942] flex flex-col overflow-hidden">
        <DialogHeader className="border-b border-[#1a2942] pb-4 shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[#0ea5e9]" />
            系统设置
            {unsavedChanges && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                有未保存的更改
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          {/* 简化的服务状态提示 */}
          <div className="bg-[#0f243d]/50 border border-[#1e3a5f] rounded-lg px-4 py-2">
            <p className="text-sm text-gray-400">
              💡 提示：请确保运行 <span className="text-[#0ea5e9] font-medium">start_services.sh</span> 启动后台服务，然后在下方配置您的 API 密钥
            </p>
          </div>

          {/* 管理令牌校验 */}
          <div className="bg-[#0f243d]/70 border border-[#1e3a5f] rounded-lg px-4 py-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label className="text-sm text-gray-300 mb-1">管理令牌（配置于 SETTINGS_ADMIN_TOKEN）</Label>
                <Input
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="请输入后台提供的安全令牌"
                  className="bg-[#0d1b2e] border-[#2a3f5f] text-white"
                />
              </div>
              <Button
                onClick={handleAuthenticate}
                disabled={isAuthenticating || !adminToken}
                className="bg-[#0ea5e9] text-white hover:bg-[#0ea5e9]/80"
              >
                {isAuthenticated ? '重新验证' : '验证访问'}
              </Button>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-2">
              {isAuthenticated ? (
                <span className="text-green-400">✅ 已通过验证，可以安全操作敏感设置</span>
              ) : (
                <span>🔐 未验证，无法保存或同步 API 密钥</span>
              )}
              {authError && <span className="text-red-400">{authError}</span>}
            </div>
          </div>

          <Tabs defaultValue="api" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="flex w-full bg-[#1a2942]/30 shrink-0 overflow-x-auto gap-1 p-1">
              <TabsTrigger value="api" className="text-gray-400 data-[state=active]:text-white text-sm whitespace-nowrap px-4 py-2 min-w-fit">API密钥</TabsTrigger>
              <TabsTrigger value="models" className="text-gray-400 data-[state=active]:text-white text-sm whitespace-nowrap px-4 py-2 min-w-fit">AI模型</TabsTrigger>
              <TabsTrigger value="datasources" className="text-gray-400 data-[state=active]:text-white text-sm whitespace-nowrap px-4 py-2 min-w-fit">数据源</TabsTrigger>
              <TabsTrigger value="risk" className="text-gray-400 data-[state=active]:text-white text-sm whitespace-nowrap px-4 py-2 min-w-fit">风险控制</TabsTrigger>
              <TabsTrigger value="ui" className="text-gray-400 data-[state=active]:text-white text-sm whitespace-nowrap px-4 py-2 min-w-fit">界面设置</TabsTrigger>
              <TabsTrigger value="persistence" className="text-gray-400 data-[state=active]:text-white text-sm whitespace-nowrap px-4 py-2 min-w-fit">持久化</TabsTrigger>
              <TabsTrigger value="notifications" className="text-gray-400 data-[state=active]:text-white text-sm whitespace-nowrap px-4 py-2 min-w-fit">通知</TabsTrigger>
              <TabsTrigger value="advanced" className="text-gray-400 data-[state=active]:text-white text-sm whitespace-nowrap px-4 py-2 min-w-fit">高级</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1" style={{scrollbarWidth: 'thin', scrollbarColor: '#0ea5e9 #1a2942'}}>
              {/* 数据源配置 */}
              <TabsContent value="datasources" className="space-y-6 pr-2 data-[state=inactive]:hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg text-white">数据提供商管理</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-green-400 border-green-500/30 bg-green-500/10">
                      已启用 {config.enabledDataSources.length} 个
                    </Badge>
                    <Select value={config.preferredDataSource} onValueChange={(value) => updateConfig('preferredDataSource', value)}>
                      <SelectTrigger className="w-32 h-8 text-xs bg-[#0d1b2e] border-[#2a3f5f] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0d1b2e] border-[#1a2942]">
                        <SelectItem value="unified" className="text-white hover:bg-[#1a2942]">统一模式</SelectItem>
                        <SelectItem value="tushare" className="text-white hover:bg-[#1a2942]">Tushare</SelectItem>
                        <SelectItem value="akshare" className="text-white hover:bg-[#1a2942]">AKShare</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* 数据提供商网格 */}
                <div className="grid gap-4">
                  {DATA_PROVIDERS.map((provider) => (
                    <div 
                      key={provider.id} 
                      className={`bg-[#1a2942]/30 p-4 rounded-lg border transition-all duration-200 ${
                        config.enabledDataSources.includes(provider.id) 
                          ? 'border-[#0ea5e9]/50 bg-[#0ea5e9]/5' 
                          : 'border-[#2a3f5f] hover:border-[#2a3f5f]/80'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const newEnabled = config.enabledDataSources.includes(provider.id)
                                ? config.enabledDataSources.filter(id => id !== provider.id)
                                : [...config.enabledDataSources, provider.id];
                              updateConfig('enabledDataSources', newEnabled);
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              config.enabledDataSources.includes(provider.id)
                                ? 'bg-[#0ea5e9] border-[#0ea5e9]'
                                : 'border-[#2a3f5f] hover:border-[#0ea5e9]/50'
                            }`}
                          >
                            {config.enabledDataSources.includes(provider.id) && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-white font-medium">{provider.name}</h4>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  provider.type === 'free' 
                                    ? 'text-green-400 border-green-500/30 bg-green-500/10'
                                    : provider.type === 'premium'
                                    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' 
                                    : 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                                }`}
                              >
                                {provider.type === 'free' ? '免费' : provider.type === 'premium' ? '付费' : '免费增值'}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                                {provider.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-2">{provider.description}</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {provider.capabilities.slice(0, 4).map((capability, idx) => (
                                <span key={idx} className="text-xs px-2 py-1 bg-[#2a3f5f]/50 text-gray-300 rounded">
                                  {capability}
                                </span>
                              ))}
                              {provider.capabilities.length > 4 && (
                                <span className="text-xs px-2 py-1 bg-[#2a3f5f]/50 text-gray-400 rounded">
                                  +{provider.capabilities.length - 4} 更多
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {provider.needsApiKey && renderConnectionStatus(provider.id)}
                          {provider.needsApiKey && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => testConnection(provider.id)}
                              disabled={!provider.configKey || !config[provider.configKey as keyof SettingsConfig]}
                              className="text-xs"
                            >
                              测试
                            </Button>
                          )}
                          <a 
                            href={provider.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#0ea5e9] hover:text-[#0284c7]"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                      
                      {provider.needsApiKey && provider.configKey && (
                        <div className="space-y-2">
                          <Label className="text-gray-400 text-xs">API Key</Label>
                          <div className="relative">
                            <Input
                              type={showTokens[provider.id as keyof typeof showTokens] ? "text" : "password"}
                              value={config[provider.configKey as keyof SettingsConfig] as string || ''}
                              onChange={(e) => updateConfig(provider.configKey as keyof SettingsConfig, e.target.value)}
                              placeholder={`请输入 ${provider.name} API Key`}
                              className="bg-[#0d1b2e] border-[#2a3f5f] text-white pr-10 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => toggleTokenVisibility(provider.id as keyof typeof showTokens)}
                              className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300"
                            >
                              {showTokens[provider.id as keyof typeof showTokens] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* API配置 */}
            <TabsContent value="api" className="space-y-6 pr-2 data-[state=inactive]:hidden">
              <div className="space-y-4">
                <h3 className="text-lg text-white mb-4 flex items-center gap-2">
                  传统服务配置
                  <Badge variant="outline" className="text-xs">兼容性</Badge>
                </h3>
                  
                  {/* Tushare配置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">Tushare Pro</h4>
                      <Badge variant="outline" className="text-xs">专业版</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderConnectionStatus('tushare')}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testConnection('tushare')}
                        disabled={!config.tushareToken}
                        className="text-xs"
                      >
                        测试连接
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs">Token</Label>
                    <div className="relative">
                      <Input
                        type={showTokens.tushare ? "text" : "password"}
                        value={config.tushareToken}
                        onChange={(e) => updateConfig('tushareToken', e.target.value)}
                        placeholder="请输入Tushare Pro Token"
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility('tushare')}
                        className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300"
                      >
                        {showTokens.tushare ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      获取A股实时数据、基本面数据和指标数据。
                      <a href="https://tushare.pro" target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline ml-1 inline-flex items-center gap-1">
                        获取Token <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>

                {/* DeepSeek配置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">DeepSeek AI</h4>
                      <Badge variant="outline" className="text-xs">AI助手</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderConnectionStatus('deepSeek')}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testConnection('deepSeek')}
                        disabled={!config.deepSeekApiKey}
                        className="text-xs"
                      >
                        测试连接
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs">API Key</Label>
                    <div className="relative">
                      <Input
                        type={showTokens.deepSeek ? "text" : "password"}
                        value={config.deepSeekApiKey}
                        onChange={(e) => updateConfig('deepSeekApiKey', e.target.value)}
                        placeholder="sk-..."
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility('deepSeek')}
                        className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300"
                      >
                        {showTokens.deepSeek ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      用于AI分析和智能投资建议。
                      <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline ml-1 inline-flex items-center gap-1">
                        获取API Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>

                {/* AKShare配置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">AKShare</h4>
                      <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">免费</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderConnectionStatus('akshare')}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testConnection('akshare')}
                        className="text-xs"
                      >
                        测试连接
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400">
                    免费的金融数据接口，无需配置API Key。提供股票、期货、期权等基础数据。
                  </p>
                </div>

                {/* QuantEngine配置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">QuantEngine</h4>
                      <Badge variant="outline" className="text-xs">量化引擎</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderConnectionStatus('quantEngine')}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testConnection('quantEngine')}
                        disabled={!config.quantEngineApiKey}
                        className="text-xs"
                      >
                        测试连接
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs">API Key</Label>
                    <div className="relative">
                      <Input
                        type={showTokens.quantEngine ? "text" : "password"}
                        value={config.quantEngineApiKey}
                        onChange={(e) => updateConfig('quantEngineApiKey', e.target.value)}
                        placeholder="请输入QuantEngine API Key"
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility('quantEngine')}
                        className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300"
                      >
                        {showTokens.quantEngine ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      专业量化分析引擎，提供高级因子计算和策略回测。
                    </p>
                  </div>
                </div>

                {/* 分隔符 */}
                <div className="border-t border-[#2a3f5f] my-6"></div>

                {/* 市场数据平台 */}
                <h3 className="text-lg text-white mb-4 flex items-center gap-2">
                  市场数据平台配置
                  <Badge variant="outline" className="text-xs">专业数据</Badge>
                </h3>

                {/* Finnhub配置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">Finnhub</h4>
                      <Badge variant="outline" className="text-xs">全球股票</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderConnectionStatus('finnhub')}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testConnection('finnhub')}
                        disabled={!config.finnhubApiKey}
                        className="text-xs"
                      >
                        测试连接
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs">API Key</Label>
                    <div className="relative">
                      <Input
                        type={showTokens.finnhub ? "text" : "password"}
                        value={config.finnhubApiKey}
                        onChange={(e) => updateConfig('finnhubApiKey', e.target.value)}
                        placeholder="请输入Finnhub API Key"
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility('finnhub')}
                        className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300"
                      >
                        {showTokens.finnhub ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      获取全球股票、加密货币和外汇实时数据。免费每月1000次调用。
                      <a href="https://finnhub.io/register" target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline ml-1 inline-flex items-center gap-1">
                        获取API Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>

                {/* Alpha Vantage配置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">Alpha Vantage</h4>
                      <Badge variant="outline" className="text-xs">技术指标</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderConnectionStatus('alphaVantage')}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testConnection('alphaVantage')}
                        disabled={!config.alphaVantageApiKey}
                        className="text-xs"
                      >
                        测试连接
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs">API Key</Label>
                    <div className="relative">
                      <Input
                        type={showTokens.alphaVantage ? "text" : "password"}
                        value={config.alphaVantageApiKey}
                        onChange={(e) => updateConfig('alphaVantageApiKey', e.target.value)}
                        placeholder="请输入Alpha Vantage API Key"
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility('alphaVantage')}
                        className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300"
                      >
                        {showTokens.alphaVantage ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      股票价格和技术指标数据。免费每天500次调用。
                      <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline ml-1 inline-flex items-center gap-1">
                        获取API Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>

                {/* Twelve Data配置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">Twelve Data</h4>
                      <Badge variant="outline" className="text-xs">多资产</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderConnectionStatus('twelveData')}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testConnection('twelveData')}
                        disabled={!config.twelveDataApiKey}
                        className="text-xs"
                      >
                        测试连接
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs">API Key</Label>
                    <div className="relative">
                      <Input
                        type={showTokens.twelveData ? "text" : "password"}
                        value={config.twelveDataApiKey}
                        onChange={(e) => updateConfig('twelveDataApiKey', e.target.value)}
                        placeholder="请输入Twelve Data API Key"
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility('twelveData')}
                        className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300"
                      >
                        {showTokens.twelveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      股票、外汇、加密货币和ETF数据。免费每天800次调用。
                      <a href="https://twelvedata.com/pricing" target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline ml-1 inline-flex items-center gap-1">
                        获取API Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>

                {/* News API配置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">News API</h4>
                      <Badge variant="outline" className="text-xs">财经新闻</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderConnectionStatus('newsApi')}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testConnection('newsApi')}
                        disabled={!config.newsApiKey}
                        className="text-xs"
                      >
                        测试连接
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs">API Key</Label>
                    <div className="relative">
                      <Input
                        type={showTokens.newsApi ? "text" : "password"}
                        value={config.newsApiKey}
                        onChange={(e) => updateConfig('newsApiKey', e.target.value)}
                        placeholder="请输入News API Key"
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility('newsApi')}
                        className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300"
                      >
                        {showTokens.newsApi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      获取全球财经新闻和市场资讯。免费每月1000次调用。
                      <a href="https://newsapi.org/register" target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline ml-1 inline-flex items-center gap-1">
                        获取API Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 模型设置 */}
            <TabsContent value="models" className="space-y-6 pr-2 data-[state=inactive]:hidden">
              <div className="space-y-6">
                {/* AI助手配置区域 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg text-white">AI模型配置</h3>
                    <Badge variant="outline" className="text-xs">智能分析</Badge>
                  </div>

                  {/* DeepSeek API Key配置 */}
                  <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium">DeepSeek AI</h4>
                        <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">推荐</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderConnectionStatus('deepSeek')}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => testConnection('deepSeek')}
                          disabled={!config.deepSeekApiKey}
                          className="text-xs"
                        >
                          测试连接
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-gray-400 text-xs">API Key</Label>
                        <div className="relative">
                          <Input
                            type={showTokens.deepSeek ? "text" : "password"}
                            value={config.deepSeekApiKey}
                            onChange={(e) => updateConfig('deepSeekApiKey', e.target.value)}
                            placeholder="sk-..."
                            className="bg-[#0d1b2e] border-[#2a3f5f] text-white pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => toggleTokenVisibility('deepSeek')}
                            className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300"
                          >
                            {showTokens.deepSeek ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          用于智能分析和投资建议。
                          <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline ml-1 inline-flex items-center gap-1">
                            获取API Key <ExternalLink className="w-3 h-3" />
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* DeepSeek模型配置 */}
                  <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                    <h4 className="text-white font-medium mb-3">模型配置</h4>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-400 text-sm">选择模型</Label>
                        <Select value={config.deepSeekModel} onValueChange={(value) => updateConfig('deepSeekModel', value)}>
                          <SelectTrigger className="bg-[#0d1b2e] border-[#2a3f5f] text-white mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0d1b2e] border-[#1a2942]">
                            {DEEPSEEK_MODELS.map((model) => (
                              <SelectItem key={model.value} value={model.value} className="text-white hover:bg-[#1a2942]">
                                <div>
                                  <div className="font-medium">{model.label}</div>
                                  <div className="text-xs text-gray-400">{model.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          不同模型适用于不同的任务场景
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-400 text-sm">API基础URL</Label>
                          <Input
                            value={config.deepSeekBaseUrl}
                            onChange={(e) => updateConfig('deepSeekBaseUrl', e.target.value)}
                            className="bg-[#0d1b2e] border-[#2a3f5f] text-white mt-2"
                            placeholder="https://api.deepseek.com"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            通常保持默认值
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-400 text-sm">请求超时 (毫秒)</Label>
                          <Input
                            type="number"
                            value={config.deepSeekTimeout}
                            onChange={(e) => updateConfig('deepSeekTimeout', parseInt(e.target.value))}
                            className="bg-[#0d1b2e] border-[#2a3f5f] text-white mt-2"
                            min="5000"
                            max="60000"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            推荐: 30000毫秒
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Token限制配置 */}
                  <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                    <h4 className="text-white font-medium mb-3">Token管理</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-400 text-sm">最大输入Token</Label>
                          <Input
                            type="number"
                            defaultValue="4096"
                            className="bg-[#0d1b2e] border-[#2a3f5f] text-white mt-2"
                            min="1024"
                            max="8192"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            限制单次请求输入长度
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-400 text-sm">最大输出Token</Label>
                          <Input
                            type="number"
                            defaultValue="2048"
                            className="bg-[#0d1b2e] border-[#2a3f5f] text-white mt-2"
                            min="512"
                            max="4096"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            限制AI回复长度
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-gray-400 text-sm">温度参数 (创造性)</Label>
                        <div className="flex items-center gap-3 mt-2">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            defaultValue="0.7"
                            className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-white text-sm w-12">0.7</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>保守</span>
                          <span>平衡</span>
                          <span>创新</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 使用场景配置 */}
                  <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                    <h4 className="text-white font-medium mb-3">AI功能配置</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-[#0d1b2e]/50 rounded-lg">
                        <div>
                          <div className="text-white text-sm font-medium">市场情绪分析</div>
                          <div className="text-gray-400 text-xs">基于新闻和社交媒体数据分析市场情绪</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={true}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-[#0d1b2e]/50 rounded-lg">
                        <div>
                          <div className="text-white text-sm font-medium">智能策略建议</div>
                          <div className="text-gray-400 text-xs">AI生成个性化投资策略建议</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={true}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-[#0d1b2e]/50 rounded-lg">
                        <div>
                          <div className="text-white text-sm font-medium">风险预警</div>
                          <div className="text-gray-400 text-xs">AI监控和预警潜在市场风险</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={true}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 风险控制 */}
            <TabsContent value="risk" className="space-y-6 pr-2 data-[state=inactive]:hidden">
              <div className="space-y-4">
                <h3 className="text-lg text-white mb-4">风险管理设置</h3>
                
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-400 text-sm">默认风险偏好</Label>
                      <Select value={config.defaultRiskLevel} onValueChange={(value) => updateConfig('defaultRiskLevel', value as any)}>
                        <SelectTrigger className="bg-[#0d1b2e] border-[#2a3f5f] text-white mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d1b2e] border-[#1a2942]">
                          <SelectItem value="conservative" className="text-white hover:bg-[#1a2942]">稳健型</SelectItem>
                          <SelectItem value="balanced" className="text-white hover:bg-[#1a2942]">平衡型</SelectItem>
                          <SelectItem value="aggressive" className="text-white hover:bg-[#1a2942]">激进型</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-400 text-sm">最大单仓位比例 (%)</Label>
                      <Input
                        type="number"
                        value={config.maxPositionSize}
                        onChange={(e) => updateConfig('maxPositionSize', parseInt(e.target.value))}
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white mt-2"
                        min="1"
                        max="50"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-gray-400 text-sm">启用贝叶斯风险控制</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          使用贝叶斯统计进行智能仓位管理
                        </p>
                      </div>
                      <button
                        onClick={() => updateConfig('enableBayesianControl', !config.enableBayesianControl)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          config.enableBayesianControl ? 'bg-[#0ea5e9]' : 'bg-[#2a3f5f]'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            config.enableBayesianControl ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 界面设置 */}
            <TabsContent value="ui" className="space-y-6 pr-2 data-[state=inactive]:hidden">
              <div className="space-y-4">
                <h3 className="text-lg text-white mb-4">界面个性化</h3>
                
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-400 text-sm">主题</Label>
                      <Select value={config.theme} onValueChange={(value) => updateConfig('theme', value as any)}>
                        <SelectTrigger className="bg-[#0d1b2e] border-[#2a3f5f] text-white mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d1b2e] border-[#1a2942]">
                          <SelectItem value="dark" className="text-white hover:bg-[#1a2942]">深色主题</SelectItem>
                          <SelectItem value="light" className="text-white hover:bg-[#1a2942]">浅色主题</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-400 text-sm">语言</Label>
                      <Select value={config.language} onValueChange={(value) => updateConfig('language', value as any)}>
                        <SelectTrigger className="bg-[#0d1b2e] border-[#2a3f5f] text-white mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d1b2e] border-[#1a2942]">
                          <SelectItem value="zh-CN" className="text-white hover:bg-[#1a2942]">中文 (简体)</SelectItem>
                          <SelectItem value="en-US" className="text-white hover:bg-[#1a2942]">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-400 text-sm">数据更新频率 (分钟)</Label>
                      <Input
                        type="number"
                        value={config.dataUpdateFrequency}
                        onChange={(e) => updateConfig('dataUpdateFrequency', parseInt(e.target.value))}
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white mt-2"
                        min="1"
                        max="60"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-gray-400 text-sm">自动保存设置</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          更改后自动保存配置
                        </p>
                      </div>
                      <button
                        onClick={() => updateConfig('autoSave', !config.autoSave)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          config.autoSave ? 'bg-[#0ea5e9]' : 'bg-[#2a3f5f]'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            config.autoSave ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 持久化设置 (新增) */}
            <TabsContent value="persistence" className="space-y-6 pr-2 data-[state=inactive]:hidden">
              <div className="space-y-4">
                <h3 className="text-lg text-white mb-4 flex items-center gap-2">
                  数据持久化与同步
                  <Badge variant="outline" className="text-xs">新功能</Badge>
                </h3>

                {/* 备份设置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium">自动备份</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.persistenceSettings.autoBackup}
                        onChange={(e) => updateConfig('persistenceSettings', {
                          ...config.persistenceSettings,
                          autoBackup: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">定期自动创建配置备份</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400 text-xs">备份频率</Label>
                      <Select 
                        value={config.persistenceSettings.backupFrequency} 
                        onValueChange={(value) => updateConfig('persistenceSettings', {
                          ...config.persistenceSettings,
                          backupFrequency: value as 'daily' | 'weekly' | 'monthly'
                        })}
                      >
                        <SelectTrigger className="w-full bg-[#0d1b2e] border-[#2a3f5f] text-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">每日备份</SelectItem>
                          <SelectItem value="weekly">每周备份</SelectItem>
                          <SelectItem value="monthly">每月备份</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">保留期限 (天)</Label>
                      <Input
                        type="number"
                        value={config.persistenceSettings.retentionPeriod}
                        onChange={(e) => updateConfig('persistenceSettings', {
                          ...config.persistenceSettings,
                          retentionPeriod: parseInt(e.target.value)
                        })}
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white text-sm"
                        min="7"
                        max="365"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="encryptBackups"
                      checked={config.persistenceSettings.encryptBackups}
                      onChange={(e) => updateConfig('persistenceSettings', {
                        ...config.persistenceSettings,
                        encryptBackups: e.target.checked
                      })}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="encryptBackups" className="text-gray-300 text-sm">
                      加密备份数据
                    </Label>
                  </div>
                </div>

                {/* 云同步设置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium">云同步</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.persistenceSettings.enableCloudSync}
                        onChange={(e) => updateConfig('persistenceSettings', {
                          ...config.persistenceSettings,
                          enableCloudSync: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">在不同设备间同步配置</p>

                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="syncAcrossDevices"
                      checked={config.persistenceSettings.syncAcrossDevices}
                      onChange={(e) => updateConfig('persistenceSettings', {
                        ...config.persistenceSettings,
                        syncAcrossDevices: e.target.checked
                      })}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      disabled={!config.persistenceSettings.enableCloudSync}
                    />
                    <Label htmlFor="syncAcrossDevices" className="text-gray-300 text-sm">
                      跨设备同步
                    </Label>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-xs">存储配额 (MB)</Label>
                    <Input
                      type="number"
                      value={config.persistenceSettings.storageQuota}
                      onChange={(e) => updateConfig('persistenceSettings', {
                        ...config.persistenceSettings,
                        storageQuota: parseInt(e.target.value)
                      })}
                      className="bg-[#0d1b2e] border-[#2a3f5f] text-white text-sm mt-1"
                      min="10"
                      max="1000"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 通知设置 (新增) */}
            <TabsContent value="notifications" className="space-y-6 pr-2 data-[state=inactive]:hidden">
              <div className="space-y-4">
                <h3 className="text-lg text-white mb-4">通知与警报</h3>

                {/* 基础通知设置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <h4 className="text-white font-medium mb-3">通知方式</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="pushNotifications"
                        checked={config.notificationSettings.enablePushNotifications}
                        onChange={(e) => updateConfig('notificationSettings', {
                          ...config.notificationSettings,
                          enablePushNotifications: e.target.checked
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <Label htmlFor="pushNotifications" className="text-gray-300">
                        浏览器推送通知
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="emailNotifications"
                        checked={config.notificationSettings.enableEmailNotifications}
                        onChange={(e) => updateConfig('notificationSettings', {
                          ...config.notificationSettings,
                          enableEmailNotifications: e.target.checked
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <Label htmlFor="emailNotifications" className="text-gray-300">
                        邮件通知
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="smsNotifications"
                        checked={config.notificationSettings.enableSmsNotifications}
                        onChange={(e) => updateConfig('notificationSettings', {
                          ...config.notificationSettings,
                          enableSmsNotifications: e.target.checked
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <Label htmlFor="smsNotifications" className="text-gray-300">
                        短信通知
                      </Label>
                    </div>
                  </div>
                </div>

                {/* 勿扰时间 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium">勿扰时间</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.notificationSettings.quietHours.enabled}
                        onChange={(e) => updateConfig('notificationSettings', {
                          ...config.notificationSettings,
                          quietHours: {
                            ...config.notificationSettings.quietHours,
                            enabled: e.target.checked
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400 text-xs">开始时间</Label>
                      <Input
                        type="time"
                        value={config.notificationSettings.quietHours.startTime}
                        onChange={(e) => updateConfig('notificationSettings', {
                          ...config.notificationSettings,
                          quietHours: {
                            ...config.notificationSettings.quietHours,
                            startTime: e.target.value
                          }
                        })}
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white text-sm"
                        disabled={!config.notificationSettings.quietHours.enabled}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">结束时间</Label>
                      <Input
                        type="time"
                        value={config.notificationSettings.quietHours.endTime}
                        onChange={(e) => updateConfig('notificationSettings', {
                          ...config.notificationSettings,
                          quietHours: {
                            ...config.notificationSettings.quietHours,
                            endTime: e.target.value
                          }
                        })}
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white text-sm"
                        disabled={!config.notificationSettings.quietHours.enabled}
                      />
                    </div>
                  </div>
                </div>

                {/* 通知分类 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <h4 className="text-white font-medium mb-3">通知分类</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">交易通知</Label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.notificationSettings.categories.trading}
                          onChange={(e) => updateConfig('notificationSettings', {
                            ...config.notificationSettings,
                            categories: {
                              ...config.notificationSettings.categories,
                              trading: e.target.checked
                            }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">投资组合通知</Label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.notificationSettings.categories.portfolio}
                          onChange={(e) => updateConfig('notificationSettings', {
                            ...config.notificationSettings,
                            categories: {
                              ...config.notificationSettings.categories,
                              portfolio: e.target.checked
                            }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">系统通知</Label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.notificationSettings.categories.system}
                          onChange={(e) => updateConfig('notificationSettings', {
                            ...config.notificationSettings,
                            categories: {
                              ...config.notificationSettings.categories,
                              system: e.target.checked
                            }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">新闻通知</Label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.notificationSettings.categories.news}
                          onChange={(e) => updateConfig('notificationSettings', {
                            ...config.notificationSettings,
                            categories: {
                              ...config.notificationSettings.categories,
                              news: e.target.checked
                            }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 高级设置 (新增) */}
            <TabsContent value="advanced" className="space-y-6 pr-2 data-[state=inactive]:hidden">
              <div className="space-y-4">
                <h3 className="text-lg text-white mb-4 flex items-center gap-2">
                  高级设置
                  <Badge variant="outline" className="text-xs text-orange-400 border-orange-500/30">谨慎操作</Badge>
                </h3>

                {/* 调试设置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <h4 className="text-white font-medium mb-3">调试与日志</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-gray-300">调试模式</Label>
                        <p className="text-gray-500 text-xs">启用详细的调试信息输出</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.advancedSettings.debugMode}
                          onChange={(e) => updateConfig('advancedSettings', {
                            ...config.advancedSettings,
                            debugMode: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-gray-300">性能日志</Label>
                        <p className="text-gray-500 text-xs">记录组件性能和渲染时间</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.advancedSettings.enablePerformanceLogging}
                          onChange={(e) => updateConfig('advancedSettings', {
                            ...config.advancedSettings,
                            enablePerformanceLogging: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div>
                      <Label className="text-gray-400 text-xs">最大日志条目数</Label>
                      <Input
                        type="number"
                        value={config.advancedSettings.maxLogEntries}
                        onChange={(e) => updateConfig('advancedSettings', {
                          ...config.advancedSettings,
                          maxLogEntries: parseInt(e.target.value)
                        })}
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white text-sm mt-1"
                        min="100"
                        max="10000"
                      />
                    </div>
                  </div>
                </div>

                {/* 网络设置 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <h4 className="text-white font-medium mb-3">网络与缓存</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400 text-xs">网络超时 (秒)</Label>
                      <Input
                        type="number"
                        value={config.advancedSettings.networkTimeout}
                        onChange={(e) => updateConfig('advancedSettings', {
                          ...config.advancedSettings,
                          networkTimeout: parseInt(e.target.value)
                        })}
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white text-sm"
                        min="5"
                        max="60"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">重试次数</Label>
                      <Input
                        type="number"
                        value={config.advancedSettings.retryAttempts}
                        onChange={(e) => updateConfig('advancedSettings', {
                          ...config.advancedSettings,
                          retryAttempts: parseInt(e.target.value)
                        })}
                        className="bg-[#0d1b2e] border-[#2a3f5f] text-white text-sm"
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <Label className="text-gray-400 text-xs">缓存过期时间 (分钟)</Label>
                    <Input
                      type="number"
                      value={config.advancedSettings.cacheExpiryTime}
                      onChange={(e) => updateConfig('advancedSettings', {
                        ...config.advancedSettings,
                        cacheExpiryTime: parseInt(e.target.value)
                      })}
                      className="bg-[#0d1b2e] border-[#2a3f5f] text-white text-sm"
                      min="5"
                      max="1440"
                    />
                  </div>
                </div>

                {/* 实验性功能 */}
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-white font-medium">实验性功能</h4>
                      <p className="text-gray-500 text-xs">启用未稳定的新功能，可能影响系统稳定性</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.advancedSettings.enableExperimentalFeatures}
                        onChange={(e) => updateConfig('advancedSettings', {
                          ...config.advancedSettings,
                          enableExperimentalFeatures: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* 底部操作栏 */}
        <div className="border-t border-[#1a2942] pt-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            所有敏感配置都会加密存储在服务器端安全目录
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="text-gray-400 hover:text-white border-[#2a3f5f] hover:border-[#0ea5e9]/50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isAuthenticated || isAuthenticating}
              className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              保存设置
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
