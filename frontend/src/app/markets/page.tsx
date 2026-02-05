"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";

import { getApiBase } from "@/lib/api";

const BORSALAR = [
  { id: "binance", label: "Kripto (Binance)" },
  { id: "twelvedata", label: "Forex / Altın" },
];

export default function MarketsPage() {
  const [exchange, setExchange] = useState("binance");
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${getApiBase()}/api/v1/markets/symbols?exchange=${exchange}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.symbols) setSymbols(data.symbols.slice(0, 50));
      })
      .catch(() => setError("API bağlantısı kurulamadı. Backend çalışıyor mu?"))
      .finally(() => setLoading(false));
  }, [exchange]);

  return (
    <div className="min-h-screen">
      <AppHeader title="Piyasalar" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Piyasalar</h1>
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-white"
          >
            {BORSALAR.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
        </div>
        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 mb-6">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-zinc-500">Yükleniyor...</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {symbols.map((s) => (
              <li key={s}>
                <Link
                  href={`/markets/${encodeURIComponent(s)}?exchange=${exchange}`}
                  className="block rounded-lg border border-zinc-800 px-4 py-2 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/50"
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
