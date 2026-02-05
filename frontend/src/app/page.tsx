"use client";

import Link from "next/link";
import { BarChart3, Bot, LayoutDashboard, LineChart, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xl font-semibold text-emerald-400">Zenithai</span>
          <nav className="flex gap-6">
            <Link href="/giris" className="text-zinc-400 hover:text-white transition">
              Giriş
            </Link>
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition">
              Kontrol Paneli
            </Link>
            <Link href="/markets" className="text-zinc-400 hover:text-white transition">
              Piyasalar
            </Link>
            <Link href="/strategies" className="text-zinc-400 hover:text-white transition">
              Stratejiler
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold text-white mb-3">
            Zenithai
          </h1>
          <p className="text-zinc-400 mb-10">
            Kripto, forex, altın ve BIST için canlı grafik, otomatik işlem ve makine öğrenmesi destekli analiz platformu.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-white hover:bg-emerald-500 transition"
            >
              <LayoutDashboard className="w-4 h-4" />
              Kontrol Paneli
            </Link>
            <Link
              href="/markets"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 px-5 py-2.5 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50 transition"
            >
              <LineChart className="w-4 h-4" />
              Piyasalar
            </Link>
            <Link
              href="/strategies"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 px-5 py-2.5 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50 transition"
            >
              <Bot className="w-4 h-4" />
              Stratejiler
            </Link>
            <Link
              href="/emirler"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 px-5 py-2.5 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50 transition"
            >
              <BarChart3 className="w-4 h-4" />
              Emirler
            </Link>
            <Link
              href="/backtest"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 px-5 py-2.5 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50 transition"
            >
              <BarChart3 className="w-4 h-4" />
              Backtest
            </Link>
            <Link
              href="/ml"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 px-5 py-2.5 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50 transition"
            >
              <Bot className="w-4 h-4" />
              ML Modeller
            </Link>
            <Link
              href="/risk"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 px-5 py-2.5 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50 transition"
            >
              <Shield className="w-4 h-4" />
              Risk
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
