export interface Seat {
    seat_id: string;
    status: string;
    reserved_by?: string;
    checked_in_at?: string;
    row_letter?: string;
    seat_number?: string | number;
    updated_at?: string;
    walkin_at?: string;
    reserved_at?: string;
    [key: string]: any;
}

export interface Performance {
    id: number;
    group_name: string;
    day: number;
    timeslot: string;
    [key: string]: any;
}

export interface ApiResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    errorType?: string;
    offline?: boolean;
    timeout?: boolean;
    details?: any;
    exception?: boolean;
}

export interface GeneproInfo {
    isActive: boolean;
    group: string;
    referenceTimeslot: string;
}

export interface AuditEntry {
    ts: number;
    type: string;
    action: string;
    meta: any;
    sessionId: string;
    userId: string;
    ua: string;
    ip: string;
}
