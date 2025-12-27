// api-cache.ts - API呼び出し最適化・キャッシュシステム

import { debugLog, ENHANCED_MONITORING_CONFIG } from './config';
import GasAPI from './api';

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface RequestQueueItem {
  functionName: string;
  function: (...args: any[]) => Promise<any>;
  params: any[];
  cacheKey: string;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timestamp: number;
  useCache?: boolean;
}

interface RequestBatchItem {
  functionName: string;
  params: any[];
  useCache?: boolean;
}

class APICache {
  private cache: Map<string, CacheEntry>;
  private pendingRequests: Map<string, Promise<any>>;
  private requestQueue: RequestQueueItem[];
  private isProcessing: boolean;
  private maxConcurrentRequests: number;
  private activeRequests: number;
  private cacheTimeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
    this.maxConcurrentRequests = ENHANCED_MONITORING_CONFIG.maxConcurrentChecks || 5;
    this.activeRequests = 0;
    this.cacheTimeout = ENHANCED_MONITORING_CONFIG.cacheTimeout || 60000;
    this.retryAttempts = ENHANCED_MONITORING_CONFIG.retryAttempts || 3;
    this.retryDelay = ENHANCED_MONITORING_CONFIG.retryDelay || 1000;

    // キャッシュクリーンアップの定期実行
    this.startCacheCleanup();

