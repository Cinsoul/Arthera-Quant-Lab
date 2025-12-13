/**
 * CacheManager - IndexedDB 数据缓存管理器
 * 负责本地数据存储、缓存策略和离线支持
 * Bloomberg Terminal 级别的数据持久化
 */

import { MarketData } from './DataStreamManager';

export interface CachedData<T = any> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
}

export interface CacheConfig {
  dbName: string;
  dbVersion: number;
  defaultTTL: number; // Time to live in milliseconds
  maxCacheSize: number; // Maximum number of items
}

export type CacheStore = 
  | 'market-data'      // 市场数据
  | 'strategies'       // 策略配置
  | 'backtests'        // 回测结果
  | 'portfolios'       // 组合数据
  | 'reports'          // 报告数据
  | 'user-preferences' // 用户偏好
  | 'user-settings'    // 用户设置
  | 'historical-prices' // 历史价格
  | 'strategy-store'   // 策略商店
  | 'strategy-templates' // 策略模板
  | 'portfolio-main'   // 组合主数据
  | 'portfolio-current' // 当前组合缓存
  | 'portfolio-perf-subscription' // 组合性能订阅 ID
  | 'strategies-running' // 运行中的策略列表
  | 'workspace-state'  // 工作区状态
  | 'cache-metadata';  // 缓存元数据

const REQUIRED_STORES: CacheStore[] = [
  'market-data',
  'strategies',
  'backtests',
  'portfolios',
  'reports',
  'user-preferences',
  'historical-prices',
  'user-settings',
  'strategy-store',
  'strategy-templates',
  'portfolio-main',
  'portfolio-current',
  'portfolio-perf-subscription',
  'strategies-running',
  'workspace-state',
  'cache-metadata',
];

