"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAuth } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
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
};

type MLModel = { id: number; name: string; version: string; symbol: string | null };

export default function StrategiesPage() {
  const { token, yuklendi } = useRequireAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [models, setModels] = useState<MLModel[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "ma_cross" as "ma_cross" | "rsi" | "ml_signal",
    symbol: "BTC/USDT",
    exchange: "binance",
    mode: "paper",
    params: { short_period: 10, long_period: 20 } as Record<string, number>,
  });
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const getDefaultParams = (t: string): Record<string, number> => {
    if (t === "rsi") return { rsi_period: 14, oversold: 30, overbought: 70 };
    if (t === "ma_cross") return { short_period: 10, long_period: 20 };
    return {};
  };

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchAuth("/api/v1/strategies").then((r) => r.json()),
      fetchAuth("/api/v1/ml/models").then((r) => r.json()),
    ])
      .then(([stratRes, modRes]) => {
        if (stratRes.strategies) setStrategies(stratRes.strategies);
        if (modRes.models) setModels(modRes.models);
      })
      .catch(() => setHata("API bağlantı hatası."))
      .finally(() => setYukleniyor(false));
  }, [token]);

  const mlModelDegistir = async (strategyId: number, mlModelId: number | null) => {
    const res = await fetchAuth(`/api/v1/strategies/${strategyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ml_model_id: mlModelId }),
    });
    const data = await res.json();
    if (data.ok)
      setStrategies((prev) =>
        prev.map((s) => (s.id === strategyId ? { ...s, ml_model_id: mlModelId } : s))
      );
  };

  const startStop = async (id: number, isActive: boolean) => {
    const path = isActive ? "stop" : "start";
    const res = await fetchAuth(`/api/v1/strategies/${id}/${path}`, { method: "POST" });
    const data = await res.json();
    if (data.ok)
      setStrategies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s))
      );
  };

  const sil = async (id: number, name: string) => {
    if (!confirm(`"${name}" stratejisini silmek istediğinize emin misiniz? Emir geçmişi korunur, risk limitleri ve backtest kayıtları silinir.`)) return;
    const res = await fetchAuth(`/api/v1/strategies/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) setStrategies((prev) => prev.filter((s) => s.id !== id));
  };

  const stratejiOlustur = async (e: React.FormEvent) => {
    e.preventDefault();
    setGonderiliyor(true);
    const res = await fetchAuth("/api/v1/strategies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, params: form.params || getDefaultParams(form.type) }),
    });
    const data = await res.json();
    if (data.id) {
      setStrategies((prev) => [...prev, { ...form, id: data.id, is_active: false, ml_model_id: null } as Strategy]);
      setForm({ name: "", type: "ma_cross", symbol: "BTC/USDT", exchange: "binance", mode: "paper", params: { short_period: 10, long_period: 20 } });
    }
    setGonderiliyor(false);
  };

  if (!yuklendi) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Stratejiler" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Botlar & Stratejiler</h1>
        {hata && (
          <div className="rounded-lg bg-amber-900/20 border border-amber-700 text-amber-200 px-4 py-3 mb-6">
            {hata} <Link href="/giris" className="underline">Giriş sayfasına git</Link>
          </div>
        )}

        {token && (
          <form onSubmit={stratejiOlustur} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 mb-8">
            <h2 className="text-lg font-medium text-white mb-4">Yeni strateji</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="Ad"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500"
              />
              <select
                value={form.type}
                onChange={(e) => {
                  const t = e.target.value as "ma_cross" | "rsi" | "ml_signal";
                  setForm((f) => ({ ...f, type: t, params: getDefaultParams(t) }));
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              >
                <option value="ma_cross">MA Cross</option>
                <option value="rsi">RSI</option>
                <option value="ml_signal">ML Sinyal</option>
              </select>
              <input
                type="text"
                value={form.symbol}
                onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              />
              <select
                value={form.exchange}
                onChange={(e) => setForm((f) => ({ ...f, exchange: e.target.value }))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              >
                <option value="binance">Binance</option>
                <option value="twelvedata">Forex/Altın</option>
              </select>
              <button type="submit" disabled={gonderiliyor || !form.name.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50">
                {gonderiliyor ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
            {form.type === "ma_cross" && (
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <label className="text-zinc-400 text-sm">Short MA:</label>
                <input type="number" min={2} max={100} value={form.params?.short_period ?? 10}
                  onChange={(e) => setForm((f) => ({ ...f, params: { ...f.params, short_period: Number(e.target.value) || 10 } }))}
                  className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white text-sm" />
                <label className="text-zinc-400 text-sm">Long MA:</label>
                <input type="number" min={2} max={200} value={form.params?.long_period ?? 20}
                  onChange={(e) => setForm((f) => ({ ...f, params: { ...f.params, long_period: Number(e.target.value) || 20 } }))}
                  className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white text-sm" />
              </div>
            )}
            {form.type === "rsi" && (
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <label className="text-zinc-400 text-sm">RSI periyot:</label>
                <input type="number" min={5} max={50} value={form.params?.rsi_period ?? 14}
                  onChange={(e) => setForm((f) => ({ ...f, params: { ...f.params, rsi_period: Number(e.target.value) || 14 } }))}
                  className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white text-sm" />
                <label className="text-zinc-400 text-sm">Oversold:</label>
                <input type="number" min={1} max={40} value={form.params?.oversold ?? 30}
                  onChange={(e) => setForm((f) => ({ ...f, params: { ...f.params, oversold: Number(e.target.value) || 30 } }))}
                  className="w-14 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white text-sm" />
                <label className="text-zinc-400 text-sm">Overbought:</label>
                <input type="number" min={60} max={99} value={form.params?.overbought ?? 70}
                  onChange={(e) => setForm((f) => ({ ...f, params: { ...f.params, overbought: Number(e.target.value) || 70 } }))}
                  className="w-14 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white text-sm" />
              </div>
            )}
          </form>
        )}

        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <h2 className="text-lg font-medium text-white p-4 border-b border-zinc-800">Mevcut stratejiler</h2>
          {yukleniyor ? (
            <p className="text-zinc-500 p-6">Yükleniyor...</p>
          ) : strategies.length === 0 ? (
            <p className="text-zinc-500 p-6">Henüz strateji yok. Giriş yapıp yukarıdan ekleyebilirsiniz.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                    <th className="p-4">Ad</th>
                    <th className="p-4">Tip</th>
                    <th className="p-4">Sembol</th>
                    <th className="p-4">Borsa</th>
                    <th className="p-4">ML Model</th>
                    <th className="p-4">Durum</th>
                    <th className="p-4">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-800/80">
                      <td className="p-4">
                        <Link href={`/strategies/${s.id}`} className="text-white hover:text-emerald-400 hover:underline">{s.name}</Link>
                      </td>
                      <td className="p-4 text-zinc-300">{s.type}</td>
                      <td className="p-4 text-zinc-300">{s.symbol}</td>
                      <td className="p-4 text-zinc-300">{s.exchange}</td>
                      <td className="p-4">
                        <select
                          value={s.ml_model_id ?? ""}
                          onChange={(e) => mlModelDegistir(s.id, e.target.value ? Number(e.target.value) : null)}
                          className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm"
                        >
                          <option value="">—</option>
                          {models.map((m) => (
                            <option key={m.id} value={m.id}>{m.name} ({m.symbol || "—"})</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <span className={s.is_active ? "text-emerald-400" : "text-zinc-500"}>
                          {s.is_active ? "Açık" : "Kapalı"}
                        </span>
                      </td>
                      <td className="p-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => startStop(s.id, s.is_active)}
                          className="rounded px-3 py-1 text-sm border border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                        >
                          {s.is_active ? "Durdur" : "Başlat"}
                        </button>
                        <button
                          type="button"
                          onClick={() => sil(s.id, s.name)}
                          className="rounded px-3 py-1 text-sm border border-red-800 text-red-400 hover:bg-red-900/30"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