    debugLog('[APICache] 初期化完了', {
      maxConcurrent: this.maxConcurrentRequests,
      cacheTimeout: this.cacheTimeout,
      retryAttempts: this.retryAttempts
    });
  }

  // キャッシュクリーンアップを開始
  startCacheCleanup() {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, this.cacheTimeout / 2); // キャッシュタイムアウトの半分の間隔でクリーンアップ
  }

  // 期限切れキャッシュをクリーンアップ
  cleanupExpiredCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      debugLog('[APICache] キャッシュクリーンアップ', { cleanedCount });
    }
  }

  // キャッシュキーを生成
  generateCacheKey(functionName: string, params: any[] = []) {
    const paramString = JSON.stringify(params);
    return `${functionName}:${paramString}`;
  }

  // キャッシュからデータを取得
  getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    debugLog('[APICache] キャッシュヒット', { key });
    return entry.data;
  }

  // キャッシュにデータを保存
  setCache(key: string, data: any) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });

    debugLog('[APICache] キャッシュ保存', { key });
  }

  // リクエストキューに追加
  addToQueue(request: Omit<RequestQueueItem, 'resolve' | 'reject' | 'timestamp'>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        ...request,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.processQueue();
    });
  }

  // リクエストキューを処理
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const request = this.requestQueue.shift();
      if (request) {
        this.processRequest(request);
      }
    }

    this.isProcessing = false;
  }

  // 個別リクエストを処理
  async processRequest(request: RequestQueueItem) {
    this.activeRequests++;

    try {
      const result = await this.executeRequest(request);
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue(); // 次のリクエストを処理
    }
  }

  // リクエストを実行（リトライ機能付き）
  async executeRequest(request: { function: Function, params: any[], functionName?: string }, attempt = 1): Promise<any> {
    try {
      const result = await request.function(...request.params);
      return result;
    } catch (error: any) {
      if (attempt < this.retryAttempts) {
        debugLog('[APICache] リトライ実行', {
          attempt,
          functionName: request.functionName,
          error: error.message
        });

        await this.delay(this.retryDelay * attempt);
        return this.executeRequest(request, attempt + 1);
      } else {
        throw error;
      }
    }
  }

  // 遅延実行
  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 最適化されたAPI呼び出し
  async callAPI(functionName: string, params: any[] = [], useCache = true) {
    const cacheKey = this.generateCacheKey(functionName, params);

    // キャッシュから取得を試行
    if (useCache) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // 既に同じリクエストが処理中の場合は待機
    if (this.pendingRequests.has(cacheKey)) {
      debugLog('[APICache] 重複リクエスト待機', { cacheKey });
      return this.pendingRequests.get(cacheKey);
    }

    // 新しいリクエストを作成
    const requestPromise = this.addToQueue({
      functionName,
      function: this.getAPIFunction(functionName),
      params,
      cacheKey
    });

    // リクエストを記録
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;

      // 成功時はキャッシュに保存
      if (useCache && result && result.success !== false) {
        this.setCache(cacheKey, result);
      }

      return result;
    } finally {
      // リクエスト完了時に記録から削除
      this.pendingRequests.delete(cacheKey);
    }
  }

  // API関数を取得
  getAPIFunction(functionName: string): (...args: any[]) => Promise<any> {
    // GasAPIクラスをインポートして使用
    const apiClass: any = GasAPI;

    // 静的メソッドが存在するか確認
    if (typeof apiClass[functionName] === 'function') {
      return apiClass[functionName].bind(apiClass);
    }

    // メソッドが無い場合は汎用の _callApi をラップ（params は配列で渡す）
    if (typeof apiClass._callApi === 'function') {
      return (...params) => apiClass._callApi(functionName, params);
    }

    // フォールバック（window.GasAPIも確認）
    if (typeof window !== 'undefined' && (window as any).GasAPI) {
      const globalGasApi = (window as any).GasAPI;
      if (typeof globalGasApi[functionName] === 'function') {
        return globalGasApi[functionName].bind(globalGasApi);
      }
      if (typeof globalGasApi._callApi === 'function') {
        return (...params: any[]) => globalGasApi._callApi(functionName, params);
      }
    }

    return async (...params) => {
      throw new Error(`API function ${functionName} not found`);
    };
  }

  // バッチAPI呼び出し（複数のAPIを同時実行）
  async batchCallAPI(requests: RequestBatchItem[]) {
    const promises = requests.map(request =>
      this.callAPI(request.functionName, request.params, request.useCache !== false)
    );

    const results = await Promise.allSettled(promises);

    return results.map((result, index) => ({
      request: requests[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }

  // キャッシュ統計を取得
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      pendingRequests: this.pendingRequests.size
    };
  }

  // キャッシュをクリア
  clearCache() {
    this.cache.clear();
    debugLog('[APICache] キャッシュクリア');
  }

  // 特定のキーのキャッシュを削除
  deleteCacheKey(key: string) {
    this.cache.delete(key);
    debugLog('[APICache] キャッシュキー削除', { key });
  }

  // 関数名に基づくキャッシュのクリア（前方一致）
  clearFunctionCache(functionName: string) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(functionName + ':')) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      debugLog('[APICache] 関数キャッシュクリア', { functionName, count });
    }
  }

  // リクエストの重複排除とキャッシュ利用
  async deduplicateRequest(functionName: string, params: any[], fetcher?: () => Promise<any>) {
    const cacheKey = this.generateCacheKey(functionName, params);

    // キャッシュ確認
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // 重複リクエスト確認
    if (this.pendingRequests.has(cacheKey)) {
      debugLog('[APICache] 重複リクエスト待機 (dedup)', { cacheKey });
      return this.pendingRequests.get(cacheKey);
    }

    // 新規リクエスト
    // fetcherを実行するPromiseを作成
    const promise = (async () => {
      try {
        // fetcherが提供されている場合はそれを使用、なければgetAPIFunction
        const result = fetcher ? await fetcher() : await this.executeRequest({
          functionName,
          function: this.getAPIFunction(functionName),
          params
        });

        // 成功したらキャッシュ
        if (result && result.success !== false) {
          this.setCache(cacheKey, result);
        }
        return result;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }


  // パフォーマンス統計を取得
  getPerformanceStats() {
    return {
      cacheStats: this.getCacheStats(),
      config: {
        maxConcurrentRequests: this.maxConcurrentRequests,
        cacheTimeout: this.cacheTimeout,
        retryAttempts: this.retryAttempts,
        retryDelay: this.retryDelay
      }
    };
  }
}

// グローバルインスタンス
const apiCache = new APICache();

// グローバル関数として公開
if (typeof window !== 'undefined') {
  (window as any).APICache = apiCache;
}

export default apiCache;