// lib/hooks/use-performances.ts
import useSWR from 'swr';
import { supabase } from '@/lib/api/supabase-client';
import { Performance } from '@/lib/types';

const fetcher = async () => {
    const { data, error } = await supabase
        .from('performances')
        .select('*')
        .order('day')
        .order('timeslot');

    if (error) throw error;
    return data as Performance[];
};

export function usePerformances() {
    const { data, error, isLoading } = useSWR('performances', fetcher);

    // Derived state to replace hardcoded configs
    const groups = Array.from(new Set(data?.map(p => p.group_name) || []));

    return {
        performances: data || [],
        groups,
        isLoading,
        isError: error
    };
}

export function usePerformanceDates(group: string | null) {
    const { performances } = usePerformances();
    if (!group) return [];

    // Filter by group and extract unique dates
    const filtered = performances.filter(p => p.group_name === group);
    const dates = Array.from(new Set(filtered.map(p => p.day))).sort((a, b) => a - b);
    return dates;
}

export function usePerformanceTimeslots(group: string | null, day: number | null) {
    const { performances } = usePerformances();
    if (!group || !day) return [];

    return performances
        .filter(p => p.group_name === group && p.day === day)
        .map(p => p.timeslot)
        .sort();
}
