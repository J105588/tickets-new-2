"use client";
import React, { useState, useEffect } from "react";
import { useSystemLock } from "@/lib/hooks/use-system-lock";
import { Lock } from "lucide-react";
import { GasAPI } from "@/lib/api/gas-api";

export function SystemLock() {
    const { isLocked, lockMessage } = useSystemLock();
    const [isAdminBypass, setIsAdminBypass] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    if (!isLocked || isAdminBypass) return null;

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await GasAPI.verifyModePassword('system_lock', password);
            if (result && result.success) {
                setIsAdminBypass(true);
            } else {
                setError("パスワードが違います");
            }
        } catch (e) {
            setError("エラーが発生しました");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 bg-opacity-95 text-white p-4">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center border border-gray-700">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-500/10 rounded-full">
                        <Lock className="w-12 h-12 text-red-500" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold mb-4">システム一時停止中</h2>
                <p className="text-gray-300 mb-8 leading-relaxed">
                    {lockMessage || "現在メンテナンス中または受付時間外のため、システムを停止しています。"}
                </p>

                <form onSubmit={handleUnlock} className="flex flex-col gap-3">
                    <input
                        type="password"
                        placeholder="管理者パスワード"
                        className="px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 focus:outline-none text-white text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="submit" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                        管理者ロック解除
                    </button>
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                </form>
            </div>
        </div>
    );
}
