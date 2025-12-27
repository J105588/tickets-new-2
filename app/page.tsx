import { ReservationFlow } from "@/components/reservation/ReservationFlow";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-[family-name:var(--font-geist-sans)]">
      <header className="max-w-5xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">國枝記念国際ホール 座席管理</h1>
          <p className="text-gray-500 mt-1">オンライン予約・空席確認システム</p>
        </div>
        <div className="text-sm text-gray-400">v17.0.0 (Next.js)</div>
      </header>

      <main className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-6 md:p-10 min-h-[600px] flex flex-col">
        <ReservationFlow />
      </main>

      <footer className="max-w-5xl mx-auto mt-12 text-center text-gray-400 text-xs">
        &copy; 2024 座席管理システム
      </footer>
    </div>
  );
}
