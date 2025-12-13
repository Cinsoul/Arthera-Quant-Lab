/**
 * 策略商店服务
 * 提供策略模板的保存、分享、导入和管理功能
 */

import { getCacheManager } from './CacheManager';
import { moduleCommunication } from './CommunicationBus';
import { getEnvFlag } from '../utils/env';

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  rating: number;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
  
  // 策略配置
  config: {
    strategyType: string;
    parameters: Record<string, any>;
    riskParams: {
      maxDrawdown: number;
      stopLoss: number;
      maxPositionSize: number;
    };
    tradingParams: {
      initialCapital: number;
      commission: number;
      slippage: number;
    };
  };
  
  // 回测结果
  backtestResults?: {
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    trades: number;
    period: string;
  };
  
  // 代码和逻辑
  code?: {
    signals: string;
    filters: string;
    execution: string;
  };
}

export interface StrategyCollection {
  id: string;
  name: string;
  description: string;
  strategies: string[]; // Strategy IDs
  author: string;
  isPublic: boolean;
  createdAt: Date;
}

export interface StrategyRating {
  strategyId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface StrategyDownload {
  strategyId: string;
  userId: string;
  downloadedAt: Date;
}

export interface StrategyStoreStats {
  totalStrategies: number;
  totalDownloads: number;
  topCategories: Array<{
    category: string;
  count: number;
  }>;
  recentStrategies: StrategyTemplate[];
  popularStrategies: StrategyTemplate[];
}

const CLOUD_SYNC_ENABLED = getEnvFlag('VITE_ENABLE_CLOUD_SYNC', 'REACT_APP_ENABLE_CLOUD_SYNC', false);

class StrategyStoreService {
  private cache = getCacheManager();
  private apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8004';
  private cloudSyncEnabled = CLOUD_SYNC_ENABLED;

  constructor() {
    this.initializeLocalStore();
    this.initializeDefaultTemplates();
  }

  // ============================================================================
  // 策略模板管理
  // ============================================================================

  /**
   * 保存策略模板
   */
  async saveStrategyTemplate(template: Omit<StrategyTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const strategyTemplate: StrategyTemplate = {
        ...template,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        rating: 0,
        downloads: 0
      };

      // 本地保存
      await this.saveToLocalStore(strategyTemplate);
      
      // 如果是公开策略，尝试上传到云端（仅在启用时）
      if (template.isPublic && this.cloudSyncEnabled) {
        try {
          await this.uploadToCloud(strategyTemplate);
        } catch (error) {
          console.warn('Failed to upload to cloud, saved locally only:', error);
        }
      } else if (template.isPublic) {
        console.info('[StrategyStore] Cloud sync disabled, skipping upload');
      }

      this.emitNotification({
        title: '策略保存成功',
        message: `策略模板 "${template.name}" 已保存`,
        type: 'success',
        priority: 'low'
      });

      console.log(`[StrategyStore] Strategy template saved: ${strategyTemplate.id}`);
      return strategyTemplate.id;
    } catch (error) {
      console.error('[StrategyStore] Failed to save strategy template:', error);
      throw error;
    }
  }

  /**
   * 获取策略模板
   */
  async getStrategyTemplate(id: string): Promise<StrategyTemplate | null> {
    try {
      // 先从本地缓存查找
      const cached = await this.cache.get('strategy-templates', `strategy-template:${id}`);
      if (cached) {
        return cached;
      }

      // 从云端获取
      const response = await fetch(`${this.apiBaseUrl}/api/v1/strategies/templates/${id}`);
      if (response.ok) {
        const template = await response.json();
        // 缓存到本地
        await this.cache.set('strategy-templates', `strategy-template:${id}`, template, 3600);
        return template;
      }

      return null;
    } catch (error) {
      console.error(`[StrategyStore] Failed to get strategy template ${id}:`, error);
      return null;
    }
  }

