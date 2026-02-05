"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { fetchAuth } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type Strategy = {
  id: number;
  name: string;
  type: string;
  symbol: string;
  exchange: string;
  mode: string;
  is_active: boolean;
  ml_model_id: number | null;
  params: Record<string, unknown>;
  created_at: string;
};

type Order = { id: number; symbol: string; side: string; quantity: string; status: string; created_at: string; realized_pnl: string | null };
type Run = { id: number; symbol: string; timeframe: string; final_balance: string; total_return_pct: number | null; total_trades: number };
type MLModel = { id: number; name: string; version: string };

export default function StrategyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { token, yuklendi } = useRequireAuth();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [models, setModels] = useState<MLModel[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (!token || isNaN(id)) return;
    Promise.all([
      fetchAuth(`/api/v1/strategies/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetchAuth(`/api/v1/orders/paper?strategy_id=${id}&limit=20`).then((r) => r.json()),
      fetchAuth(`/api/v1/backtest/runs?strategy_id=${id}&limit=10`).then((r) => r.json()),
      fetchAuth("/api/v1/ml/models").then((r) => r.json()),
    ])
      .then(([stratRes, ordRes, runsRes, modRes]) => {
        if (stratRes?.strategy) setStrategy(stratRes.strategy);
        else setHata("Strateji bulunamadı.");
        setOrders(ordRes.orders || []);
        setRuns(runsRes.runs || []);
        setModels(modRes.models || []);
      })
      .catch(() => setHata("API bağlantı hatası."))
      .finally(() => setYukleniyor(false));
  }, [token, id]);

  const startStop = async () => {
    if (!strategy) return;
    const path = strategy.is_active ? "stop" : "start";
    const res = await fetchAuth(`/api/v1/strategies/${id}/${path}`, { method: "POST" });
    const data = await res.json();
    if (data.ok) setStrategy((s) => (s ? { ...s, is_active: !s.is_active } : null));
  };

  const mlModelDegistir = async (mlModelId: number | null) => {
    const res = await fetchAuth(`/api/v1/strategies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ml_model_id: mlModelId }),
    });
    const data = await res.json();
    if (data.ok && strategy) setStrategy({ ...strategy, ml_model_id: mlModelId });
  };

  const paramsDegistir = async (newParams: Record<string, unknown>) => {
    const res = await fetchAuth(`/api/v1/strategies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ params: newParams }),
    });
    const data = await res.json();
    if (data.ok && strategy) setStrategy({ ...strategy, params: newParams });
  };

  const sil = async () => {
    if (!strategy || !confirm(`"${strategy.name}" stratejisini silmek istediğinize emin misiniz?`)) return;
    const res = await fetchAuth(`/api/v1/strategies/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) router.replace("/strategies");
  };

  const formatTarih = (s: string) => new Date(s).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });

  if (!yuklendi) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  if (yukleniyor || !strategy) {
    return (
      <div className="min-h-screen">
        <AppHeader title="Strateji" showBack backHref="/strategies" />
        <main className="max-w-7xl mx-auto px-6 py-8">
          {yukleniyor ? (
            <p className="text-zinc-500">Yükleniyor...</p>
          ) : (
            <div className="rounded-lg bg-amber-900/20 border border-amber-700 text-amber-200 px-4 py-3">
              {hata || "Strateji bulunamadı."}
              <Link href="/strategies" className="ml-2 underline">Stratejilere dön</Link>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title={strategy.name} showBack backHref="/strategies" />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{strategy.name}</h1>
            <p className="text-zinc-500 mt-1">
              {strategy.type} • {strategy.symbol} • {strategy.exchange} • {strategy.mode}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/markets/${encodeURIComponent(strategy.symbol)}?exchange=${strategy.exchange}`}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-zinc-300 hover:bg-zinc-800"
            >
              Grafiğe git
            </Link>
            <button
              type="button"
              onClick={startStop}
              className={`rounded-lg px-4 py-2 ${strategy.is_active ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"} text-white`}
            >
              {strategy.is_active ? "Durdur" : "Başlat"}
            </button>
            <button
              type="button"
              onClick={sil}
              className="rounded-lg px-4 py-2 border border-red-800 text-red-400 hover:bg-red-900/30"
            >
              Stratejiyi sil
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
            <h2 className="text-lg font-medium text-white mb-4">Ayarlar</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-zinc-500">Durum:</span> <span className={strategy.is_active ? "text-emerald-400" : "text-zinc-500"}>{strategy.is_active ? "Açık" : "Kapalı"}</span></p>
              <p><span className="text-zinc-500">ML Model:</span>
                <select
                  value={strategy.ml_model_id ?? ""}
                  onChange={(e) => mlModelDegistir(e.target.value ? Number(e.target.value) : null)}
                  className="ml-2 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm"
                >
                  <option value="">—</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.version})</option>
                  ))}
                </select>
              </p>
              {strategy.type === "ma_cross" && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-zinc-500">Short MA:</span>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    defaultValue={Number((strategy.params as Record<string, number>)?.["short_period"]) || 10}
                    onBlur={(e) => paramsDegistir({ ...strategy.params, short_period: Number(e.target.value) || 10 })}
                    className="w-16 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm"
                  />
                  <span className="text-zinc-500 ml-2">Long MA:</span>
                  <input
                    type="number"
                    min={2}
                    max={200}
                    defaultValue={Number((strategy.params as Record<string, number>)?.["long_period"]) || 20}
                    onBlur={(e) => paramsDegistir({ ...strategy.params, long_period: Number(e.target.value) || 20 })}
                    className="w-16 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm"
                  />
                </div>
              )}
              {strategy.type === "rsi" && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-zinc-500">RSI periyot:</span>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    defaultValue={Number((strategy.params as Record<string, number>)?.["rsi_period"]) || 14}
                    onBlur={(e) => paramsDegistir({ ...strategy.params, rsi_period: Number(e.target.value) || 14 })}
                    className="w-16 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm"
                  />
                  <span className="text-zinc-500 ml-2">Oversold:</span>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    defaultValue={Number((strategy.params as Record<string, number>)?.["oversold"]) || 30}
                    onBlur={(e) => paramsDegistir({ ...strategy.params, oversold: Number(e.target.value) || 30 })}
                    className="w-14 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm"
                  />
                  <span className="text-zinc-500 ml-2">Overbought:</span>
                  <input
                    type="number"
                    min={60}
                    max={99}
                    defaultValue={Number((strategy.params as Record<string, number>)?.["overbought"]) || 70}
                    onBlur={(e) => paramsDegistir({ ...strategy.params, overbought: Number(e.target.value) || 70 })}
                    className="w-14 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
            <h2 className="text-lg font-medium text-white mb-4">Hızlı işlemler</h2>
            <div className="flex flex-wrap gap-2">
              <Link href={`/backtest?strategy_id=${id}`} className="rounded-lg border border-zinc-600 px-3 py-2 text-zinc-300 hover:bg-zinc-800 text-sm">
                Backtest çalıştır
              </Link>
              <Link href={`/emirler?strategy_id=${id}`} className="rounded-lg border border-zinc-600 px-3 py-2 text-zinc-300 hover:bg-zinc-800 text-sm">
                Emirleri görüntüle
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <h2 className="text-lg font-medium text-white p-4 border-b border-zinc-800">Son emirler</h2>
            {orders.length === 0 ? (
              <p className="text-zinc-500 p-6">Bu stratejiye ait emir yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="p-3">Tarih</th>
                      <th className="p-3">Yön</th>
                      <th className="p-3">Miktar</th>
                      <th className="p-3">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-zinc-800/80">
                        <td className="p-3 text-zinc-500">{formatTarih(o.created_at)}</td>
                        <td className="p-3"><span className={o.side === "buy" ? "text-emerald-400" : "text-red-400"}>{o.side}</span></td>
                        <td className="p-3 text-zinc-300">{o.quantity}</td>
                        <td className="p-3">{o.realized_pnl != null ? <span className={Number(o.realized_pnl) >= 0 ? "text-emerald-400" : "text-red-400"}>{o.realized_pnl}</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <h2 className="text-lg font-medium text-white p-4 border-b border-zinc-800">Backtest geçmişi</h2>
            {runs.length === 0 ? (
              <p className="text-zinc-500 p-6">Bu strateji için backtest yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="p-3">Sembol</th>
                      <th className="p-3">TF</th>
                      <th className="p-3">Bakiye</th>
                      <th className="p-3">Getiri %</th>
                      <th className="p-3">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-b border-zinc-800/80">
                        <td className="p-3 text-white">{r.symbol}</td>
                        <td className="p-3 text-zinc-300">{r.timeframe}</td>
                        <td className="p-3 text-zinc-300">{r.final_balance}</td>
                        <td className="p-3">{r.total_return_pct != null ? <span className={r.total_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}>%{r.total_return_pct.toFixed(2)}</span> : "—"}</td>
                        <td className="p-3 text-zinc-300">{r.total_trades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
