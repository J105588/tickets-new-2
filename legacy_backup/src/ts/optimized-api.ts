// optimized-api.ts - 最適化されたAPIクラス
import { GAS_API_URLS, DEBUG_MODE, debugLog, apiUrlManager } from './config';
import audit from './audit-logger';
import apiCache from './api-cache';
import GasAPI from './api';

class OptimizedGasAPI extends GasAPI {

  // キャッシュ対応のAPI呼び出しヘルパー
  // fetcherが指定されていない場合は、親クラスの同名メソッドではなく _callApi を直接呼んでしまうため
  // 基本的にはメソッド内で明示的に super.method() を呼ぶ fetcher を渡すこと推奨
  static async _callApiWithCache(functionName: string, params: any[] = [], fetcher?: () => Promise<any>) {
    return apiCache.deduplicateRequest(functionName, params, fetcher || (() => {
      // フォールバック: super._callApi を呼ぶ（Supabaseロジックはバイパスされる可能性があるため注意）
      // 通常は fetcher を渡すべき
      return this._callApi(functionName, params);
    }));
  }

  // 最適化された座席データ取得
  static async getSeatData(group: string, day: string | number, timeslot: string | number, isAdmin: boolean, isSuperAdmin = false, useCache = true) {
    const params = [group, String(day), String(timeslot), isAdmin, isSuperAdmin];
    if (useCache) {
      return apiCache.deduplicateRequest('getSeatData', params, () => super.getSeatData(group, day, timeslot, isAdmin, isSuperAdmin));
    } else {
      return super.getSeatData(group, day, timeslot, isAdmin, isSuperAdmin);
    }
  }

  // 最適化された座席データ取得（最小限）
  // @ts-ignore: Parent method signature matching
  static async getSeatDataMinimal(group: string, day: string | number, timeslot: string | number, isAdmin = false) {
    const params = [group, String(day), String(timeslot), isAdmin];
    return apiCache.deduplicateRequest('getSeatDataMinimal', params, () => super.getSeatDataMinimal(group, day, timeslot, isAdmin));
  }

  // 最適化された時間帯データ取得
  static async getAllTimeslotsForGroup(group: string) {
    const params = [group];
    // getAllTimeslotsForGroup は api.ts に定義されている前提
    // 定義されていない場合は _callApi フォールバック
    if (typeof super.getAllTimeslotsForGroup === 'function') {
      const response = await apiCache.deduplicateRequest('getAllTimeslotsForGroup', params, () => super.getAllTimeslotsForGroup(group));
      return response.data || response; // api.tsの実装に依存
    }
    // define missing method behavior or fallback
    const response = await this._callApiWithCache('getAllTimeslotsForGroup', params);
    return response.data;
  }

  // システムロック状態取得（短いキャッシュ時間）
  static async getSystemLock() {
    const params: any[] = [];
    return apiCache.deduplicateRequest('getSystemLock', params, () => super.getSystemLock());
  }

  // システムロック設定（キャッシュクリア）
  static async setSystemLock(shouldLock: boolean, password?: string) {
    const response = await super.setSystemLock(shouldLock, password);
    // システムロック変更時はキャッシュをクリア
    apiCache.clearFunctionCache('getSystemLock');
    return response;
  }

  // 座席予約（キャッシュクリア）
  static async reserveSeats(group: string, day: string | number, timeslot: string | number, selectedSeats: any[]) {
    const response = await super.reserveSeats(group, day, timeslot, selectedSeats);
    // 座席データ変更時はキャッシュをクリア
    apiCache.clearFunctionCache('getSeatData');
    apiCache.clearFunctionCache('getSeatDataMinimal');
    return response;
  }

  // チェックイン（キャッシュクリア）
  static async checkInSeat(group: string, day: string | number, timeslot: string | number, seatId: string) {
    const response = await super.checkInSeat(group, day, timeslot, seatId);
    apiCache.clearFunctionCache('getSeatData');
    apiCache.clearFunctionCache('getSeatDataMinimal');
    return response;
  }