export class CacheManager {
  private db: IDBDatabase | null = null;
  private config: CacheConfig;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      dbName: 'arthera-quant-cache',
      dbVersion: 1, // 使用稳定的版本号
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 1000,
      ...config,
    };
  }

  /**
   * 初始化 IndexedDB
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('[CacheManager] IndexedDB not available');
        resolve();
        return;
      }

      let request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      const handleError = async () => {
        const error = request.error;
        console.error('[CacheManager] Database error:', error);
        
        // 处理版本冲突 - 完全重建数据库
        if (error?.name === 'VersionError' || error?.name === 'InvalidStateError') {
          console.warn('[CacheManager] Version conflict detected, rebuilding database...');
          
          try {
            // 删除旧数据库
            const deleteRequest = indexedDB.deleteDatabase(this.config.dbName);
            deleteRequest.onsuccess = () => {
              console.log('[CacheManager] Old database deleted successfully');
              // 重新打开数据库
              request = indexedDB.open(this.config.dbName, this.config.dbVersion);
              attachHandlers();
            };
            deleteRequest.onerror = () => {
              console.error('[CacheManager] Failed to delete old database');
              reject(new Error('Failed to rebuild database'));
            };
          } catch (deleteError) {
            console.error('[CacheManager] Error during database deletion:', deleteError);
            reject(deleteError);
          }
          return;
        }
        
        // 其他错误
        reject(error || new Error('Unknown database error'));
      };

      const attachHandlers = () => {
        request.onerror = handleError;
        request.onsuccess = () => {
          this.db = request.result;
          console.log('[CacheManager] Database opened successfully');
          resolve();
        };
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = (event.target as IDBOpenDBRequest).transaction!;
          const oldVersion = event.oldVersion;
          const newVersion = event.newVersion;
          
          console.log(`[CacheManager] Upgrading database from version ${oldVersion} to ${newVersion}`);
          
          try {
            // 安全创建对象存储
            REQUIRED_STORES.forEach(storeName => {
              let store: IDBObjectStore;
              
              if (!db.objectStoreNames.contains(storeName)) {
                // 创建新的对象存储
                store = db.createObjectStore(storeName, { keyPath: 'key' });
                console.log(`[CacheManager] Created object store: ${storeName}`);
              } else {
                // 获取现有存储
                store = transaction.objectStore(storeName);
              }
              
              // 确保索引存在
              try {
                if (!store.indexNames.contains('timestamp')) {
                  store.createIndex('timestamp', 'timestamp', { unique: false });
                }
                if (!store.indexNames.contains('expiresAt')) {
                  store.createIndex('expiresAt', 'expiresAt', { unique: false });
                }
              } catch (indexError) {
                console.warn(`[CacheManager] Index creation warning for ${storeName}:`, indexError);
              }
            });
            
            console.log('[CacheManager] Database upgrade completed successfully');
          } catch (upgradeError) {
            console.error('[CacheManager] Database upgrade failed:', upgradeError);
            throw upgradeError;
          }
        };
      };

      attachHandlers();

    });

    return this.initPromise;
  }

  /**
   * 设置缓存数据
   */
  async set<T>(store: CacheStore, key: string, data: T, ttl?: number): Promise<void> {
    await this.init();
    
    if (!this.db) {
      console.warn('[CacheManager] Database not initialized');
      return;
    }

    if (!(await this.ensureObjectStore(store))) {
      console.warn(`[CacheManager] Store '${store}' unavailable`);
      return;
    }

    const now = Date.now();
    const expiresAt = ttl ? now + ttl : now + this.config.defaultTTL;

    const cachedData: CachedData<T> = {
      key,
      data,
      timestamp: now,
      expiresAt,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(cachedData);

      request.onsuccess = () => {
        console.log(`[CacheManager] Cached ${store}/${key}`);
        resolve();
      };

      request.onerror = () => {
        console.error(`[CacheManager] Failed to cache ${store}/${key}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 获取缓存数据
   */
  async get<T>(store: CacheStore, key: string): Promise<T | null> {
    await this.init();

    if (!this.db) {
      console.warn('[CacheManager] Database not initialized');
      return null;
    }

    if (!(await this.ensureObjectStore(store))) {
      console.warn(`[CacheManager] Store '${store}' unavailable`);
      return null;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([store], 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.get(key);

        transaction.onerror = () => {
          console.error(`[CacheManager] Transaction error for ${store}/${key}:`, transaction.error);
          resolve(null);
        };
        transaction.onabort = () => resolve(null);

        request.onerror = () => {
          console.error(`[CacheManager] Failed to get ${store}/${key}:`, request.error);
          resolve(null);
        };

        request.onsuccess = () => {
          const cached = request.result as CachedData<T> | undefined;
          if (!cached) {
            resolve(null);
            return;
          }

          if (cached.expiresAt && Date.now() > cached.expiresAt) {
            console.log(`[CacheManager] Cache expired: ${store}/${key}`);
            this.delete(store, key);
            resolve(null);
            return;
          }

          resolve(cached.data);
        };
      } catch (error) {
        console.error(`[CacheManager] Transaction error for ${store}/${key}:`, error);
        resolve(null);
      }
    });
  }

  async keys(store: CacheStore, prefix: string = ''): Promise<string[]> {
    await this.init();
    if (!this.db || !(await this.ensureObjectStore(store))) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.openCursor();
      const keys: string[] = [];

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (cursor.key.toString().startsWith(prefix)) {
            keys.push(cursor.key.toString());
          }
          cursor.continue();
        } else {
          resolve(keys);
        }
      };
    });
  }

  /**
   * 删除缓存数据
   */
  async delete(store: CacheStore, key: string): Promise<void> {
    await this.init();
    
    if (!this.db) {
      console.warn('[CacheManager] Database not initialized');
      return;
    }

    if (!(await this.ensureObjectStore(store))) {
      console.warn(`[CacheManager] Store '${store}' unavailable`);
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onsuccess = () => {
        console.log(`[CacheManager] Deleted ${store}/${key}`);
        resolve();
      };

      request.onerror = () => {
        console.error(`[CacheManager] Failed to delete ${store}/${key}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 清空所有缓存（用于调试）
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const stores: CacheStore[] = [...REQUIRED_STORES];

    const transaction = this.db!.transaction(stores, 'readwrite');

    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log('[CacheManager] ✅ All caches cleared');
  }

  /**
   * 清空特定存储的所有数据
   */
  async clearStore(storeName: CacheStore): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db || !(await this.ensureObjectStore(storeName))) {
      console.warn(`[CacheManager] Store '${storeName}' unavailable`);
      return;
    }

    const transaction = this.db!.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log(`[CacheManager] ✅ Cleared store: ${storeName}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取存储中的所有数据
   */
  async getAll<T>(store: CacheStore): Promise<T[]> {
    await this.init();
    
    if (!this.db) {
      console.warn('[CacheManager] Database not initialized');
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const cached = request.result as CachedData<T>[];
        const now = Date.now();
        
        // 过滤掉过期数据
        const valid = cached
          .filter(item => !item.expiresAt || now <= item.expiresAt)
          .map(item => item.data);
        
        console.log(`[CacheManager] Retrieved ${valid.length} items from ${store}`);
        resolve(valid);
      };

      request.onerror = () => {
        console.error(`[CacheManager] Failed to get all from ${store}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 清理过期数据
   */
  async cleanExpired(store: CacheStore): Promise<number> {
    await this.init();
    
    if (!this.db) {
      console.warn('[CacheManager] Database not initialized');
      return 0;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const index = objectStore.index('expiresAt');
      const now = Date.now();
      let deletedCount = 0;

      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
        
        if (cursor) {
          const cached = cursor.value as CachedData;
          if (cached.expiresAt && now > cached.expiresAt) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          console.log(`[CacheManager] Cleaned ${deletedCount} expired items from ${store}`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error(`[CacheManager] Failed to clean expired from ${store}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 获取存储的数据量
   */
  async count(store: CacheStore): Promise<number> {
    await this.init();
    
    if (!this.db) {
      console.warn('[CacheManager] Database not initialized');
      return 0;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`[CacheManager] Failed to count ${store}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 批量设置数据
   */
  async setMany<T>(store: CacheStore, items: Array<{ key: string; data: T }>, ttl?: number): Promise<void> {
    await this.init();
    
    if (!this.db) {
      console.warn('[CacheManager] Database not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const now = Date.now();
      const expiresAt = ttl ? now + ttl : now + this.config.defaultTTL;

      let completed = 0;
      let hasError = false;

      items.forEach(item => {
        const cachedData: CachedData<T> = {
          key: item.key,
          data: item.data,
          timestamp: now,
          expiresAt,
        };

        const request = objectStore.put(cachedData);

        request.onsuccess = () => {
          completed++;
          if (completed === items.length && !hasError) {
            console.log(`[CacheManager] Batch cached ${items.length} items in ${store}`);
            resolve();
          }
        };

        request.onerror = () => {
          hasError = true;
          console.error(`[CacheManager] Failed to cache ${item.key}:`, request.error);
          reject(request.error);
        };
      });
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      console.log('[CacheManager] Database closed');
    }
  }

  private async ensureObjectStore(store: CacheStore): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    if (this.db.objectStoreNames.contains(store)) {
      return true;
    }

    const nextVersion = (this.db.version || this.config.dbVersion) + 1;
    console.warn(`[CacheManager] Store '${store}' missing, upgrading IndexedDB to v${nextVersion}`);

    try {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      this.config.dbVersion = nextVersion;
      await this.init();
      return !!this.db && this.db.objectStoreNames.contains(store);
    } catch (error) {
      console.error(`[CacheManager] Failed to upgrade database for store '${store}':`, error);
      return false;
    }
  }
}

// 全局单例实例
let globalCacheManager: CacheManager | null = null;

/**
 * 获取全局缓存管理器实例
 */
export function getCacheManager(): CacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new CacheManager();
    
    // 自动初始化
    if (typeof window !== 'undefined') {
      globalCacheManager.init().catch(error => {
        console.error('[CacheManager] Failed to initialize:', error);
      });

      // ✅ 暴露清除缓存方法到全局对象（用于调试）
      (window as any).__clearCache = async () => {
        console.log('🗑️  Clearing all cache...');
        await globalCacheManager!.clearAll();
        console.log('✅ Cache cleared! Refreshing page...');
        window.location.reload();
      };

      (window as any).__clearHistoricalPrices = async () => {
        console.log('🗑️  Clearing historical prices cache...');
        await globalCacheManager!.clearStore('historical-prices');
        console.log('✅ Historical prices cache cleared! Refreshing page...');
        window.location.reload();
      };

      // 定期清理过期数据（每小时）
      setInterval(() => {
        const stores: CacheStore[] = ['market-data', 'strategies', 'backtests'];
        stores.forEach(store => {
          globalCacheManager?.cleanExpired(store);
        });
      }, 60 * 60 * 1000);
    }
  }
  return globalCacheManager;
}

/**
 * React Hook: 使用缓存数据
 */
export function useCachedData<T>(
  store: CacheStore,
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const cacheManager = React.useMemo(() => getCacheManager(), []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 先尝试从缓存获取
      const cached = await cacheManager.get<T>(store, key);
      
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      // 缓存未命中，执行 fetcher
      const freshData = await fetcher();
      setData(freshData);
      
      // 缓存新数据
      await cacheManager.set(store, key, freshData, ttl);
      
    } catch (err) {
      setError(err as Error);
      console.error(`[useCachedData] Error loading ${store}/${key}:`, err);
    } finally {
      setLoading(false);
    }
  }, [store, key, ttl]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = React.useCallback(async () => {
    await cacheManager.delete(store, key);
    await loadData();
  }, [store, key, loadData]);

  return { data, loading, error, refresh };
}

// React import for hooks
import React from 'react';

// ============================================================================
// 性能优化管理器
// ============================================================================

export interface PerformanceMetrics {
  cacheHitRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  operationCounts: {
    reads: number;
    writes: number;
    deletes: number;
  };
  lastOptimizedAt: Date;
}

export interface DataCompressionConfig {
  enableCompression: boolean;
  compressionLevel: number; // 1-9
  compressLargeData: boolean;
  largeDataThreshold: number; // bytes
}

export interface QueryOptimization {
  indexedFields: string[];
  queryCache: Map<string, any>;
  maxQueryCacheSize: number;
  queryStatistics: Map<string, {count: number, avgTime: number}>;
}

/**
 * 性能优化管理器
 */
export class PerformanceOptimizer {
  private metrics: PerformanceMetrics = {
    cacheHitRate: 0,
    avgResponseTime: 0,
    memoryUsage: 0,
    operationCounts: {
      reads: 0,
      writes: 0,
      deletes: 0
    },
    lastOptimizedAt: new Date()
  };

  private compressionConfig: DataCompressionConfig = {
    enableCompression: true,
    compressionLevel: 6,
    compressLargeData: true,
    largeDataThreshold: 1024 * 1024 // 1MB
  };

  private queryOptimizer: QueryOptimization = {
    indexedFields: ['symbol', 'timestamp', 'strategyId'],
    queryCache: new Map(),
    maxQueryCacheSize: 1000,
    queryStatistics: new Map()
  };

  private operationTimes: number[] = [];
  private maxOperationHistory = 100;

  /**
   * 记录操作性能
   */
  recordOperation(type: 'read' | 'write' | 'delete', duration: number): void {
    this.metrics.operationCounts[type === 'read' ? 'reads' : type === 'write' ? 'writes' : 'deletes']++;
    
    this.operationTimes.push(duration);
    if (this.operationTimes.length > this.maxOperationHistory) {
      this.operationTimes.shift();
    }

    this.updateAvgResponseTime();
  }

  /**
   * 压缩数据
   */
  compressData(data: any): string {
    if (!this.compressionConfig.enableCompression) {
      return JSON.stringify(data);
    }

    const jsonString = JSON.stringify(data);
    
    if (!this.compressionConfig.compressLargeData || 
        jsonString.length < this.compressionConfig.largeDataThreshold) {
      return jsonString;
    }

    // 简化的压缩实现（实际应用中使用如pako等库）
    try {
      // 这里可以集成真正的压缩算法
      return this.simpleCompress(jsonString);
    } catch (error) {
      console.warn('[PerformanceOptimizer] Compression failed, using raw data:', error);
      return jsonString;
    }
  }

  /**
   * 解压数据
   */
  decompressData(compressedData: string): any {
    try {
      // 尝试解压
      const decompressed = this.simpleDecompress(compressedData);
      return JSON.parse(decompressed);
    } catch (error) {
      // 如果解压失败，尝试直接解析
      try {
        return JSON.parse(compressedData);
      } catch (parseError) {
        console.error('[PerformanceOptimizer] Failed to decompress/parse data:', error);
        return null;
      }
    }
  }

  /**
   * 优化查询
   */
  optimizeQuery(queryKey: string, query: () => Promise<any>): Promise<any> {
    // 检查查询缓存
    if (this.queryOptimizer.queryCache.has(queryKey)) {
      const stats = this.queryOptimizer.queryStatistics.get(queryKey);
      if (stats) {
        stats.count++;
      }
      return Promise.resolve(this.queryOptimizer.queryCache.get(queryKey));
    }

    // 执行查询并缓存结果
    const startTime = performance.now();
    
    return query().then(result => {
      const duration = performance.now() - startTime;
      
      // 更新统计
      const stats = this.queryOptimizer.queryStatistics.get(queryKey) || {count: 0, avgTime: 0};
      stats.count++;
      stats.avgTime = (stats.avgTime * (stats.count - 1) + duration) / stats.count;
      this.queryOptimizer.queryStatistics.set(queryKey, stats);

      // 缓存结果
      if (this.queryOptimizer.queryCache.size >= this.queryOptimizer.maxQueryCacheSize) {
        // 移除最旧的缓存项
        const firstKey = this.queryOptimizer.queryCache.keys().next().value;
        this.queryOptimizer.queryCache.delete(firstKey);
      }
      this.queryOptimizer.queryCache.set(queryKey, result);

      return result;
    });
  }

  /**
   * 批量操作优化
   */
  async batchOptimize<T>(
    operations: Array<() => Promise<T>>,
    batchSize: number = 10,
    delayBetweenBatches: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(operation => operation().catch(error => {
          console.error('[PerformanceOptimizer] Batch operation failed:', error);
          return null;
        }))
      );
      
      results.push(...batchResults.filter(result => result !== null));
      
      // 延迟以避免过载
      if (i + batchSize < operations.length && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }

  /**
   * 内存使用优化
   */
  optimizeMemoryUsage(): void {
    // 清理查询缓存
    if (this.queryOptimizer.queryCache.size > this.queryOptimizer.maxQueryCacheSize * 0.8) {
      const keysToRemove = Array.from(this.queryOptimizer.queryCache.keys())
        .slice(0, Math.floor(this.queryOptimizer.maxQueryCacheSize * 0.2));
      
      keysToRemove.forEach(key => this.queryOptimizer.queryCache.delete(key));
    }

    // 清理操作历史
    if (this.operationTimes.length > this.maxOperationHistory) {
      this.operationTimes = this.operationTimes.slice(-this.maxOperationHistory / 2);
    }

    // 触发垃圾回收（如果可用）
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }

    this.metrics.lastOptimizedAt = new Date();
    console.log('[PerformanceOptimizer] Memory optimization completed');
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  /**
   * 获取查询统计
   */
  getQueryStatistics(): Array<{query: string, count: number, avgTime: number}> {
    return Array.from(this.queryOptimizer.queryStatistics.entries())
      .map(([query, stats]) => ({ query, ...stats }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 重置性能指标
   */
  resetMetrics(): void {
    this.metrics = {
      cacheHitRate: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      operationCounts: {
        reads: 0,
        writes: 0,
        deletes: 0
      },
      lastOptimizedAt: new Date()
    };
    this.operationTimes = [];
    this.queryOptimizer.queryCache.clear();
    this.queryOptimizer.queryStatistics.clear();
  }

  /**
   * 配置压缩设置
   */
  configureCompression(config: Partial<DataCompressionConfig>): void {
    this.compressionConfig = { ...this.compressionConfig, ...config };
  }

  // 私有方法
  private updateAvgResponseTime(): void {
    if (this.operationTimes.length === 0) return;
    
    const sum = this.operationTimes.reduce((a, b) => a + b, 0);
    this.metrics.avgResponseTime = sum / this.operationTimes.length;
  }

  private updateMemoryUsage(): void {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
  }

  private simpleCompress(data: string): string {
    // 简化的压缩实现 - 实际应用中应使用专业的压缩库
    return btoa(encodeURIComponent(data));
  }

  private simpleDecompress(compressed: string): string {
    // 简化的解压实现
    return decodeURIComponent(atob(compressed));
  }
}

/**
 * 数据分片管理器
 * 用于处理大型数据集
 */
export class DataShardManager {
  private shardSize: number = 1000; // 每个分片的记录数
  private shards: Map<string, any[]> = new Map();

  /**
   * 将大型数据集分片存储
   */
  shardData<T>(key: string, data: T[]): string[] {
    const shardIds: string[] = [];
    
    for (let i = 0; i < data.length; i += this.shardSize) {
      const shard = data.slice(i, i + this.shardSize);
      const shardId = `${key}_shard_${Math.floor(i / this.shardSize)}`;
      
      this.shards.set(shardId, shard);
      shardIds.push(shardId);
    }
    
    return shardIds;
  }

  /**
   * 重组分片数据
   */
  reconstructData<T>(shardIds: string[]): T[] {
    const data: T[] = [];
    
    for (const shardId of shardIds) {
      const shard = this.shards.get(shardId);
      if (shard) {
        data.push(...shard);
      }
    }
    
    return data;
  }

  /**
   * 删除分片
   */
  deleteShard(shardId: string): void {
    this.shards.delete(shardId);
  }

  /**
   * 清理所有分片
   */
  clearShards(): void {
    this.shards.clear();
  }
}

// 全局实例
export const performanceOptimizer = new PerformanceOptimizer();
export const dataShardManager = new DataShardManager();

// 自动启动性能监控
if (typeof window !== 'undefined') {
  // 每5分钟进行一次内存优化
  setInterval(() => {
    performanceOptimizer.optimizeMemoryUsage();
  }, 5 * 60 * 1000);

  // 暴露性能工具到全局对象（用于调试）
  (window as any).__performanceMetrics = () => {
    console.log('Performance Metrics:', performanceOptimizer.getMetrics());
    console.log('Query Statistics:', performanceOptimizer.getQueryStatistics());
  };
}
