"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { fetchAuth } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type MLModel = {
  id: number;
  name: string;
  version: string;
  symbol: string | null;
  timeframe: string | null;
  task: string;
  is_active: boolean;
};

export default function MLPage() {
  const [models, setModels] = useState<MLModel[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [form, setForm] = useState({
    symbol: "BTC/USDT",
    exchange: "binance",
    timeframe: "1h",
    name: "",
    version: "v1",
  });
  const [egitiliyor, setEgitiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<Record<string, unknown> | null>(null);

  const { token, yuklendi } = useRequireAuth();

  const yukle = () => {
    if (!token) return;
    fetchAuth("/api/v1/ml/models")
      .then((r) => r.json())
      .then((data) => setModels(data.models || []))
      .catch(() => setHata("API bağlantı hatası."))
      .finally(() => setYukleniyor(false));
  };

  useEffect(() => { if (token) yukle(); }, [token]);

  const egit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setEgitiliyor(true);
    setSonuc(null);
    try {
      const res = await fetchAuth("/api/v1/ml/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSonuc(data);
      if (data.id) yukle();
    } catch {
      setSonuc({ ok: false, hata: "İstek başarısız." });
    }
    setEgitiliyor(false);
  };

  const aktifYap = async (modelId: number) => {
    try {
      const res = await fetchAuth(`/api/v1/ml/models/${modelId}/activate`, { method: "POST" });
      const data = await res.json();
      if (data.ok) yukle();
    } catch {
      // ignore
    }
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
      <AppHeader title="ML Modeller" />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">ML Modeller</h1>
        {hata && (
          <div className="rounded-lg bg-amber-900/20 border border-amber-700 text-amber-200 px-4 py-3 mb-6">
            {hata} <Link href="/giris" className="underline">Giriş sayfasına git</Link>
          </div>
        )}

        {token && (
          <form onSubmit={egit} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 mb-8">
            <h2 className="text-lg font-medium text-white mb-4">Yeni model eğit (OHLCV)</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="Model adı"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500"
              />
              <input
                type="text"
                placeholder="Versiyon"
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500"
              />
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
              <div className="flex gap-2">
                <select
                  value={form.timeframe}
                  onChange={(e) => setForm((f) => ({ ...f, timeframe: e.target.value }))}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white flex-1"
                >
                  <option value="1h">1h</option>
                  <option value="4h">4h</option>
                  <option value="1d">1d</option>
                </select>
                <button
                  type="submit"
                  disabled={egitiliyor || !form.name.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {egitiliyor ? "Eğitiliyor..." : "Eğit"}
                </button>
              </div>
            </div>
            {sonuc && (
              <div className={`mt-4 p-4 rounded-lg ${sonuc.ok !== false && sonuc.id ? "bg-emerald-900/20 border border-emerald-700 text-emerald-200" : "bg-red-900/20 border border-red-700 text-red-200"}`}>
                {sonuc.id ? (
                  <p>Model oluşturuldu. ID: {String(sonuc.id)}</p>
                ) : sonuc.hata ? (
                  <p>{String(sonuc.hata)}</p>
                ) : null}
              </div>
            )}
          </form>
        )}

        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <h2 className="text-lg font-medium text-white p-4 border-b border-zinc-800">Kayıtlı modeller</h2>
          {yukleniyor ? (
            <p className="text-zinc-500 p-6">Yükleniyor...</p>
          ) : models.length === 0 ? (
            <p className="text-zinc-500 p-6">Henüz model yok. Yukarıdan eğitim başlatın veya Stratejiler sayfasında ML Sinyal tipinde strateji oluşturup buradan model bağlayın.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                    <th className="p-4">Ad</th>
                    <th className="p-4">Versiyon</th>
                    <th className="p-4">Sembol</th>
                    <th className="p-4">Timeframe</th>
                    <th className="p-4">Görev</th>
                    <th className="p-4">Aktif</th>
                    <th className="p-4">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.id} className="border-b border-zinc-800/80">
                      <td className="p-4 text-white">{m.name}</td>
                      <td className="p-4 text-zinc-300">{m.version}</td>
                      <td className="p-4 text-zinc-300">{m.symbol ?? "—"}</td>
                      <td className="p-4 text-zinc-300">{m.timeframe ?? "—"}</td>
                      <td className="p-4 text-zinc-300">{m.task}</td>
                      <td className="p-4">
                        <span className={m.is_active ? "text-emerald-400" : "text-zinc-500"}>
                          {m.is_active ? "Evet" : "Hayır"}
                        </span>
                      </td>
                      <td className="p-4">
                        {!m.is_active && (
                          <button
                            type="button"
                            onClick={() => aktifYap(m.id)}
                            className="rounded px-3 py-1 text-sm border border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                          >
                            Aktif yap
                          </button>
                        )}
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
