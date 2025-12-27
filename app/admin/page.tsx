"use client";
import React, { useState } from 'react';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-100 p-4">
                <AdminLogin onLogin={() => setIsAuthenticated(true)} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center text-gray-800">
                <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
                <button onClick={() => setIsAuthenticated(false)} className="text-sm text-red-500 hover:underline">ログアウト</button>
            </header>
            <main className="max-w-6xl mx-auto">
                <AdminDashboard />
            </main>
        </div>
    );
}
