// lib/hooks/use-system-lock.ts
import useSWR from 'swr';
import { GasAPI } from '@/lib/api/gas-api';

const fetcher = async () => {
    // System lock is handled by GAS/Legacy logic
    const result = await GasAPI.getSystemLock(); // { success: true, data: { isLocked: boolean, message: string } }
    if (!result.success) throw new Error(result.error);
    return result.data; // { isLocked, message }
};

export function useSystemLock() {
    const { data, error, isLoading } = useSWR('systemLock', fetcher, {
        refreshInterval: 30000,
    });

    return {
        isLocked: data?.isLocked || false,
        lockMessage: data?.message || '',
        isLoading,
        isError: error
    };
}
