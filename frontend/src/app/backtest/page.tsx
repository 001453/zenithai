"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { fetchAuth } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type Strategy = { id: number; name: string; type: string; symbol: string };
type Run = {
  id: number;
  strategy_id: number;
  symbol: string;
  timeframe: string;
  start_ts: string;
  end_ts: string;
  final_balance: string;
  total_return_pct: number | null;
  total_trades: number;
  win_rate_pct: number | null;
};

function BacktestContent() {
  const searchParams = useSearchParams();
  const urlStrategyId = searchParams.get("strategy_id");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [form, setForm] = useState({
    strategy_id: urlStrategyId ? Number(urlStrategyId) : 0,
    symbol: "BTC/USDT",
    exchange: "binance",
    timeframe: "1h",
    start_ts: "",
    end_ts: "",
    initial_balance: "10000",
  });
  const [calistiriliyor, setCalistiriliyor] = useState(false);
  const [sonuc, setSonuc] = useState<Record<string, unknown> | null>(null);
  const RUN_LIMIT = 20;
  const [runsOffset, setRunsOffset] = useState(0);
  const [runsDahaFazla, setRunsDahaFazla] = useState(true);

  const { token, yuklendi } = useRequireAuth();

  const yukle = () => {
    if (!token) return;
    const stratParam = form.strategy_id ? `&strategy_id=${form.strategy_id}` : "";
    Promise.all([
      fetchAuth("/api/v1/strategies").then((r) => r.json()),
      fetchAuth(`/api/v1/backtest/runs?limit=${RUN_LIMIT}&offset=0${stratParam}`).then((r) => r.json()),
    ])
      .then(([stratRes, runsRes]) => {
        setStrategies(stratRes.strategies || []);
        const newRuns = runsRes.runs || [];
        setRuns(newRuns);
        setRunsOffset(RUN_LIMIT);
        setRunsDahaFazla(newRuns.length >= RUN_LIMIT);
        const stratList = stratRes.strategies || [];
        const preSelectId = urlStrategyId ? Number(urlStrategyId) : (stratList[0]?.id ?? 0);
        if (stratList.length > 0 && (form.strategy_id === 0 || urlStrategyId))
          setForm((f) => ({ ...f, strategy_id: preSelectId }));
      })
      .catch(() => setHata("API bağlantı hatası."))
      .finally(() => setYukleniyor(false));
  };

  useEffect(() => {
    if (urlStrategyId && form.strategy_id === 0) {
      setForm((f) => ({ ...f, strategy_id: Number(urlStrategyId) }));
    }
  }, [urlStrategyId]);

  useEffect(() => { if (token) yukle(); }, [token, form.strategy_id]);

  const dahaFazlaRuns = () => {
    if (!token) return;
    const stratParam = form.strategy_id ? `&strategy_id=${form.strategy_id}` : "";
    fetchAuth(`/api/v1/backtest/runs?limit=${RUN_LIMIT}&offset=${runsOffset}${stratParam}`)
      .then((r) => r.json())
      .then((runsRes) => {
        const newRuns = runsRes.runs || [];
        setRuns((prev) => [...prev, ...newRuns]);
        setRunsOffset((o) => o + RUN_LIMIT);
        setRunsDahaFazla(newRuns.length >= RUN_LIMIT);
      });
  };

  const backtestCalistir = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalistiriliyor(true);
    setSonuc(null);
    const startIso = form.start_ts || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const endIso = form.end_ts || new Date().toISOString();
    try {
      const res = await fetchAuth("/api/v1/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_id: form.strategy_id,
          symbol: form.symbol,
          exchange: form.exchange,
          timeframe: form.timeframe,
          start_ts: startIso,
          end_ts: endIso,
          initial_balance: form.initial_balance,
        }),
      });
      const data = await res.json();
      setSonuc(data);
      if (data.run_id) yukle();
    } catch {
      setSonuc({ ok: false, hata: "İstek başarısız." });
    }
    setCalistiriliyor(false);
  };

  const formatTarih = (s: string) => {
    try {
      return new Date(s).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return s;
    }
  };

  const csvIndir = () => {
    const headers = ["id", "sembol", "timeframe", "baslangic", "bitis", "son_bakiye", "getiri_pct", "islem", "kazanc_pct"];
    const rows = runs.map((r) => [
      r.id,
      r.symbol,
      r.timeframe,
      formatTarih(r.start_ts),
      formatTarih(r.end_ts),
      r.final_balance,
      r.total_return_pct != null ? r.total_return_pct.toFixed(2) : "",
      r.total_trades,
      r.win_rate_pct != null ? r.win_rate_pct.toFixed(1) : "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startVal = form.start_ts ? form.start_ts.slice(0, 16) : "";
  const endVal = form.end_ts ? form.end_ts.slice(0, 16) : "";

  if (!yuklendi) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Backtest" />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Backtest</h1>
        {hata && (
          <div className="rounded-lg bg-amber-900/20 border border-amber-700 text-amber-200 px-4 py-3 mb-6">
            {hata} <Link href="/giris" className="underline">Giriş sayfasına git</Link>
          </div>
        )}

        {token && (
          <form onSubmit={backtestCalistir} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 mb-8">
            <h2 className="text-lg font-medium text-white mb-4">Backtest çalıştır</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Strateji</label>
                <select
                  value={form.strategy_id}
                  onChange={(e) => setForm((f) => ({ ...f, strategy_id: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  <option value={0}>Seçin</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.symbol})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Sembol</label>
                <input
                  type="text"
                  value={form.symbol}
                  onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Timeframe</label>
                <select
                  value={form.timeframe}
                  onChange={(e) => setForm((f) => ({ ...f, timeframe: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  <option value="1h">1h</option>
                  <option value="4h">4h</option>
                  <option value="1d">1d</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Başlangıç bakiyesi</label>
                <input
                  type="text"
                  value={form.initial_balance}
                  onChange={(e) => setForm((f) => ({ ...f, initial_balance: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Başlangıç tarihi</label>
                <input
                  type="datetime-local"
                  value={startVal}
                  onChange={(e) => setForm((f) => ({ ...f, start_ts: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Bitiş tarihi</label>
                <input
                  type="datetime-local"
                  value={endVal}
                  onChange={(e) => setForm((f) => ({ ...f, end_ts: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={calistiriliyor || form.strategy_id === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {calistiriliyor ? "Çalışıyor..." : "Backtest çalıştır"}
            </button>
            {sonuc && (
              <div className={`mt-4 p-4 rounded-lg ${sonuc.ok ? "bg-emerald-900/20 border border-emerald-700 text-emerald-200" : "bg-red-900/20 border border-red-700 text-red-200"}`}>
                {sonuc.ok ? (
                  <>
                    <p>Run ID: {String(sonuc.run_id)}</p>
                    <p>Son bakiye: {String(sonuc.final_balance)}</p>
                    <p>Getiri: %{sonuc.total_return_pct != null ? Number(sonuc.total_return_pct).toFixed(2) : "—"}</p>
                    <p>İşlem sayısı: {String(sonuc.total_trades)}</p>
                    <p>Kazanç oranı: %{sonuc.win_rate_pct != null ? Number(sonuc.win_rate_pct).toFixed(1) : "—"}</p>
                  </>
                ) : (
                  <p>{String(sonuc.hata || "Hata")}</p>
                )}
              </div>
            )}
          </form>
        )}

        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-lg font-medium text-white">Backtest geçmişi</h2>
            <button
              type="button"
              onClick={csvIndir}
              disabled={runs.length === 0}
              className="rounded-lg border border-zinc-600 px-3 py-1 text-zinc-400 hover:bg-zinc-800 text-sm disabled:opacity-50"
            >
              CSV indir
            </button>
          </div>
          {yukleniyor ? (
            <p className="text-zinc-500 p-6">Yükleniyor...</p>
          ) : runs.length === 0 ? (
            <p className="text-zinc-500 p-6">Henüz backtest çalıştırılmadı.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                    <th className="p-4">Sembol</th>
                    <th className="p-4">Timeframe</th>
                    <th className="p-4">Başlangıç</th>
                    <th className="p-4">Bitiş</th>
                    <th className="p-4">Son bakiye</th>
                    <th className="p-4">Getiri %</th>
                    <th className="p-4">İşlem</th>
                    <th className="p-4">Kazanç %</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-800/80">
                      <td className="p-4 text-white">{r.symbol}</td>
                      <td className="p-4 text-zinc-300">{r.timeframe}</td>
                      <td className="p-4 text-zinc-500 text-sm">{formatTarih(r.start_ts)}</td>
                      <td className="p-4 text-zinc-500 text-sm">{formatTarih(r.end_ts)}</td>
                      <td className="p-4 text-zinc-300">{r.final_balance}</td>
                      <td className="p-4">
                        {r.total_return_pct != null ? (
                          <span className={r.total_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}>
                            %{r.total_return_pct.toFixed(2)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-4 text-zinc-300">{r.total_trades}</td>
                      <td className="p-4 text-zinc-300">{r.win_rate_pct != null ? `%${r.win_rate_pct.toFixed(1)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!yukleniyor && runs.length > 0 && runsDahaFazla && (
            <div className="p-4 border-t border-zinc-800 text-center">
              <button type="button" onClick={dahaFazlaRuns} className="rounded-lg border border-zinc-600 px-4 py-2 text-zinc-400 hover:bg-zinc-800 text-sm">
                Daha fazla yükle
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function BacktestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-zinc-500">Yükleniyor...</p></div>}>
      <BacktestContent />
    </Suspense>
  );
}