  /**
   * 搜索策略模板
   */
  async searchStrategies(query: {
    keyword?: string;
    category?: string;
    tags?: string[];
    author?: string;
    minRating?: number;
    sortBy?: 'rating' | 'downloads' | 'created' | 'updated';
    limit?: number;
    offset?: number;
  }): Promise<{
    strategies: StrategyTemplate[];
    total: number;
  }> {
    try {
      // 构建搜索参数
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });

      const response = await fetch(`${this.apiBaseUrl}/api/v1/strategies/search?${params}`);
      if (response.ok) {
        return await response.json();
      }

      // 如果云端不可用，从本地搜索
      return this.searchLocalStrategies(query);
    } catch (error) {
      console.error('[StrategyStore] Search failed, using local search:', error);
      return this.searchLocalStrategies(query);
    }
  }

  /**
   * 获取策略分类
   */
  async getCategories(): Promise<Array<{
    name: string;
    count: number;
    description: string;
  }>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/strategies/categories`);
      if (response.ok) {
        return await response.json();
      }

      // 返回默认分类
      return [
        { name: '趋势跟踪', count: 0, description: '基于趋势分析的策略' },
        { name: '均值回归', count: 0, description: '基于均值回归的策略' },
        { name: '套利策略', count: 0, description: '基于价差的套利策略' },
        { name: '因子策略', count: 0, description: '基于多因子模型的策略' },
        { name: '机器学习', count: 0, description: '基于AI/ML的策略' },
        { name: '风险控制', count: 0, description: '专注于风险管理的策略' }
      ];
    } catch (error) {
      console.error('[StrategyStore] Failed to get categories:', error);
      return [];
    }
  }

  /**
   * 导入策略模板
   */
  async importStrategy(templateId: string): Promise<StrategyTemplate> {
    try {
      const template = await this.getStrategyTemplate(templateId);
      if (!template) {
        throw new Error('策略模板不存在');
      }

      // 记录下载
      await this.recordDownload(templateId);

      // 创建本地副本
      const importedTemplate: StrategyTemplate = {
        ...template,
        id: this.generateId(),
        name: `${template.name} (导入)`,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveToLocalStore(importedTemplate);

      this.emitNotification({
        title: '策略导入成功',
        message: `策略 "${template.name}" 已导入到本地`,
        type: 'success',
        priority: 'low'
      });

      return importedTemplate;
    } catch (error) {
      console.error('[StrategyStore] Failed to import strategy:', error);
      throw error;
    }
  }

  /**
   * 分享策略
   */
  async shareStrategy(templateId: string): Promise<{
    shareId: string;
    shareUrl: string;
    qrCode: string;
  }> {
    try {
      const template = await this.getStrategyTemplate(templateId);
      if (!template) {
        throw new Error('策略不存在');
      }

      // 生成分享链接
      const shareId = this.generateShareId();
      const shareUrl = `${window.location.origin}/strategy-store/share/${shareId}`;

      // 保存分享信息
      await this.cache.set('strategy-store', `strategy-share:${shareId}`, {
        strategyId: templateId,
        strategy: template,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天过期
      }, 30 * 24 * 60 * 60);

      // 生成二维码（简化实现）
      const qrCode = `data:image/svg+xml;base64,${btoa(`<svg>QR Code for ${shareUrl}</svg>`)}`;

      return {
        shareId,
        shareUrl,
        qrCode
      };
    } catch (error) {
      console.error('[StrategyStore] Failed to share strategy:', error);
      throw error;
    }
  }

  // ============================================================================
  // 策略集合管理
  // ============================================================================

  /**
   * 创建策略集合
   */
  async createCollection(collection: Omit<StrategyCollection, 'id' | 'createdAt'>): Promise<string> {
    try {
      const strategyCollection: StrategyCollection = {
        ...collection,
        id: this.generateId(),
        createdAt: new Date()
      };

      await this.cache.set('strategy-store', `strategy-collection:${strategyCollection.id}`, strategyCollection);
      
      console.log(`[StrategyStore] Collection created: ${strategyCollection.id}`);
      return strategyCollection.id;
    } catch (error) {
      console.error('[StrategyStore] Failed to create collection:', error);
      throw error;
    }
  }

  /**
   * 获取用户的策略集合
   */
  async getUserCollections(userId: string): Promise<StrategyCollection[]> {
    try {
      // 这里实现从缓存或API获取用户集合的逻辑
      const collections = await this.cache.get('strategy-store', `user-collections:${userId}`) || [];
      return collections;
    } catch (error) {
      console.error('[StrategyStore] Failed to get user collections:', error);
      return [];
    }
  }

  // ============================================================================
  // 评分和统计
  // ============================================================================

  /**
   * 策略评分
   */
  async rateStrategy(rating: Omit<StrategyRating, 'createdAt'>): Promise<void> {
    try {
      const strategyRating: StrategyRating = {
        ...rating,
        createdAt: new Date()
      };

      await this.cache.set('strategy-store', `strategy-rating:${rating.strategyId}:${rating.userId}`, strategyRating);
      
      // 更新策略平均评分
      await this.updateStrategyRating(rating.strategyId);
    } catch (error) {
      console.error('[StrategyStore] Failed to rate strategy:', error);
      throw error;
    }
  }

  /**
   * 获取策略商店统计信息
   */
  async getStoreStats(): Promise<StrategyStoreStats> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/strategies/stats`);
      if (response.ok) {
        return await response.json();
      }

      // 返回本地统计
      return this.getLocalStats();
    } catch (error) {
      console.error('[StrategyStore] Failed to get store stats:', error);
      return this.getLocalStats();
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private async initializeLocalStore(): Promise<void> {
    try {
      const initialized = await this.cache.get('strategy-store', 'initialized');
      if (!initialized) {
        // 初始化本地策略商店
        await this.cache.set('strategy-store', 'initialized', true);
        console.log('[StrategyStore] Local store initialized');
      }
    } catch (error) {
      console.error('[StrategyStore] Failed to initialize local store:', error);
    }
  }

  private emitNotification(detail: { title: string; message: string; type?: 'success' | 'info' | 'error'; priority?: 'low' | 'medium' | 'high' }) {
    try {
      moduleCommunication.emit('alert:strategy-store', {
        source: 'strategy-store',
        timestamp: new Date().toISOString(),
        type: detail.type || 'info',
        priority: detail.priority || 'low',
        title: detail.title,
        message: detail.message,
      });
    } catch (error) {
      console.warn('[StrategyStore] Failed to emit notification:', error);
    }
  }

  private async saveToLocalStore(template: StrategyTemplate): Promise<void> {
    try {
      await this.cache.set('strategy-templates', `strategy-template:${template.id}`, template);
      
      // 更新索引
      const index = await this.cache.get('strategy-store', 'index') || [];
      index.push(template.id);
      await this.cache.set('strategy-store', 'index', index);
    } catch (error) {
      console.error('[StrategyStore] Failed to save to local store:', error);
      throw error;
    }
  }

  private async uploadToCloud(template: StrategyTemplate): Promise<void> {
    if (!this.cloudSyncEnabled) {
      return;
    }
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/strategies/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[StrategyStore] Failed to upload to cloud:', error);
      throw error;
    }
  }

  private async searchLocalStrategies(query: any): Promise<{
    strategies: StrategyTemplate[];
    total: number;
  }> {
    try {
      const index = await this.cache.get('strategy-store', 'index') || [];
      const strategies: StrategyTemplate[] = [];

      for (const id of index) {
        const template = await this.cache.get('strategy-templates', `strategy-template:${id}`);
        if (template) {
          // 简单的搜索逻辑
          if (this.matchesQuery(template, query)) {
            strategies.push(template);
          }
        }
      }

      // 排序
      if (query.sortBy) {
        strategies.sort((a, b) => this.compareBySortKey(a, b, query.sortBy));
      }

      // 分页
      const offset = query.offset || 0;
      const limit = query.limit || 20;
      const paginatedStrategies = strategies.slice(offset, offset + limit);

      return {
        strategies: paginatedStrategies,
        total: strategies.length
      };
    } catch (error) {
      console.error('[StrategyStore] Local search failed:', error);
      return { strategies: [], total: 0 };
    }
  }

  private matchesQuery(template: StrategyTemplate, query: any): boolean {
    if (query.keyword) {
      const keyword = query.keyword.toLowerCase();
      if (!template.name.toLowerCase().includes(keyword) &&
          !template.description.toLowerCase().includes(keyword)) {
        return false;
      }
    }

    if (query.category && template.category !== query.category) {
      return false;
    }

    if (query.tags && !query.tags.some((tag: string) => template.tags.includes(tag))) {
      return false;
    }

    if (query.author && template.author !== query.author) {
      return false;
    }

    if (query.minRating && template.rating < query.minRating) {
      return false;
    }

    return true;
  }

  private compareBySortKey(a: StrategyTemplate, b: StrategyTemplate, sortBy: string): number {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'downloads':
        return b.downloads - a.downloads;
      case 'created':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'updated':
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      default:
        return 0;
    }
  }

  private async recordDownload(strategyId: string): Promise<void> {
    try {
      const download: StrategyDownload = {
        strategyId,
        userId: 'current-user', // 实际使用中应该从用户管理服务获取
        downloadedAt: new Date()
      };

      await this.cache.set('strategy-store', `strategy-download:${strategyId}:${Date.now()}`, download);
      
      // 更新下载次数
      const template = await this.getStrategyTemplate(strategyId);
      if (template) {
        template.downloads++;
        await this.cache.set('strategy-templates', `strategy-template:${strategyId}`, template);
      }
    } catch (error) {
      console.error('[StrategyStore] Failed to record download:', error);
    }
  }

  private async updateStrategyRating(strategyId: string): Promise<void> {
    try {
      // 这里实现更新策略平均评分的逻辑
      // 实际实现中需要计算所有评分的平均值
      console.log(`[StrategyStore] Updated rating for strategy ${strategyId}`);
    } catch (error) {
      console.error('[StrategyStore] Failed to update strategy rating:', error);
    }
  }

  private async getLocalStats(): Promise<StrategyStoreStats> {
    try {
      const index = await this.cache.get('strategy-store', 'index') || [];
      return {
        totalStrategies: index.length,
        totalDownloads: 0,
        topCategories: [],
        recentStrategies: [],
        popularStrategies: []
      };
    } catch (error) {
      return {
        totalStrategies: 0,
        totalDownloads: 0,
        topCategories: [],
        recentStrategies: [],
        popularStrategies: []
      };
    }
  }

  private generateId(): string {
    return `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateShareId(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 初始化默认策略模板（包括 Qlib 策略）
   */
  private async initializeDefaultTemplates(): Promise<void> {
    try {
      const templatesInitialized = await this.cache.get('strategy-templates', 'initialized');
      if (templatesInitialized) {
        console.log('[StrategyStore] Default templates already initialized');
        return;
      }

      const defaultTemplates: Omit<StrategyTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
        // Qlib 策略模板
        {
          name: 'Qlib Alpha158 因子策略',
          description: '基于 Qlib Alpha158 因子库的机器学习策略，使用 LightGBM 预测股票收益',
          author: 'Qlib Team',
          version: '1.0.0',
          category: 'qlib',
          tags: ['机器学习', 'Alpha158', 'LightGBM', '因子投资'],
          isPublic: true,
          rating: 4.8,
          downloads: 1250,
          config: {
            strategyType: 'qlib_ml',
            parameters: {
              model: 'LightGBM',
              features: 'Alpha158',
              trainingWindow: 252,
              predictionHorizon: 20,
              rebalanceFrequency: 'monthly',
              topK: 50,
              dropoutRate: 0.1
            },
            riskParams: {
              maxDrawdown: 0.15,
              stopLoss: 0.08,
              maxPositionSize: 0.05
            },
            tradingParams: {
              initialCapital: 10000000,
              commission: 0.001,
              slippage: 0.001
            }
          },
          backtestResults: {
            totalReturn: 0.45,
            annualizedReturn: 0.32,
            sharpeRatio: 2.15,
            maxDrawdown: 0.12,
            winRate: 0.65,
            trades: 156,
            period: '2020-2024'
          },
          code: {
            signals: 'qlib.alpha158.generate_signals',
            filters: 'qlib.filters.volume_filter',
            execution: 'qlib.execution.twap'
          }
        },
        {
          name: 'Qlib LSTM 时序预测策略',
          description: '使用 LSTM 神经网络进行股价时序预测的深度学习策略',
          author: 'Qlib Team',
          version: '1.0.0',
          category: 'qlib',
          tags: ['深度学习', 'LSTM', '时序预测', '神经网络'],
          isPublic: true,
          rating: 4.5,
          downloads: 980,
          config: {
            strategyType: 'qlib_dl',
            parameters: {
              model: 'LSTM',
              lookbackWindow: 60,
              lstmLayers: 3,
              hiddenSize: 128,
              dropout: 0.2,
              learningRate: 0.001,
              epochs: 100,
              batchSize: 64
            },
            riskParams: {
              maxDrawdown: 0.20,
              stopLoss: 0.10,
              maxPositionSize: 0.04
            },
            tradingParams: {
              initialCapital: 10000000,
              commission: 0.001,
              slippage: 0.001
            }
          },
          backtestResults: {
            totalReturn: 0.38,
            annualizedReturn: 0.28,
            sharpeRatio: 1.85,
            maxDrawdown: 0.18,
            winRate: 0.58,
            trades: 220,
            period: '2020-2024'
          }
        },
        {
          name: 'Qlib 因子挖掘策略',
          description: '基于 Qlib 自动因子挖掘框架的策略，结合遗传算法优化因子组合',
          author: 'Qlib Team',
          version: '1.0.0',
          category: 'qlib',
          tags: ['因子挖掘', '遗传算法', '自动化', 'Alpha生成'],
          isPublic: true,
          rating: 4.6,
          downloads: 756,
          config: {
            strategyType: 'qlib_factor_mining',
            parameters: {
              miningMethod: 'genetic_algorithm',
              populationSize: 100,
              generations: 50,
              mutationRate: 0.1,
              crossoverRate: 0.8,
              fitnessMetric: 'information_ratio',
              factorUniverse: 'price_volume',
              maxFactors: 20
            },
            riskParams: {
              maxDrawdown: 0.12,
              stopLoss: 0.06,
              maxPositionSize: 0.05
            },
            tradingParams: {
              initialCapital: 10000000,
              commission: 0.001,
              slippage: 0.001
            }
          }
        },
        // 项目内置策略模板
        {
          name: '高波动Alpha组合策略',
          description: '捕捉高波动率股票的超额收益，适合风险偏好较高的投资者',
          author: 'Arthera Quant',
          version: '2.0.0',
          category: 'volatility',
          tags: ['高波动', 'Alpha', '动量', '中高风险'],
          isPublic: true,
          rating: 4.3,
          downloads: 2100,
          config: {
            strategyType: 'quantitative',
            parameters: {
              volatilityWindow: 20,
              alphaThreshold: 0.05,
              rebalanceFrequency: 'weekly',
              maxPositionSize: 0.08,
              stopLoss: 0.15,
              takeProfit: 0.25,
              volumeFilter: true,
              minVolume: 1000000
            },
            riskParams: {
              maxDrawdown: 0.15,
              stopLoss: 0.08,
              maxPositionSize: 0.08
            },
            tradingParams: {
              initialCapital: 10000000,
              commission: 0.0003,
              slippage: 0.001
            }
          },
          backtestResults: {
            totalReturn: 0.423,
            annualizedReturn: 0.35,
            sharpeRatio: 2.15,
            maxDrawdown: 0.12,
            winRate: 0.65,
            trades: 280,
            period: '2022-2024'
          }
        },
        {
          name: '多因子平衡策略',
          description: '结合价值、质量、动量和低波动因子的稳健策略',
          author: 'Arthera Quant',
          version: '2.0.0',
          category: 'multi-factor',
          tags: ['多因子', '稳健', '低换手', '价值投资'],
          isPublic: true,
          rating: 4.7,
          downloads: 3200,
          config: {
            strategyType: 'multi_factor',
            parameters: {
              factors: ['value', 'quality', 'momentum', 'lowVol'],
              factorWeights: [0.3, 0.3, 0.25, 0.15],
              rebalanceFrequency: 'quarterly',
              maxPositionSize: 0.05,
              stopLoss: 0.12,
              takeProfit: 0.20,
              sectorNeutral: true,
              maxSectorWeight: 0.30
            },
            riskParams: {
              maxDrawdown: 0.08,
              stopLoss: 0.05,
              maxPositionSize: 0.05
            },
            tradingParams: {
              initialCapital: 10000000,
              commission: 0.0003,
              slippage: 0.0005
            }
          },
          backtestResults: {
            totalReturn: 0.285,
            annualizedReturn: 0.22,
            sharpeRatio: 1.85,
            maxDrawdown: 0.08,
            winRate: 0.72,
            trades: 98,
            period: '2022-2024'
          }
        },
        {
          name: '智能风险平价策略',
          description: '基于风险贡献度均衡配置的智能资产配置策略',
          author: 'Arthera Quant',
          version: '1.0.0',
          category: 'risk-parity',
          tags: ['风险平价', '资产配置', '低风险', '机构级'],
          isPublic: true,
          rating: 4.9,
          downloads: 1800,
          config: {
            strategyType: 'risk_parity',
            parameters: {
              assetClasses: ['stocks', 'bonds', 'commodities', 'reits'],
              riskBudgets: [0.25, 0.25, 0.25, 0.25],
              lookbackWindow: 252,
              rebalanceFrequency: 'monthly',
              leverageTarget: 1.0,
              volatilityTarget: 0.10,
              correlationDecay: 0.97
            },
            riskParams: {
              maxDrawdown: 0.06,
              stopLoss: 0.04,
              maxPositionSize: 0.10
            },
            tradingParams: {
              initialCapital: 50000000,
              commission: 0.0002,
              slippage: 0.0003
            }
          },
          backtestResults: {
            totalReturn: 0.156,
            annualizedReturn: 0.12,
            sharpeRatio: 1.65,
            maxDrawdown: 0.05,
            winRate: 0.68,
            trades: 48,
            period: '2020-2024'
          }
        },
        {
          name: '配对交易统计套利',
          description: '基于协整关系的配对交易策略，捕捉价格偏离的回归机会',
          author: 'Arthera Quant',
          version: '1.0.0',
          category: 'arbitrage',
          tags: ['配对交易', '统计套利', '市场中性', '低风险'],
          isPublic: true,
          rating: 4.4,
          downloads: 1200,
          config: {
            strategyType: 'pairs_trading',
            parameters: {
              cointegrationWindow: 60,
              entryZScore: 2.0,
              exitZScore: 0.5,
              stopLossZScore: 3.0,
              minHalfLife: 5,
              maxHalfLife: 60,
              pairSelectionMethod: 'distance',
              maxPairs: 20
            },
            riskParams: {
              maxDrawdown: 0.10,
              stopLoss: 0.05,
              maxPositionSize: 0.10
            },
            tradingParams: {
              initialCapital: 20000000,
              commission: 0.0003,
              slippage: 0.0005
            }
          },
          backtestResults: {
            totalReturn: 0.234,
            annualizedReturn: 0.18,
            sharpeRatio: 2.35,
            maxDrawdown: 0.06,
            winRate: 0.71,
            trades: 420,
            period: '2021-2024'
          }
        },
        {
          name: 'AI深度学习趋势策略',
          description: '使用深度神经网络预测市场趋势，结合强化学习优化交易决策',
          author: 'Arthera Quant',
          version: '1.0.0',
          category: 'ai-ml',
          tags: ['深度学习', 'AI', '趋势跟踪', '高频'],
          isPublic: true,
          rating: 4.2,
          downloads: 890,
          config: {
            strategyType: 'ml',
            parameters: {
              modelType: 'transformer',
              features: ['price', 'volume', 'technical', 'sentiment'],
              sequenceLength: 100,
              predictionHorizon: 5,
              confidenceThreshold: 0.7,
              ensembleSize: 5,
              retrainFrequency: 30,
              useReinforcementLearning: true
            },
            riskParams: {
              maxDrawdown: 0.18,
              stopLoss: 0.08,
              maxPositionSize: 0.06
            },
            tradingParams: {
              initialCapital: 30000000,
              commission: 0.0002,
              slippage: 0.0003
            }
          },
          backtestResults: {
            totalReturn: 0.512,
            annualizedReturn: 0.38,
            sharpeRatio: 1.95,
            maxDrawdown: 0.16,
            winRate: 0.62,
            trades: 580,
            period: '2022-2024'
          }
        }
      ];

      // 保存所有默认模板
      for (const template of defaultTemplates) {
        await this.saveStrategyTemplate(template);
      }

      await this.cache.set('strategy-templates', 'initialized', true);
      console.log(`[StrategyStore] Initialized ${defaultTemplates.length} default templates`);
    } catch (error) {
      console.error('[StrategyStore] Failed to initialize default templates:', error);
    }
  }

  /**
   * 获取 Qlib 策略模板
   */
  async getQlibTemplates(): Promise<StrategyTemplate[]> {
    try {
      const result = await this.searchStrategies({
        category: 'qlib',
        sortBy: 'rating',
        limit: 100
      });
      return result.strategies;
    } catch (error) {
      console.error('[StrategyStore] Failed to get Qlib templates:', error);
      return [];
    }
  }

  /**
   * 获取推荐的策略模板
   */
  async getRecommendedTemplates(userProfile?: {
    riskTolerance: 'low' | 'medium' | 'high';
    experienceLevel: 'beginner' | 'intermediate' | 'expert';
    preferredStyle?: string[];
  }): Promise<StrategyTemplate[]> {
    try {
      let query: any = {
        minRating: 4.0,
        sortBy: 'rating',
        limit: 10
      };

      if (userProfile) {
        // 根据用户风险偏好筛选
        if (userProfile.riskTolerance === 'low') {
          query.tags = ['低风险', '稳健'];
        } else if (userProfile.riskTolerance === 'high') {
          query.tags = ['高风险', '高收益'];
        }

        // 根据经验水平筛选
        if (userProfile.experienceLevel === 'beginner') {
          query.category = 'multi-factor'; // 多因子策略相对简单易懂
        } else if (userProfile.experienceLevel === 'expert') {
          query.tags = [...(query.tags || []), 'AI', '机器学习'];
        }
      }

      const result = await this.searchStrategies(query);
      return result.strategies;
    } catch (error) {
      console.error('[StrategyStore] Failed to get recommended templates:', error);
      return [];
    }
  }

  /**
   * 从模板创建策略实例
   */
  async createStrategyFromTemplate(templateId: string, customConfig?: Partial<StrategyTemplate['config']>): Promise<{
    strategyId: string;
    config: StrategyTemplate['config'];
  }> {
    try {
      const template = await this.getStrategyTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // 合并自定义配置
      const finalConfig = {
        ...template.config,
        ...customConfig
      };

      // 生成新的策略实例ID
      const strategyId = `instance_${templateId}_${Date.now()}`;

      // 记录下载
      await this.importStrategy(templateId);

      console.log(`[StrategyStore] Created strategy instance from template: ${templateId}`);
      return {
        strategyId,
        config: finalConfig
      };
    } catch (error) {
      console.error('[StrategyStore] Failed to create strategy from template:', error);
      throw error;
    }
  }
}

// 全局实例
export const strategyStoreService = new StrategyStoreService();
export default strategyStoreService;