  // 複数座席チェックイン（キャッシュクリア）
  static async checkInMultipleSeats(group: string, day: string | number, timeslot: string | number, seatIds: string[]) {
    const response = await super.checkInMultipleSeats(group, day, timeslot, seatIds);
    apiCache.clearFunctionCache('getSeatData');
    apiCache.clearFunctionCache('getSeatDataMinimal');
    return response;
  }

  // 当日券割り当て（キャッシュクリア）
  static async assignWalkInSeat(group: string, day: string | number, timeslot: string | number) {
    const response = await super.assignWalkInSeat(group, day, timeslot);
    apiCache.clearFunctionCache('getSeatData');
    apiCache.clearFunctionCache('getSeatDataMinimal');
    return response;
  }

  // 複数当日券割り当て（キャッシュクリア）
  static async assignWalkInSeats(group: string, day: string | number, timeslot: string | number, count: number) {
    const response = await super.assignWalkInSeats(group, day, timeslot, count);
    apiCache.clearFunctionCache('getSeatData');
    apiCache.clearFunctionCache('getSeatDataMinimal');
    return response;
  }

  // 連続座席当日券割り当て（キャッシュクリア）
  static async assignWalkInConsecutiveSeats(group: string, day: string | number, timeslot: string | number, count: number) {
    const response = await super.assignWalkInConsecutiveSeats(group, day, timeslot, count);
    apiCache.clearFunctionCache('getSeatData');
    apiCache.clearFunctionCache('getSeatDataMinimal');
    return response;
  }

  // 座席データ更新（キャッシュクリア）
  static async updateSeatData(group: string, day: string | number, timeslot: string | number, seatId: string, columnC: any, columnD: any, columnE: any) {
    const response = await super.updateSeatData(group, day, timeslot, seatId, columnC, columnD, columnE);
    apiCache.clearFunctionCache('getSeatData');
    apiCache.clearFunctionCache('getSeatDataMinimal');
    return response;
  }

  // 複数座席一括更新（キャッシュクリア）
  static async updateMultipleSeats(group: string, day: string | number, timeslot: string | number, updates: any[]) {
    const response = await super.updateMultipleSeats(group, day, timeslot, updates);
    apiCache.clearFunctionCache('getSeatData');
    apiCache.clearFunctionCache('getSeatDataMinimal');
    return response;
  }

  // その他のメソッド（キャッシュなし -> 親クラス呼び出し）
  static async testApi() {
    const response = await super.testApi();
    return response && (response as any).data ? (response as any).data : response;
  }

  static async verifyModePassword(mode: string, password?: string) {
    return super.verifyModePassword(mode, password);
  }

  static async testGASConnection() {
    // api.ts の実装（Supabase並行テスト）を使用
    return super.testGASConnection();
  }

  static async debugSpreadsheetStructure(group: string, day: string, timeslot: string) {
    return super.debugSpreadsheetStructure(group, day, timeslot);
  }

  static async broadcastAdminNotice(message: string, details?: any) {
    return super.broadcastAdminNotice(message, details);
  }

  static async fetchAdminNotices(sinceTimestamp?: number) {
    return super.fetchAdminNotices(sinceTimestamp);
  }

  // URL管理システム (Delegation)
  static getUrlManagerInfo() {
    return GasAPI.getUrlManagerInfo();
  }

  static selectRandomUrl() {
    return GasAPI.selectRandomUrl();
  }

  static getAllUrls() {
    return GasAPI.getAllUrls();
  }

  // キャッシュ管理
  static clearCache() {
    apiCache.clearCache();
  }

  static getCacheStats() {
    return apiCache.getCacheStats();
  }
}

export default OptimizedGasAPI;

// グローバルに公開（後方互換性のため）
if (typeof window !== 'undefined') {
  try { (window as any).GasAPI = OptimizedGasAPI; } catch (_) { }
}
