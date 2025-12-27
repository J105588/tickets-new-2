// lib/api/supabase-api.ts
import { supabase } from './supabase-client';
import { GasAPI } from './gas-api';
import { ApiResult } from '@/lib/types';

export class SupabaseAPI {
    static async getSeatData(group: string, day: number, timeslot: string, isAdmin: boolean): Promise<ApiResult> {
        try {
            // DB-Driven: Fetch Performance ID first
            const { data: performances, error: perfError } = await supabase
                .from('performances')
                .select('id')
                .eq('group_name', group)
                .eq('day', day)
                .eq('timeslot', timeslot)
                .single();

            if (perfError || !performances) {
                console.warn('Performance not found in Supabase, falling back to GAS');
                return GasAPI.getSeatData(group, day, timeslot, isAdmin);
            }

            const { data: seats, error: seatError } = await supabase
                .from('seats')
                .select('*')
                .eq('performance_id', performances.id);

            if (seatError) throw seatError;

            // Transform to legacy map format if needed by frontend, or return raw
            // For Next.js, strict typing is better.
            // But to keep compatibility with ported components...
            // Let's return standardized ApiResult
            return { success: true, data: seats, details: { source: 'supabase' } };

        } catch (e: any) {
            console.error('Supabase Error:', e);
            // Fallback
            return GasAPI.getSeatData(group, day, timeslot, isAdmin);
        }
    }

    // Reserve
    static async reserveSeats(group: string, day: number, timeslot: string, selectedSeats: string[], reservedBy: string): Promise<ApiResult> {
        try {
            // Implement Supabase logic or fallback
            // For now, simpler to use GAS fallback since raw Supabase logic is complex (performance_id lookup + insert/update seats)
            // Actually, updateSeatStatus logic in legacy was complex.
            // I will use GasAPI fallback for write operations for now to ensure safety.
            return GasAPI.reserveSeats(group, day, timeslot, selectedSeats, reservedBy);
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
}
