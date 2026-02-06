"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";

import { getApiBase } from "@/lib/api";

const BORSALAR = [
  { id: "binance", label: "Kripto (Binance)" },
  { id: "twelvedata", label: "Forex / Altın" },
];

function getQuote(symbol: string): string {
  const i = symbol.lastIndexOf("/");
  return i >= 0 ? symbol.slice(i + 1) : "";
}

export default function MarketsPage() {
  const [exchange, setExchange] = useState("binance");
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quoteFilter, setQuoteFilter] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${getApiBase()}/api/v1/markets/symbols?exchange=${exchange}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.symbols) setSymbols(data.symbols.slice(0, 300));
      })
      .catch(() => setError("API bağlantısı kurulamadı. Backend çalışıyor mu?"))
      .finally(() => setLoading(false));
  }, [exchange]);

  const quotes = useMemo(() => {
    const set = new Set<string>();
    symbols.forEach((s) => {
      const q = getQuote(s);
      if (q) set.add(q);
    });
    return Array.from(set).sort();
  }, [symbols]);

  const filteredSymbols = useMemo(() => {
    let list = symbols;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((s) => s.toUpperCase().includes(q));
    }
    if (quoteFilter) {
      list = list.filter((s) => getQuote(s) === quoteFilter);
    }
    return list;
  }, [symbols, search, quoteFilter]);

  return (
    <div className="min-h-screen">
      <AppHeader title="Piyasalar" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Piyasalar</h1>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-white"
            >
              {BORSALAR.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            <select
              value={quoteFilter}
              onChange={(e) => setQuoteFilter(e.target.value)}
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-white text-sm"
            >
              <option value="">Tüm pariteler</option>
              {quotes.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Sembol ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 w-40 sm:w-48"
            />
          </div>
        </div>
        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 mb-6">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-zinc-500">Yükleniyor...</p>
        ) : (
          <>
            <p className="text-zinc-500 text-sm mb-2">
              {filteredSymbols.length} sembol
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {filteredSymbols.map((s) => (
                <li key={s}>
                  <Link
                    href={`/markets/${encodeURIComponent(s)}?exchange=${exchange}`}
                    className="block rounded-lg border border-zinc-800 px-4 py-2 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/50 text-sm"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
            {filteredSymbols.length === 0 && (
              <p className="text-zinc-500 py-4">Eşleşen sembol yok.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
