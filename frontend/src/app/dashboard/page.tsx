"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, Bot, FileText, Brain, Shield, BarChart3 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { fetchAuth, getApiBase } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type Summary = {
  strategies_total: number;
  strategies_active: number;
  positions_count: number;
  orders_count: number;
};

export default function DashboardPage() {
  const { token, yuklendi } = useRequireAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [docsUrl, setDocsUrl] = useState("/api/backend/docs");
  useEffect(() => {
    setDocsUrl(getApiBase() + "/docs");
  }, []);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchAuth("/api/v1/strategies").then((r) => r.json()),
      fetchAuth("/api/v1/orders/positions").then((r) => r.json()),
      fetchAuth("/api/v1/orders/paper?limit=100").then((r) => r.json()),
    ])
      .then(([stratRes, posRes, ordRes]) => {
        const strategies = stratRes.strategies || [];
        setSummary({
          strategies_total: strategies.length,
          strategies_active: strategies.filter((s: { is_active: boolean }) => s.is_active).length,
          positions_count: (posRes.positions || []).length,
          orders_count: (ordRes.orders || []).length,
        });
      })
      .catch(() => setHata("Özet yüklenemedi."));
  }, [token]);

  if (!yuklendi) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Kontrol Paneli" />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Kontrol Paneli</h1>
        {hata && (
          <div className="rounded-lg bg-amber-900/20 border border-amber-700 text-amber-200 px-4 py-3 mb-6">
            {hata} <Link href="/giris" className="underline">Giriş yapın</Link>
          </div>
        )}

        {token && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Bot className="w-4 h-4" />
                <span>Stratejiler</span>
              </div>
              <p className="text-2xl font-semibold text-white">{summary.strategies_active} / {summary.strategies_total} açık</p>
              <Link href="/strategies" className="mt-2 inline-block text-emerald-400 text-sm hover:underline">Stratejiler →</Link>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <BarChart3 className="w-4 h-4" />
                <span>Açık Pozisyon</span>
              </div>
              <p className="text-2xl font-semibold text-white">{summary.positions_count}</p>
              <Link href="/emirler" className="mt-2 inline-block text-emerald-400 text-sm hover:underline">Emirler →</Link>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <FileText className="w-4 h-4" />
                <span>Emir sayısı</span>
              </div>
              <p className="text-2xl font-semibold text-white">{summary.orders_count}</p>
              <Link href="/emirler" className="mt-2 inline-block text-emerald-400 text-sm hover:underline">Emirler →</Link>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Shield className="w-4 h-4" />
                <span>Risk</span>
              </div>
              <p className="text-sm text-zinc-500">Limitleri yönetin</p>
              <Link href="/risk" className="mt-2 inline-block text-emerald-400 text-sm hover:underline">Risk →</Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>Canlı Grafik</span>
            </div>
            <p className="text-sm text-zinc-500">BTC/USDT ve diğer pariteler için grafik.</p>
            <Link href="/markets" className="mt-3 inline-block text-emerald-400 text-sm hover:underline">Piyasalar →</Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">Botlar</div>
            <p className="text-sm text-zinc-500">Strateji oluştur, paper veya canlı çalıştır.</p>
            <Link href="/strategies" className="mt-3 inline-block text-emerald-400 text-sm hover:underline">Stratejiler →</Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Brain className="w-4 h-4" />
              <span>ML & Backtest</span>
            </div>
            <p className="text-sm text-zinc-500">Model eğit, backtest çalıştır.</p>
            <div className="flex gap-3 mt-3">
              <Link href="/ml" className="text-emerald-400 text-sm hover:underline">ML →</Link>
              <Link href="/backtest" className="text-emerald-400 text-sm hover:underline">Backtest →</Link>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="text-lg font-medium text-white mb-4">Hızlı erişim</h2>
          <p className="text-zinc-500 text-sm">
            API: <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Swagger</a>
          </p>
        </div>
      </main>
    </div>
  );
}
