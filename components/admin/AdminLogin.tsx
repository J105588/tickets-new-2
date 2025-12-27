"use client";
import React, { useState } from 'react';
import { GasAPI } from '@/lib/api/gas-api';
import { Lock } from 'lucide-react';

interface AdminLoginProps {
    onLogin: () => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Verify 'admin' or 'super_admin'
            // Legacy uses verifyModePassword('admin', pwd)
            const result = await GasAPI.verifyModePassword('admin', password);
            if (result && result.success) {
                onLogin();
            } else {
                setError('パスワードが違います');
            }
        } catch (e) {
            setError('エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full border">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-gray-100 rounded-full">
                        <Lock className="w-8 h-8 text-gray-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center mb-6">管理者ログイン</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            placeholder="管理者パスワード"
                            className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition"
                    >
                        {isLoading ? '確認中...' : 'ログイン'}
                    </button>
                </form>
            </div>
        </div>
    );
}
