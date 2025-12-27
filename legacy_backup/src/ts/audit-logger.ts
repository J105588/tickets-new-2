// audit-logger.ts - クライアント監査ログ（軽量・低オーバーヘッド）

import { DEBUG_MODE } from './config';

interface AuditEntry {
  ts: number;
  type: string;
  action: string;
  meta: any;
  sessionId: string;
  userId: string;
  ua: string;
  ip: string;
}

interface BoundHandler {
  target: EventTarget;
  type: string;
  handler: EventListenerOrEventListenerObject;
  opts: boolean | AddEventListenerOptions;
}

class AuditLogger {
  private queue: AuditEntry[];
  private flushIntervalMs: number;
  private maxBatchSize: number;
  private maxQueueSize: number;
  private sessionId: string;
  private timer: any;
  private started: boolean;
  private boundHandlers: BoundHandler[];

  constructor() {
    this.queue = [];
    this.flushIntervalMs = 5000;
    this.maxBatchSize = 10;
    this.maxQueueSize = 1000;
    this.sessionId = this._ensureSessionId();
    this.timer = null;
    this.started = false;
    this.boundHandlers = [];
  }

  start() {
    if (this.started) return;
    this.started = true;
    try { this._restoreQueue(); } catch (_) { }
    this._installGlobalEventCapture();
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.started = false;
    this.boundHandlers.forEach(({ target, type, handler, opts }) => {
      try { target.removeEventListener(type, handler, opts); } catch (_) { }
    });
    this.boundHandlers = [];
  }

  log(eventType: string, action: string, meta: any = {}) {
    try {
      const entry: AuditEntry = {
        ts: Date.now(),
        type: eventType,
        action,
        meta: this._sanitizeMeta(meta),
        sessionId: this.sessionId,
        userId: meta && meta.userId ? meta.userId : '',
        ua: typeof navigator !== 'undefined' && navigator ? navigator.userAgent : 'Unknown',
        ip: '' // サーバーで補完不可のため空。必要ならリバースプロキシで付与
      };
      this.queue.push(entry);
      if (this.queue.length > this.maxQueueSize) {
        this.queue.splice(0, this.queue.length - this.maxQueueSize);
      }
      this._persistQueue();
      if (this.queue.length >= this.maxBatchSize) {
        // 即時フラッシュ（非同期）
        Promise.resolve().then(() => this.flush());
      }
    } catch (_) { }
  }

  async flush() {
    if (!this.queue.length) return;
    // オフライン時はスキップ
    try { if (typeof navigator !== 'undefined' && navigator.onLine === false) return; } catch (_) { }

    const batch = this.queue.splice(0, Math.min(this.maxBatchSize, this.queue.length));
    if (!batch.length) return;
    this._persistQueue();
    try {
      let ok = await this._postBatch(batch);
      if (!ok) {
        ok = await this._jsonpBatch(batch);
      }
      if (!ok) {
        this.queue = batch.concat(this.queue);
        this._persistQueue();
      }
    } catch (_) {
      this.queue = batch.concat(this.queue);
      this._persistQueue();
    }
  }

  wrapApiCall(functionName: string, params: any[], result: any) {
    // すべてのAPI呼び出しを記録
    this.log('api', functionName, {
      params,
      success: !!(result && result.success !== false),
      error: result && result.success === false ? (result.error || '') : ''
    });
  }

