/**
 * DeepSeek AI 量化信号生成服务
 * 使用DeepSeek API进行市场分析和信号生成
 */

import { getEnvVar } from '../utils/env';

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface MarketSignal {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  expectedReturn: number;
  timeHorizon: string;
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize?: number;
  timestamp: Date;
}

export interface MarketAnalysis {
  marketRegime: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE';
  regimeConfidence: number;
  keyFactors: string[];
  riskSentiment: number; // -1 to 1
  volatilityForecast: number;
  sectorRotation: Array<{
    sector: string;
    outlook: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    confidence: number;
  }>;
  timestamp: Date;
}

export interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class DeepSeekSignalService {
  private config: DeepSeekConfig = {
    apiKey: getEnvVar('VITE_DEEPSEEK_API_KEY', 'REACT_APP_DEEPSEEK_API_KEY', '') || '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    maxTokens: 2000,
    temperature: 0.3
  };

  constructor() {
    // 从本地设置加载配置
    this.loadConfig();
    
    // 监听设置更新事件
    window.addEventListener('settings-updated', this.handleSettingsUpdate.bind(this));
  }

  /**
   * 从本地设置加载配置
   */
  private loadConfig() {
    try {
      const savedSettings = localStorage.getItem('arthera_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // 更新配置
        if (settings.deepSeekApiKey) {
          this.config.apiKey = settings.deepSeekApiKey;
        }
        if (settings.deepSeekModel) {
          this.config.model = settings.deepSeekModel;
        }
        if (settings.deepSeekBaseUrl) {
          this.config.baseUrl = settings.deepSeekBaseUrl;
        }
        if (settings.deepSeekTimeout) {
          // 将超时时间转换为maxTokens的参考值
          this.config.maxTokens = Math.min(4000, Math.max(1000, settings.deepSeekTimeout / 10));
        }
      }
      
      if (!this.config.apiKey) {
        const envKey = getEnvVar('VITE_DEEPSEEK_API_KEY', 'REACT_APP_DEEPSEEK_API_KEY', '');
        if (envKey) {
          this.config.apiKey = envKey;
        }
      }

      if (!this.config.apiKey) {
        console.warn('[DeepSeek] No API key configured. DeepSeek features will remain offline until a key is provided.');
      }
      
      console.log('[DeepSeek] Configuration loaded:', {
        hasApiKey: !!this.config.apiKey,
        model: this.config.model,
        baseUrl: this.config.baseUrl
      });
    } catch (error) {
      console.warn('[DeepSeek] Failed to load config from settings:', error);
      if (!this.config.apiKey) {
        console.warn('[DeepSeek] Falling back to offline mode (API key missing).');
      }
    }
  }

  /**
   * 更新配置（当设置发生变化时调用）
   */
  updateConfig(newConfig: Partial<DeepSeekConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('[DeepSeek] Configuration updated');
  }

  /**
   * 处理设置更新事件
   */
  private handleSettingsUpdate(event: Event) {
    const customEvent = event as CustomEvent;
    const settings = customEvent.detail;
    
    console.log('[DeepSeek] Settings updated, reloading configuration');
    this.loadConfig();
  }

  private systemPrompt = `你是一位专业的量化交易分析师，精通中国A股市场。请基于提供的市场数据进行分析，并生成结构化的交易信号。

分析框架：
1. 技术分析：价格趋势、支撑阻力、动量指标
2. 基本面分析：行业地位、财务指标、估值水平
3. 市场情绪：资金流向、热点题材、政策影响
4. 风险评估：波动率、流动性、相关性

请严格按照JSON格式回复，包含以下字段：
- signal: "BUY" | "SELL" | "HOLD"
- confidence: 0-1之间的数值
- expectedReturn: 预期收益率
- timeHorizon: "短期" | "中期" | "长期"
- reasoning: 详细分析理由
- riskLevel: "LOW" | "MEDIUM" | "HIGH"
- entryPrice: 建议入场价格（可选）
- stopLoss: 止损价格（可选）
- takeProfit: 止盈价格（可选）
- positionSize: 建议仓位比例（可选）`;

  /**
   * 生成单只股票的交易信号
   */
  async generateSignal(
    symbol: string,
    marketData: any,
    fundamentalData?: any
  ): Promise<MarketSignal> {
    try {
      const prompt = this.buildSignalPrompt(symbol, marketData, fundamentalData);
      
      const response = await this.callDeepSeekAPI(prompt);
      const analysis = this.parseSignalResponse(response, symbol);
      
      return analysis;
    } catch (error) {
      console.error('[DeepSeek] Signal generation failed:', error);
      
      // 返回默认HOLD信号
      return {
        symbol,
        signal: 'HOLD',
        confidence: 0.5,
        expectedReturn: 0,
        timeHorizon: '短期',
        reasoning: 'AI分析服务暂时不可用，建议持有现有仓位',
        riskLevel: 'MEDIUM',
        timestamp: new Date()
      };
    }
  }

  /**
   * 生成市场整体分析
   */
  async generateMarketAnalysis(
    marketOverview: any,
    sectorData: any[]
  ): Promise<MarketAnalysis> {
    try {
      const prompt = this.buildMarketAnalysisPrompt(marketOverview, sectorData);
      
      const response = await this.callDeepSeekAPI(prompt);
      const analysis = this.parseMarketResponse(response);
      
      return analysis;
    } catch (error) {
      console.error('[DeepSeek] Market analysis failed:', error);
      
      // 返回默认分析
      return {
        marketRegime: 'SIDEWAYS',
        regimeConfidence: 0.5,
        keyFactors: ['市场数据获取异常'],
        riskSentiment: 0,
        volatilityForecast: 0.2,
        sectorRotation: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * 批量生成多只股票信号
   */
  async generateBatchSignals(
    symbols: string[],
    marketDataMap: Map<string, any>
  ): Promise<MarketSignal[]> {
    const signals: MarketSignal[] = [];
    
    // 控制并发数，避免API限制
    const batchSize = 3;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async symbol => {
        const marketData = marketDataMap.get(symbol);
        if (marketData) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 限制调用频率
          return this.generateSignal(symbol, marketData);
        }
        return null;
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          signals.push(result.value);
        }
      });
    }
    
    return signals;
  }

  /**
   * 构建信号生成的提示词
   */
  private buildSignalPrompt(
    symbol: string,
    marketData: any,
    fundamentalData?: any
  ): string {
    return `请分析股票 ${symbol} 的交易机会：

技术数据：
- 当前价格: ${marketData.price || 'N/A'}
- 今日涨跌幅: ${marketData.changePercent || 'N/A'}%
- 成交量: ${marketData.volume || 'N/A'}
- 20日均线: ${marketData.ma20 || 'N/A'}
- RSI: ${marketData.rsi || 'N/A'}
- MACD: ${marketData.macd || 'N/A'}

基本面数据：
${fundamentalData ? `
- 市盈率: ${fundamentalData.pe || 'N/A'}
- 市净率: ${fundamentalData.pb || 'N/A'}
- 净资产收益率: ${fundamentalData.roe || 'N/A'}%
- 营收增长: ${fundamentalData.revenueGrowth || 'N/A'}%
` : '基本面数据暂未获取'}

请提供详细的交易信号分析，严格按JSON格式回复。`;
  }

  /**
   * 构建市场分析的提示词
   */
  private buildMarketAnalysisPrompt(marketOverview: any, sectorData: any[]): string {
    const sectorSummary = sectorData.map(sector => 
      `${sector.name}: ${sector.changePercent >= 0 ? '+' : ''}${sector.changePercent}%`
    ).join(', ');

    return `请分析当前A股市场整体状况：

市场概况：
- 上证指数: ${marketOverview.sh?.price || 'N/A'} (${marketOverview.sh?.changePercent || 'N/A'}%)
- 深证成指: ${marketOverview.sz?.price || 'N/A'} (${marketOverview.sz?.changePercent || 'N/A'}%)
- 创业板指: ${marketOverview.cy?.price || 'N/A'} (${marketOverview.cy?.changePercent || 'N/A'}%)

板块表现：
${sectorSummary}

请提供市场制度判断、风险情绪评估和板块轮动分析，按以下JSON格式回复：
{
  "marketRegime": "BULL|BEAR|SIDEWAYS|VOLATILE",
  "regimeConfidence": 0.8,
  "keyFactors": ["关键影响因素1", "关键影响因素2"],
  "riskSentiment": 0.2,
  "volatilityForecast": 0.15,
  "sectorRotation": [
    {"sector": "科技", "outlook": "POSITIVE", "confidence": 0.7}
  ]
}`;
  }

  /**
   * 调用DeepSeek API
   */
  private async callDeepSeekAPI(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data: DeepSeekResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * 解析信号响应
   */
  private parseSignalResponse(response: string, symbol: string): MarketSignal {
    try {
      // 尝试提取JSON内容
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          symbol,
          signal: parsed.signal || 'HOLD',
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
          expectedReturn: parsed.expectedReturn || 0,
          timeHorizon: parsed.timeHorizon || '短期',
          reasoning: parsed.reasoning || '分析完成',
          riskLevel: parsed.riskLevel || 'MEDIUM',
          entryPrice: parsed.entryPrice,
          stopLoss: parsed.stopLoss,
          takeProfit: parsed.takeProfit,
          positionSize: parsed.positionSize,
          timestamp: new Date()
        };
      }
      
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.warn('[DeepSeek] Response parsing failed:', error);
      
      // 基于文本内容进行简单推断
      const text = response.toLowerCase();
      let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let confidence = 0.5;
      
      if (text.includes('买入') || text.includes('看涨') || text.includes('积极')) {
        signal = 'BUY';
        confidence = 0.7;
      } else if (text.includes('卖出') || text.includes('看跌') || text.includes('谨慎')) {
        signal = 'SELL';
        confidence = 0.7;
      }

      return {
        symbol,
        signal,
        confidence,
        expectedReturn: signal === 'BUY' ? 0.05 : (signal === 'SELL' ? -0.05 : 0),
        timeHorizon: '短期',
        reasoning: response.substring(0, 200) + '...',
        riskLevel: 'MEDIUM',
        timestamp: new Date()
      };
    }
  }

  /**
   * 解析市场分析响应
   */
  private parseMarketResponse(response: string): MarketAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          marketRegime: parsed.marketRegime || 'SIDEWAYS',
          regimeConfidence: Math.max(0, Math.min(1, parsed.regimeConfidence || 0.5)),
          keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors : ['市场分析完成'],
          riskSentiment: Math.max(-1, Math.min(1, parsed.riskSentiment || 0)),
          volatilityForecast: Math.max(0, parsed.volatilityForecast || 0.2),
          sectorRotation: Array.isArray(parsed.sectorRotation) ? parsed.sectorRotation : [],
          timestamp: new Date()
        };
      }
      
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.warn('[DeepSeek] Market analysis parsing failed:', error);
      
      return {
        marketRegime: 'SIDEWAYS',
        regimeConfidence: 0.5,
        keyFactors: ['分析数据解析异常'],
        riskSentiment: 0,
        volatilityForecast: 0.2,
        sectorRotation: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.callDeepSeekAPI('你好，这是一个连接测试。请回复"连接成功"。');
      return response.includes('成功') || response.includes('successful') || response.length > 0;
    } catch (error) {
      console.error('[DeepSeek] Connection test failed:', error);
      return false;
    }
  }
}

export const deepSeekSignalService = new DeepSeekSignalService();
export default DeepSeekSignalService;
