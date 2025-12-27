"use client";
import React, { useState } from 'react';
import { usePerformances, usePerformanceDates, usePerformanceTimeslots } from '@/lib/hooks/use-performances';
import { motion, AnimatePresence } from 'framer-motion';
import { SeatMap } from '@/components/seat-map/SeatMap';
import { ReservationModal } from './ReservationModal';

export function ReservationFlow() {
    const { groups, isLoading } = usePerformances();

    // Selection State
    const [group, setGroup] = useState<string | null>(null);
    const [day, setDay] = useState<number | null>(null);
    const [timeslot, setTimeslot] = useState<string | null>(null);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Dependent Options
    const dates = usePerformanceDates(group);
    const timeslots = usePerformanceTimeslots(group, day);

    // Helpers
    const reset = () => { setGroup(null); setDay(null); setTimeslot(null); setSelectedSeats([]); };
    const handleSeatSelect = (id: string) => {
        setSelectedSeats(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    if (isLoading) return <div className="p-8 text-center">Loading Schedules...</div>;

    // Step 1: Group Selection
    if (!group) {
        if (groups.length === 1) {
            setGroup(groups[0]); // Auto-select if only 1
            return null; // Re-render
        }
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-center">公演グループを選択</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {groups.map(g => (
                        <button key={g} onClick={() => setGroup(g)}
                            className="p-6 bg-white rounded-xl shadow hover:shadow-lg border hover:border-blue-500 transition-all text-lg font-semibold">
                            {g}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Step 2: Date & Time Selection (Combined for UX?) or Sequential
    if (!day || !timeslot) {
        return (
            <div className="space-y-6">
                <button onClick={reset} className="text-sm text-gray-500 hover:text-blue-500">← 戻る</button>
                <h2 className="text-2xl font-bold text-center">日時を選択</h2>

                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700">日程</h3>
                    <div className="flex flex-wrap gap-3">
                        {dates.map(d => (
                            <button key={d}
                                onClick={() => { setDay(d); setTimeslot(null); }}
                                className={`px-6 py-3 rounded-lg border transition-all ${day === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:border-blue-400'}`}>
                                {d}日目
                            </button>
                        ))}
                    </div>
                </div>

                {day && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <h3 className="font-semibold text-gray-700">時間帯</h3>
                        <div className="flex flex-wrap gap-3">
                            {timeslots.map(ts => (
                                <button key={ts}
                                    onClick={() => setTimeslot(ts)}
                                    className="px-6 py-3 rounded-lg border bg-white hover:border-blue-400 shadow-sm transition-all hover:shadow-md">
                                    {ts}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        );
    }

    // Step 3: Seat Selection
    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <button onClick={() => setTimeslot(null)} className="text-sm text-gray-500 hover:text-blue-500">← 日時変更</button>
                <div className="text-center">
                    <span className="font-bold text-lg">{group}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span>{day}日目 {timeslot}</span>
                </div>
                <div className="w-20"></div> {/* Spacer */}
            </div>

            <div className="flex-1 min-h-0 border rounded-xl overflow-hidden bg-gray-50 relative">
                <SeatMap
                    group={group}
                    day={day}
                    timeslot={timeslot}
                    selectedSeats={selectedSeats}
                    onSeatSelect={handleSeatSelect}
                />
            </div>

            <div className="p-4 bg-white border-t rounded-xl shadow-lg flex justify-between items-center">
                <div>
                    <span className="text-gray-500 text-sm">選択中の座席:</span>
                    <div className="font-bold text-lg">
                        {selectedSeats.length > 0 ? selectedSeats.join(', ') : '未選択'}
                    </div>
                </div>
                <button
                    disabled={selectedSeats.length === 0}
                    onClick={() => setIsModalOpen(true)}
                    className={`px-8 py-3 rounded-lg font-bold text-white transition-all transform hover:scale-105 active:scale-95
                        ${selectedSeats.length > 0 ? 'bg-blue-600 shadow-blue-500/30 shadow-lg cursor-pointer' : 'bg-gray-300 cursor-not-allowed'}
                    `}
                >
                    予約へ進む
                </button>
            </div>

            <ReservationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                group={group!}
                day={day!}
                timeslot={timeslot!}
                selectedSeats={selectedSeats}
                onSuccess={() => {
                    alert('予約が完了しました！');
                    reset();
                }}
            />
        </div>
    );
}
