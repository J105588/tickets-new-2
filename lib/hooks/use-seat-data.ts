// lib/hooks/use-seat-data.ts
import useSWR from 'swr';
import { SupabaseAPI } from '@/lib/api/supabase-api';

const seatFetcher = async ([key, group, day, timeslot, isAdmin]: [string, string, number, string, boolean]) => {
    if (!group || !day || !timeslot) return null;
    const result = await SupabaseAPI.getSeatData(group, day, timeslot, isAdmin);
    if (!result.success) throw new Error(result.error);
    return result.data;
};

export function useSeatData(group: string, day: number, timeslot: string, isAdmin = false) {
    const { data, error, isLoading, mutate } = useSWR(
        ['seatData', group, day, timeslot, isAdmin],
        seatFetcher,
        {
            refreshInterval: 10000, // Real-time poll every 10s (or use Postgres subscription later)
            fallbackData: []
        }
    );

    return {
        seats: data,
        isLoading,
        isError: error,
        refresh: mutate
    };
}