  _installGlobalEventCapture() {
    const add = (target: EventTarget, type: string, handler: EventListenerOrEventListenerObject, opts: boolean | AddEventListenerOptions) => {
      target.addEventListener(type, handler, opts);
      this.boundHandlers.push({ target, type, handler, opts });
    };

    // クリック
    add(document, 'click', (e: Event) => {
      try {
        const t = e.target as HTMLElement;
        const info = this._elementInfo(t);
        this.log('ui', 'click', info);
      } catch (_) { }
    }, true);

    // 変更
    add(document, 'change', (e: Event) => {
      try {
        const t = e.target as HTMLElement;
        const info = this._elementInfo(t);
        this.log('ui', 'change', info);
      } catch (_) { }
    }, true);

    // ナビゲーション
    add(window, 'popstate', () => this.log('nav', 'popstate', { url: location.href }), false);
    add(window, 'hashchange', () => this.log('nav', 'hashchange', { url: location.href }), false);
    this.log('nav', 'load', { url: location.href });

    // エラー
    add(window, 'error', (e: ErrorEvent) => {
      try {
        this.log('error', 'window_error', { message: e && e.message, source: e && e.filename, lineno: e && e.lineno });
      } catch (_) { }
    }, true);
    add(window, 'unhandledrejection', (e: PromiseRejectionEvent) => {
      try {
        this.log('error', 'unhandledrejection', { reason: (e && e.reason && (e.reason.message || e.reason)) || '' });
      } catch (_) { }
    }, true);
  }

  _elementInfo(node: HTMLElement) {
    if (!node) return {};
    const tag = node.tagName || '';
    const id = node.id || '';
    const cls = node.className && typeof node.className === 'string' ? node.className : '';
    const name = (node as any).name || '';
    const role = node.getAttribute ? (node.getAttribute('role') || '') : '';
    const text = (node.innerText || node.textContent || '').trim().slice(0, 60);
    return { tag, id, cls, name, role, text };
  }

  _ensureSessionId() {
    try {
      const key = 'audit.sessionId';
      let id = localStorage.getItem(key);
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(key, id);
      }
      return id;
    } catch (_) {
      return 'nosession';
    }
  }

  _persistQueue() {
    try {
      localStorage.setItem('audit.queue', JSON.stringify(this.queue));
    } catch (_) { }
  }

  _restoreQueue() {
    try {
      const raw = localStorage.getItem('audit.queue');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) this.queue = arr;
      }
    } catch (_) { }
  }

  async _postBatch(entries: AuditEntry[]) {
    try {
      // 循環参照回避のため window.GasAPI を使用
      const gasApi = (window as any).GasAPI;
      const info = (typeof window !== 'undefined' && gasApi && gasApi.getUrlManagerInfo)
        ? gasApi.getUrlManagerInfo()
        : null;
      const url = (info && info.url) ? info.url : null;
      if (!url) return false;

      // doPost は callback 付きの JSONP を返す実装なので、callback を付けておく
      const callback = 'cb_' + Date.now();
      const body = new URLSearchParams();
      body.set('func', 'recordClientAudit');
      body.set('params', JSON.stringify([entries]));
      body.set('callback', callback);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: body.toString(),
        credentials: 'omit'
      });
      // ステータスのみ確認（本文は JSONP 文字列）
      return resp && resp.ok;
    } catch (e) {
      return false;
    }
  }

  async _jsonpBatch(entries: AuditEntry[]) {
    try {
      // 循環参照回避のため window.GasAPI を使用
      const gasApi = (window as any).GasAPI;
      if (!gasApi || !gasApi._callApi) return false;

      // URL長対策: さらに小さく分割
      const chunk = entries.slice(0, Math.min(5, entries.length));
      const res = await gasApi._callApi('recordClientAudit', [chunk]);
      return !!(res && res.success);
    } catch (_) {
      return false;
    }
  }

  _sanitizeMeta(meta: any) {
    try {
      const plain: any = {};
      const allow = ['params', 'success', 'error', 'url', 'tag', 'id', 'cls', 'name', 'role', 'text'];
      for (const k of allow) {
        if (meta && meta[k] !== undefined) {
          let v = meta[k];
          if (typeof v === 'string') {
            v = v.length > 120 ? v.slice(0, 120) : v;
          }
          if (Array.isArray(v)) {
            v = v.slice(0, 5);
          }
          if (typeof v === 'object' && v !== null) {
            v = JSON.parse(JSON.stringify(v));
          }
          plain[k] = v;
        }
      }
      return plain;
    } catch (_) {
      return {};
    }
  }
}

const auditLogger = new AuditLogger();
auditLogger.start();

// グローバル公開
if (typeof window !== 'undefined') {
  (window as any).AuditLogger = auditLogger;
}

export default auditLogger;
