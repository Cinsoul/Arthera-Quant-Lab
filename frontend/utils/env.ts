export function getEnvFlag(
  viteKey: string,
  reactKey: string,
  fallback = false
): boolean {
  const viteEnv = typeof import.meta !== 'undefined'
    ? ((import.meta as unknown as { env?: Record<string, any> })?.env ?? undefined)
    : undefined;

  const rawVite = viteEnv?.[viteKey];
  if (typeof rawVite !== 'undefined') {
    return String(rawVite).toLowerCase() === 'true';
  }

  const rawReact = typeof process !== 'undefined' ? process.env?.[reactKey] : undefined;
  if (typeof rawReact !== 'undefined') {
    return rawReact.toLowerCase() === 'true';
  }

  return fallback;
}

export function getEnvVar(
  viteKey: string,
  reactKey: string,
  fallback?: string
): string | undefined {
  const viteEnv = typeof import.meta !== 'undefined'
    ? ((import.meta as unknown as { env?: Record<string, any> })?.env ?? undefined)
    : undefined;

  const rawVite = viteEnv?.[viteKey];
  if (typeof rawVite !== 'undefined') {
    return String(rawVite);
  }

  const rawReact = typeof process !== 'undefined' ? process.env?.[reactKey] : undefined;
  if (typeof rawReact !== 'undefined') {
    return rawReact;
  }

  return fallback;
}

// ============================================================================
// API配置管理 - 解决端口不一致问题
// ============================================================================

export interface ApiEndpoints {
  main: string;           // 主API端点
  websocket: string;      // WebSocket端点  
  quantEngine: string;    // QuantEngine服务
  qlib: string;          // Qlib服务
  tushare: string;       // Tushare代理服务
}

/**
 * 获取API基础URL - 统一端口配置
 * 优先级: VITE_API_BASE_URL > REACT_APP_API_URL > 默认8004端口
 */
export function getApiBaseUrl(): string {
  return getEnvVar(
    'VITE_API_BASE_URL',
    'REACT_APP_API_URL',
    'http://localhost:8004' // 统一使用8004端口
  )!;
}

/**
 * 获取WebSocket URL
 */
export function getWebSocketUrl(): string {
  const wsUrl = getEnvVar('VITE_API_WS_URL', 'REACT_APP_WS_URL');
  if (wsUrl) {
    return wsUrl;
  }
  
  // 从API URL自动生成WebSocket URL
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
}

/**
 * 获取所有API端点配置
 */
export function getApiEndpoints(): ApiEndpoints {
  const baseUrl = getApiBaseUrl();
  
  return {
    main: baseUrl,
    websocket: getWebSocketUrl(),
    quantEngine: getEnvVar('VITE_QUANTENGINE_URL', 'REACT_APP_QUANTENGINE_URL', 'http://localhost:8003')!,
    qlib: getEnvVar('VITE_QLIB_URL', 'REACT_APP_QLIB_URL', baseUrl)!, // 与主API相同
    tushare: getEnvVar('VITE_TUSHARE_URL', 'REACT_APP_TUSHARE_URL', baseUrl)! // 与主API相同
  };
}

/**
 * 构建完整的API URL
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * 健康检查URL
 */
export function getHealthCheckUrl(): string {
  return buildApiUrl('/health');
}

/**
 * 验证API端点是否可达
 */
export async function validateApiEndpoint(url?: string): Promise<boolean> {
  const testUrl = url || getHealthCheckUrl();
  
  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5秒超时
    });
    
    return response.ok;
  } catch (error) {
    console.error('[ApiConfig] API endpoint validation failed:', error);
    return false;
  }
}

/**
 * 获取环境信息和配置
 */
export function getEnvironmentInfo() {
  const endpoints = getApiEndpoints();
  
  return {
    environment: import.meta.env?.MODE || 'development',
    endpoints,
    features: {
      realData: getEnvFlag('VITE_ENABLE_REAL_DATA', 'REACT_APP_ENABLE_REAL_DATA', true),
      webSocket: getEnvFlag('VITE_ENABLE_WEBSOCKET', 'REACT_APP_ENABLE_WEBSOCKET', true),
      akshare: getEnvFlag('VITE_ENABLE_AKSHARE', 'REACT_APP_ENABLE_AKSHARE', true),
      tushare: getEnvFlag('VITE_ENABLE_TUSHARE', 'REACT_APP_ENABLE_TUSHARE', true),
      deepseek: getEnvFlag('VITE_ENABLE_DEEPSEEK', 'REACT_APP_ENABLE_DEEPSEEK', true),
      qlib: getEnvFlag('VITE_ENABLE_QLIB', 'REACT_APP_ENABLE_QLIB', true),
      quantEngine: getEnvFlag('VITE_ENABLE_QUANTENGINE', 'REACT_APP_ENABLE_QUANTENGINE', true)
    },
    debug: getEnvFlag('VITE_DEBUG_MODE', 'REACT_APP_DEBUG_MODE', false)
  };
}
