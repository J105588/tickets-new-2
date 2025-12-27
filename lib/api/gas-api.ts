// lib/api/gas-api.ts
import { GAS_API_URLS, apiUrlManager, DEBUG_MODE } from '@/lib/config';
import { ApiResult } from '@/lib/types';

export class GasAPI {
    static async _callApi(functionName: string, params: any[] = [], options: any = {}): Promise<ApiResult> {
        const callbackName = 'jsonpCallback_' + functionName + '_' + Date.now();
        const encodedParams = encodeURIComponent(JSON.stringify(params));
        const encodedFuncName = encodeURIComponent(functionName);

        // Server-side check
        if (typeof window === 'undefined') {
            return { success: false, error: 'GAS API is client-side only' };
        }

        return new Promise((resolve) => {
            try {
                (window as any)[callbackName] = (data: any) => {
                    delete (window as any)[callbackName];
                    if (data && typeof data === 'object') {
                        resolve(data);
                    } else {
                        resolve({ success: false, error: 'Invalid API response', data });
                    }
                };

                const currentUrl = apiUrlManager.getCurrentUrl();
                const cacheBuster = `_=${Date.now()}`;
                const fullUrl = `${currentUrl}?callback=${callbackName}&func=${encodedFuncName}&params=${encodedParams}&${cacheBuster}`;

                const script = document.createElement('script');
                script.src = fullUrl;
                script.onerror = () => {
                    delete (window as any)[callbackName];
                    resolve({ success: false, error: 'JSONP request failed' });
                };
                document.head.appendChild(script);

                // Cleanup script tag after load? usually good practice but JSONP is fire and forget mostly
                script.onload = () => {
                    script.remove();
                };
            } catch (e: any) {
                resolve({ success: false, error: e.message });
            }
        });
    }

    static async getSeatData(group: string, day: string | number, timeslot: string | number, isAdmin: boolean) {
        return this._callApi('getSeatData', [group, day, timeslot, isAdmin]);
    }

    static async getSystemLock() {
        return this._callApi('getSystemLock', []);
    }

    static async verifyModePassword(mode: string, password?: string) {
        return this._callApi('verifyModePassword', [mode, password]);
    }

    static async reserveSeats(group: string, day: string | number, timeslot: string | number, selectedSeats: string[], reservedBy: string) {
        return this._callApi('reserveSeats', [group, day, timeslot, selectedSeats, reservedBy]);
    }

    static async checkInSeat(group: string, day: string | number, timeslot: string | number, seatId: string) {
        return this._callApi('checkInSeat', [group, day, timeslot, seatId]);
    }

    static async updateSeatStatus(performanceId: number, seatId: string, status: string, additionalData: any = {}) {
        // Warning: Legacy GasAPI updateSeatStatus signature was (group, day, timeslot, seatId, colC, colD, colE).
        // SupabaseAPI uses (performanceId, seatId, status, data).
        // We need to support strict legacy signature OR adapt.
        // For GAS client, we likely call `updateSeatData`.
        // Let's stick to legacy signature adaptation if possible, or new one.
        // Legacy: updateSeatData(group, day, timeslot, seatId, columnC, columnD, columnE)
        // We can't easily map internal ID to legacy params without group/day/timeslot.
        // So Admin Dashboard should use group/day/timeslot mainly.
        return { success: false, error: "Use updateSeatDataLegacy for GAS" };
    }

    static async updateSeatDataLegacy(group: string, day: string | number, timeslot: string | number, seatId: string, columnC: any, columnD: any, columnE: any) {
        return this._callApi('updateSeatData', [group, day, timeslot, seatId, columnC, columnD, columnE]);
    }

    static async updateMultipleSeats(group: string, day: string | number, timeslot: string | number, updates: any[]) {
        return this._callApi('updateMultipleSeats', [group, day, timeslot, updates]);
    }

    // Add other methods as needed, mirroring legacy
}
