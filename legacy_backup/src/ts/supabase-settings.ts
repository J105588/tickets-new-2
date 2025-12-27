// supabase-settings.ts
// Supabase静的設定ファイル

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface SupabaseSettings {
  production: SupabaseConfig;
  development: SupabaseConfig;
  test: SupabaseConfig;
  [key: string]: SupabaseConfig;
}

// Supabase設定（本番環境用）
export const SUPABASE_SETTINGS: SupabaseSettings = {
  // 本番環境の設定
  production: {
    url: 'https://dsmnqpcizmudfkfitrfg.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbW5xcGNpem11ZGZrZml0cmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODc3OTksImV4cCI6MjA3NDU2Mzc5OX0.0BBCmyV_IrZBch-hvPgW5HuG6-zgE7T1Hdvl7a-aB7g'
  },

  // 開発環境の設定
  development: {
    url: 'https://dsmnqpcizmudfkfitrfg.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbW5xcGNpem11ZGZrZml0cmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODc3OTksImV4cCI6MjA3NDU2Mzc5OX0.0BBCmyV_IrZBch-hvPgW5HuG6-zgE7T1Hdvl7a-aB7g'
  },

  // テスト環境の設定
  test: {
    url: 'https://dsmnqpcizmudfkfitrfg.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbW5xcGNpem11ZGZrZml0cmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODc3OTksImV4cCI6MjA3NDU2Mzc5OX0.0BBCmyV_IrZBch-hvPgW5HuG6-zgE7T1Hdvl7a-aB7g'
  }
};

// 現在の環境を判定
export function getCurrentEnvironment(): string {
  // ホスト名で環境を判定
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    } else if (hostname.includes('test') || hostname.includes('staging')) {
      return 'test';
    } else {
      return 'production';
    }
  }

  // デフォルトは開発環境
  return 'development';
}

// 現在の環境の設定を取得
export function getCurrentConfig(): SupabaseConfig {
  const environment = getCurrentEnvironment();
  return SUPABASE_SETTINGS[environment] || SUPABASE_SETTINGS.development;
}

// 設定の検証
export function validateConfig(config: SupabaseConfig): boolean {
  const required = ['url', 'anonKey'] as const;
  const missing = required.filter(key => !config[key] || config[key].includes('YOUR_'));

  if (missing.length > 0) {
    console.warn('Supabase設定が不完全です。以下の設定を確認してください:', missing);
    return false;
  }

  return true;
}

// 設定情報の取得
export function getConfigInfo() {
  const config = getCurrentConfig();
  const environment = getCurrentEnvironment();

  return {
    environment: environment,
    url: config.url,
    hasAnonKey: !!config.anonKey && !config.anonKey.includes('YOUR_'),
    isValid: validateConfig(config)
  };
}

// グローバルアクセス用
if (typeof window !== 'undefined') {
  (window as any).SupabaseSettings = {
    getCurrentConfig,
    getCurrentEnvironment,
    validateConfig,
    getConfigInfo,
    SUPABASE_SETTINGS
  };
}

export default getCurrentConfig;

