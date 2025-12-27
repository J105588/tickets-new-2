// lib/config.ts

// GAS API URLs
export const GAS_API_URLS: string[] = [
    process.env.NEXT_PUBLIC_GAS_API_URL || "https://script.google.com/macros/s/AKfycbw5JFjDhOa1MXXxVHbiz7FMnEboKkOoHJO5OSbtgWo4Yrr_Sx9fTkXO3J9VRVImtUlM/exec"
];

// Supabase Config
export const SUPABASE_CONFIG = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dsmnqpcizmudfkfitrfg.supabase.co",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbW5xcGNpem11ZGZrZml0cmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODc3OTksImV4cCI6MjA3NDU2Mzc5OX0.0BBCmyV_IrZBch-hvPgW5HuG6-zgE7T1Hdvl7a-aB7g"
};

export const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || true;

export const FEATURE_FLAGS = {
    apiRetryEnabled: false,
    swSelfHealDefault: false,
    adminNoticesEnabled: false
};

// Log settings
export const LOG_SPREADSHEET_ID = '1ZGQ5BTNW_pTDuMvbZgla2B_soisdvtCM2UrnVi_L-5c';
export const LOG_SHEET_NAME = 'OPERATION_LOGS';

// API Url Manager Logic (Ported)
class APIUrlManager {
    private urls: string[];
    private currentIndex: number;
    private lastRotationTime: number;
    private rotationInterval: number;

    constructor() {
        this.urls = [...GAS_API_URLS];
        this.currentIndex = 0;
        this.lastRotationTime = Date.now();
        this.rotationInterval = 5 * 60 * 1000;
        if (typeof window !== 'undefined') {
            this.initializeRandomSelection();
        }
    }

    initializeRandomSelection() {
        if (this.urls.length > 1) {
            this.currentIndex = Math.floor(Math.random() * this.urls.length);
        }
    }

    getCurrentUrl() {
        this.checkAndRotate();
        return this.urls[this.currentIndex];
    }

    checkAndRotate() {
        const now = Date.now();
        if (now - this.lastRotationTime >= this.rotationInterval && this.urls.length > 1) {
            this.rotateUrl();
        }
    }

    rotateUrl() {
        this.currentIndex = (this.currentIndex + 1) % this.urls.length;
        this.lastRotationTime = Date.now();
    }

    getAllUrls() {
        return [...this.urls];
    }

    getCurrentUrlInfo() {
        return {
            index: this.currentIndex + 1,
            total: this.urls.length,
            url: this.urls[this.currentIndex],
            lastRotation: new Date(this.lastRotationTime).toLocaleString()
        };
    }
}

export const apiUrlManager = new APIUrlManager();
