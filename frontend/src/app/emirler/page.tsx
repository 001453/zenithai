"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { fetchAuth } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/contexts/ToastContext";

type Order = {
  id: number;
  strategy_id: number | null;
  symbol: string;
  side: string;
  quantity: string;
  price: string | null;
  status: string;
  mode: string;
  realized_pnl: string | null;
  created_at: string;
};

type Position = {
  id: number;
  symbol: string;
  side: string;
  quantity: string;
  entry_price_avg: string;
  mode: string;
  updated_at: string;
};

type Strategy = { id: number; name: string };

export default function EmirlerPage() {
  const searchParams = useSearchParams();
  const urlStrategyId = searchParams.get("strategy_id");
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [filtreStrategyId, setFiltreStrategyId] = useState<string>(urlStrategyId || "");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [emirForm, setEmirForm] = useState({
    symbol: "BTC/USDT",
    side: "buy" as "buy" | "sell",
    quantity: "0.001",
    price: "",
    exchange: "binance",
    strategy_id: "" as number | "",
  });
  const [emirGonderiliyor, setEmirGonderiliyor] = useState(false);
  const [emirMesaj, setEmirMesaj] = useState<{ ok: boolean; metin: string } | null>(null);

  const { token, yuklendi } = useRequireAuth();
  const toast = useToast();

  const EMR_LIMIT = 30;
  const [emirOffset, setEmirOffset] = useState(0);
  const [emirDahaFazla, setEmirDahaFazla] = useState(true);

  const yukle = () => {
    if (!token) return;
    const stratParam = filtreStrategyId ? `&strategy_id=${filtreStrategyId}` : "";
    Promise.all([
      fetchAuth(`/api/v1/orders/paper?limit=${EMR_LIMIT}&offset=0${stratParam}`).then((r) => r.json()),
      fetchAuth("/api/v1/orders/positions").then((r) => r.json()),
      fetchAuth("/api/v1/strategies").then((r) => r.json()),
    ])
      .then(([ordRes, posRes, stratRes]) => {
        const newOrders = ordRes.orders || [];
        setOrders(newOrders);
        setEmirOffset(EMR_LIMIT);
        setEmirDahaFazla(newOrders.length >= EMR_LIMIT);
        setPositions(posRes.positions || []);
        setStrategies(stratRes.strategies || []);
      })
      .catch(() => setHata("API bağlantı hatası."))
      .finally(() => setYukleniyor(false));
  };

  useEffect(() => { if (token) yukle(); }, [token, filtreStrategyId]);

  const formatTarih = (s: string) => {
    try {
      return new Date(s).toLocaleString("tr-TR");
    } catch {
      return s;
    }
  };

  const strategyName = (sid: number | null) => {
    if (!sid) return "—";
    const s = strategies.find((x) => x.id === sid);
    return s ? s.name : `#${sid}`;
  };

  const csvIndir = () => {
    const headers = ["id", "tarih", "strateji", "sembol", "yon", "miktar", "fiyat", "durum", "realize_pnl"];
    const rows = orders.map((o) => [
      o.id,
      formatTarih(o.created_at),
      strategyName(o.strategy_id),
      o.symbol,
      o.side,
      o.quantity,
      o.price ?? "",
      o.status,
      o.realized_pnl ?? "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emirler_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const csvPozisyonIndir = () => {
    const headers = ["id", "sembol", "yon", "miktar", "ort_giris", "mod", "guncellenme"];
    const rows = positions.map((p) => [
      p.id,
      p.symbol,
      p.side,
      p.quantity,
      p.entry_price_avg,
      p.mode,
      formatTarih(p.updated_at),
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pozisyonlar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dahaFazlaEmir = () => {
    if (!token) return;
    const stratParam = filtreStrategyId ? `&strategy_id=${filtreStrategyId}` : "";
    fetchAuth(`/api/v1/orders/paper?limit=${EMR_LIMIT}&offset=${emirOffset}${stratParam}`)
      .then((r) => r.json())
      .then((ordRes) => {
        const newOrders = ordRes.orders || [];
        setOrders((prev) => [...prev, ...newOrders]);
        setEmirOffset((o) => o + EMR_LIMIT);
        setEmirDahaFazla(newOrders.length >= EMR_LIMIT);
      });
  };

  const manuelEmirGonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmirMesaj(null);
    setEmirGonderiliyor(true);
    try {
      const res = await fetchAuth("/api/v1/orders/paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: emirForm.symbol,
          side: emirForm.side,
          quantity: emirForm.quantity,
          price: emirForm.price ? emirForm.price : null,
          strategy_id: emirForm.strategy_id === "" ? null : emirForm.strategy_id,
          exchange: emirForm.exchange,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.mesaj || "Emir gerçekleştirildi.");
        setEmirMesaj({ ok: true, metin: data.mesaj || "Emir gerçekleştirildi." });
        setEmirForm((f) => ({ ...f, quantity: "0.001", price: "" }));
        yukle();
      } else {
        toast.error(data.hata || "Emir gönderilemedi.");
        setEmirMesaj({ ok: false, metin: data.hata || "Emir gönderilemedi." });
      }
    } catch {
      toast.error("Bağlantı hatası.");
      setEmirMesaj({ ok: false, metin: "Bağlantı hatası." });
    }
    setEmirGonderiliyor(false);
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
      <AppHeader title="Emirler" />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Emirler & Pozisyonlar</h1>
          <div className="flex gap-2">
            <select
              value={filtreStrategyId}
              onChange={(e) => setFiltreStrategyId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm"
            >
              <option value="">Tüm stratejiler</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={csvPozisyonIndir}
              disabled={positions.length === 0}
              className="rounded-lg border border-zinc-600 px-3 py-2 text-zinc-400 hover:bg-zinc-800 text-sm disabled:opacity-50"
            >
              Pozisyonlar CSV
            </button>
            <button
              type="button"
              onClick={csvIndir}
              disabled={orders.length === 0}
              className="rounded-lg border border-zinc-600 px-3 py-2 text-zinc-400 hover:bg-zinc-800 text-sm disabled:opacity-50"
            >
              Emirler CSV
            </button>
          </div>
        </div>
        {hata && (
          <div className="rounded-lg bg-amber-900/20 border border-amber-700 text-amber-200 px-4 py-3 mb-6">
            {hata} <Link href="/giris" className="underline">Giriş sayfasına git</Link>
          </div>
        )}

        {token && (
          <form onSubmit={manuelEmirGonder} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 mb-8">
            <h2 className="text-lg font-medium text-white mb-4">Manuel kağıt emir</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <input
                type="text"
                placeholder="Sembol (örn. BTC/USDT)"
                value={emirForm.symbol}
                onChange={(e) => setEmirForm((f) => ({ ...f, symbol: e.target.value }))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500"
                required
              />
              <select
                value={emirForm.side}
                onChange={(e) => setEmirForm((f) => ({ ...f, side: e.target.value as "buy" | "sell" }))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              >
                <option value="buy">Al</option>
                <option value="sell">Sat</option>
              </select>
              <input
                type="text"
                placeholder="Miktar"
                value={emirForm.quantity}
                onChange={(e) => setEmirForm((f) => ({ ...f, quantity: e.target.value }))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500"
                required
              />
              <input
                type="text"
                placeholder="Limit fiyat (opsiyonel)"
                value={emirForm.price}
                onChange={(e) => setEmirForm((f) => ({ ...f, price: e.target.value }))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500"
              />
              <select
                value={emirForm.exchange}
                onChange={(e) => setEmirForm((f) => ({ ...f, exchange: e.target.value }))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              >
                <option value="binance">Binance</option>
                <option value="twelvedata">Forex/Altın</option>
              </select>
              <select
                value={emirForm.strategy_id === "" ? "" : emirForm.strategy_id}
                onChange={(e) => setEmirForm((f) => ({ ...f, strategy_id: e.target.value === "" ? "" : Number(e.target.value) }))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              >
                <option value="">Manuel</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                type="submit"
                disabled={emirGonderiliyor || !emirForm.symbol.trim() || !emirForm.quantity}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {emirGonderiliyor ? "Gönderiliyor..." : "Emir gönder"}
              </button>
              {emirMesaj && (
                <span className={emirMesaj.ok ? "text-emerald-400 text-sm" : "text-red-400 text-sm"}>{emirMesaj.metin}</span>
              )}
            </div>
          </form>
        )}

        <div className="rounded-xl border border-zinc-800 overflow-hidden mb-8">
          <h2 className="text-lg font-medium text-white p-4 border-b border-zinc-800">Açık pozisyonlar</h2>
          {yukleniyor ? (
            <p className="text-zinc-500 p-6">Yükleniyor...</p>
          ) : positions.length === 0 ? (
            <p className="text-zinc-500 p-6">Açık pozisyon yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                    <th className="p-4">Sembol</th>
                    <th className="p-4">Yön</th>
                    <th className="p-4">Miktar</th>
                    <th className="p-4">Ort. Giriş</th>
                    <th className="p-4">Mod</th>
                    <th className="p-4">Güncellenme</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-800/80">
                      <td className="p-4 text-white">{p.symbol}</td>
                      <td className="p-4">
                        <span className={p.side === "long" ? "text-emerald-400" : "text-red-400"}>{p.side}</span>
                      </td>
                      <td className="p-4 text-zinc-300">{p.quantity}</td>
                      <td className="p-4 text-zinc-300">{p.entry_price_avg}</td>
                      <td className="p-4 text-zinc-300">{p.mode}</td>
                      <td className="p-4 text-zinc-500 text-sm">{formatTarih(p.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <h2 className="text-lg font-medium text-white p-4 border-b border-zinc-800">Kağıt emir geçmişi</h2>
          {yukleniyor ? (
            <p className="text-zinc-500 p-6">Yükleniyor...</p>
          ) : orders.length === 0 ? (
            <p className="text-zinc-500 p-6">Henüz emir yok. Stratejiler veya manuel kağıt emir ile oluşur.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                    <th className="p-4">Tarih</th>
                    <th className="p-4">Strateji</th>
                    <th className="p-4">Sembol</th>
                    <th className="p-4">Yön</th>
                    <th className="p-4">Miktar</th>
                    <th className="p-4">Fiyat</th>
                    <th className="p-4">Durum</th>
                    <th className="p-4">Realize PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-zinc-800/80">
                      <td className="p-4 text-zinc-500 text-sm">{formatTarih(o.created_at)}</td>
                      <td className="p-4 text-zinc-400 text-sm">{strategyName(o.strategy_id)}</td>
                      <td className="p-4 text-white">{o.symbol}</td>
                      <td className="p-4">
                        <span className={o.side === "buy" ? "text-emerald-400" : "text-red-400"}>{o.side}</span>
                      </td>
                      <td className="p-4 text-zinc-300">{o.quantity}</td>
                      <td className="p-4 text-zinc-300">{o.price ?? "—"}</td>
                      <td className="p-4 text-zinc-300">{o.status}</td>
                      <td className="p-4">
                        {o.realized_pnl != null ? (
                          <span className={Number(o.realized_pnl) >= 0 ? "text-emerald-400" : "text-red-400"}>
                            {o.realized_pnl}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!yukleniyor && orders.length > 0 && emirDahaFazla && (
            <div className="p-4 border-t border-zinc-800 text-center">
              <button type="button" onClick={dahaFazlaEmir} className="rounded-lg border border-zinc-600 px-4 py-2 text-zinc-400 hover:bg-zinc-800 text-sm">
                Daha fazla yükle
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
