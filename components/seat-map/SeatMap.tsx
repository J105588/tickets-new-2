"use client";
import React, { useMemo } from 'react';
import { useSeatData } from '@/lib/hooks/use-seat-data';

interface SeatMapProps {
    group: string;
    day: number;
    timeslot: string;
    onSeatSelect: (seatId: string) => void;
    selectedSeats: string[];
}

export function SeatMap({ group, day, timeslot, onSeatSelect, selectedSeats }: SeatMapProps) {
    const { seats, isLoading, isError } = useSeatData(group, day, timeslot);

    const { rows, maxCol } = useMemo(() => {
        if (!seats || !Array.isArray(seats)) return { rows: [], maxCol: 0 };

        // Dynamic grid calculation
        const rowsMap = new Map<string, any[]>();
        let maxC = 0;

        seats.forEach(seat => {
            // Assume seat_id like 'A-1' or row_letter/seat_number columns exist
            // Fallback to parsing seat_id if struct columns missing
            let r = seat.row_letter;
            let n = seat.seat_number;

            if (!r || !n) {
                const parts = seat.seat_id.split('-');
                if (parts.length === 2) {
                    r = parts[0];
                    n = parseInt(parts[1]);
                }
            }

            if (r && n) {
                if (!rowsMap.has(r)) rowsMap.set(r, []);
                rowsMap.get(r)?.push({ ...seat, r, n });
                if (n > maxC) maxC = n;
            }
        });

        // Sort rows (A, B, C...) and cols (1, 2, 3...)
        const sortedRows = Array.from(rowsMap.keys()).sort();
        const grid = sortedRows.map(rowLetter => {
            const rowSeats = rowsMap.get(rowLetter)?.sort((a, b) => a.n - b.n);
            return { letter: rowLetter, seats: rowSeats };
        });

        return { rows: grid, maxCol: maxC };

    }, [seats]);

    if (isLoading) return <div className="p-10 text-center animate-pulse">Loading seats...</div>;
    if (isError) return <div className="p-10 text-center text-red-500">Failed to load seat data.</div>;

    return (
        <div className="w-full overflow-auto p-4 bg-gray-50 rounded-lg shadow-inner">
            <div className="flex flex-col gap-2 min-w-[600px]">
                <div className="bg-gray-800 text-white text-center py-2 mb-4 rounded shadow">
                    STAGE
                </div>
                {rows.map(row => (
                    <div key={row.letter} className="flex items-center justify-center gap-2">
                        <div className="w-8 font-bold text-gray-500">{row.letter}</div>
                        <div className="flex gap-2">
                            {/* Render seats with gaps handled? 
                               For simple dynamic, we just list them. 
                               For visual map, we might need placeholders for missing numbers. */}
                            {row.seats?.map(seat => {
                                const isSelected = selectedSeats.includes(seat.seat_id);
                                const isReserved = seat.status === 'reserved' || seat.status === 'checked_in';

                                return (
                                    <button
                                        key={seat.seat_id}
                                        onClick={() => !isReserved && onSeatSelect(seat.seat_id)}
                                        disabled={isReserved}
                                        className={`
                                           w-10 h-10 rounded-md flex items-center justify-center text-sm font-semibold transition-all
                                           ${isReserved
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : isSelected
                                                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                                                    : 'bg-white border border-gray-300 hover:border-blue-400 hover:shadow-md'
                                            }
                                       `}
                                    >
                                        {seat.n}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="w-8 font-bold text-gray-500">{row.letter}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
