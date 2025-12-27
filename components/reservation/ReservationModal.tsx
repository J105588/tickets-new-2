"use client";
import React, { useState } from 'react';
import { GasAPI } from '@/lib/api/gas-api';
import { motion } from 'framer-motion';

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: string;
    day: number;
    timeslot: string;
    selectedSeats: string[];
    onSuccess: () => void;
}

export function ReservationModal({ isOpen, onClose, group, day, timeslot, selectedSeats, onSuccess }: ReservationModalProps) {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // Use GasAPI (which falls back or uses Supabase wrapper if configured, but here we use GasAPI wrapper logic)
            // Wait, GasAPI wrapper in lib/api/gas-api.js calls GAS.
            // SupabaseAPI wrapper in lib/api/supabase-api.js calls Supabase.
            // We should use a unified API or decide.
            // Legacy api.ts `reserveSeats` checked `useSupabase`.
            // Ideally we stick to one. For DB-Driven, Supabase is primary.
            // But `GasAPI` class in `lib/api/gas-api.ts` is strictly client-side GAS call.
            // I should import `SupabaseAPI` if available.

            // Let's assume we use SupabaseAPI for now as primary.
            // But I haven't exported a unified `reserveSeats` yet.
            // I'll use GasAPI here for simplicity if the backend is GAS-centric, OR SupabaseAPI.
            // The task said "DB-driven".
            // I'll call GasAPI.reserveSeats for now (which is what I ported to gas-api.ts? No, I only ported getSeatData).
            // I need to add reserveSeats to GasAPI or SupabaseAPI.
            // I'll add `reserveSeats` to `GasAPI` in a previous step? No, I added getSystemLock.
            // I'll add `reserveSeats` to `GasAPI` now or use `SupabaseAPI`.
            // Actually I should update `GasAPI` to have `reserveSeats`.

            // Temporary: Use a direct call or fix GasAPI.
            // I'll fix GasAPI in the implementation plan or right now.
            // I'll assume GasAPI has it (I'll add it).

            const fromSupabase = await import('@/lib/api/supabase-api').then(m => m.SupabaseAPI);
            const result = await fromSupabase.reserveSeats(group, day, timeslot, selectedSeats, name); // Need to implement this too

            if (result.success) {
                onSuccess();
                onClose();
            } else {
                setError(result.error || '予約に失敗しました');
            }

        } catch (e: any) {
            setError(e.message || 'エラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="text-xl font-bold">予約内容の確認</h3>
                    <button onClick={onClose} className="text-blue-100 hover:text-white text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                        <div className="flex justify-between">
                            <span>公演:</span>
                            <span className="font-bold">{group}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>日時:</span>
                            <span className="font-bold">{day}日目 {timeslot}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="shrink-0">座席:</span>
                            <span className="font-bold text-right text-blue-600">{selectedSeats.join(', ')} ({selectedSeats.length}席)</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">お名前(予約者名)</label>
                        <input
                            type="text"
                            required
                            placeholder="例: 山田 太郎"
                            className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded">{error}</div>}

                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 py-3 text-white font-bold rounded-lg shadow transition-all ${isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isSubmitting ? '処理中...' : '予約確定'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
