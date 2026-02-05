"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import AppHeader from "@/components/AppHeader";
import { fetchAuth, getToken, getApiBase } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

const Chart = dynamic(() => import("@/components/Chart"), { ssr: false });

function getWsBase(): string {
  const base = getApiBase();
  if (base.startsWith("http")) return base.replace(/^http/, "ws");
  return typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`
    : "";
}

function getTickerWsUrl(sym: string, exch: string): string {
  const base = getWsBase();
  const path = base.startsWith("ws") ? "/api/v1/ws/ticker" : "/api/backend/api/v1/ws/ticker";
  const params = new URLSearchParams({
    symbol: sym,
    exchange: exch,
    interval_sec: "3",
  });
  return `${base}${path}?${params.toString()}`;
}

function getOhlcvWsUrl(sym: string, exch: string): string {
  const base = getWsBase();
  const path = base.startsWith("ws") ? "/api/v1/ws/ohlcv" : "/api/backend/api/v1/ws/ohlcv";
  const params = new URLSearchParams({
    symbol: sym,
    exchange: exch,
    timeframe: "1h",
    limit: "100",
    interval_sec: "30",
  });
  return `${base}${path}?${params.toString()}`;
}

export default function SymbolPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const exchange = searchParams.get("exchange") || "binance";
  const symbol = decodeURIComponent((params.symbol as string) || "");
  const [ohlcv, setOhlcv] = useState<[number, number, number, number, number, number][]>([]);
  const [ticker, setTicker] = useState<{ last?: number; change_24h?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hizliMiktar, setHizliMiktar] = useState("0.001");
  const [hizliGonderiliyor, setHizliGonderiliyor] = useState(false);
  const [hizliMesaj, setHizliMesaj] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const toast = useToast();
  useEffect(() => setToken(getToken()), []);

  const hizliEmir = async (side: "buy" | "sell") => {
    if (!token || !hizliMiktar) return;
    setHizliMesaj(null);
    setHizliGonderiliyor(true);
    try {
      const res = await fetchAuth("/api/v1/orders/paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          side,
          quantity: hizliMiktar,
          price: null,
          strategy_id: null,
          exchange,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Emir gerçekleştirildi.");
        setHizliMesaj("Emir gerçekleştirildi.");
      } else {
        toast.error(data.hata || "Hata.");
        setHizliMesaj(data.hata || "Hata.");
      }
    } catch {
      toast.error("Bağlantı hatası.");
      setHizliMesaj("Bağlantı hatası.");
    }
    setHizliGonderiliyor(false);
  };

  useEffect(() => {
    if (!symbol) return;
    Promise.all([
      fetch(`${getApiBase()}/api/v1/markets/ohlcv?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&timeframe=1h&limit=100`).then((r) => r.json()),
      fetch(`${getApiBase()}/api/v1/markets/ticker?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()),
    ])
      .then(([ohlcvRes, tickerRes]) => {
        if (ohlcvRes.candles) setOhlcv(ohlcvRes.candles);
        setTicker(tickerRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [symbol, exchange]);

  useEffect(() => {
    if (!symbol || typeof window === "undefined") return;
    const wsUrl = getTickerWsUrl(symbol, exchange);
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const RECONNECT_MS = 5000;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string);
            if (data.hata) return;
            setTicker((prev) => ({ ...prev, last: data.last, change_24h: data.change_24h ?? data.percentage }));
          } catch { /* ignore */ }
        };
        ws.onclose = () => {
          ws = null;
          reconnectTimer = setTimeout(connect, RECONNECT_MS);
        };
        ws.onerror = () => { ws?.close(); };
      } catch { /* ignore */ }
    };
    connect();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [symbol, exchange]);

  useEffect(() => {
    if (!symbol || typeof window === "undefined") return;
    const wsUrl = getOhlcvWsUrl(symbol, exchange);
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const RECONNECT_MS = 5000;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string);
            if (data.hata || !Array.isArray(data.candles)) return;
            setOhlcv(data.candles);
          } catch { /* ignore */ }
        };
        ws.onclose = () => {
          ws = null;
          reconnectTimer = setTimeout(connect, RECONNECT_MS);
        };
        ws.onerror = () => { ws?.close(); };
      } catch { /* ignore */ }
    };
    connect();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [symbol, exchange]);

  return (
    <div className="min-h-screen">
      <AppHeader showBack backHref="/markets" title={symbol} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">{symbol}</h1>
          <div className="flex items-center gap-4">
            {ticker && (
            <div className="text-right">
              <span className="text-white font-mono">{ticker.last != null ? Number(ticker.last).toLocaleString() : "—"}</span>
              {ticker.change_24h != null && (
                <span className={ticker.change_24h >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {" "}{ticker.change_24h >= 0 ? "+" : ""}{ticker.change_24h?.toFixed(2)}%
                </span>
              )}
            </div>
          )}
            {token && (
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2">
                <input
                  type="text"
                  value={hizliMiktar}
                  onChange={(e) => setHizliMiktar(e.target.value)}
                  placeholder="Miktar"
                  className="w-20 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => hizliEmir("buy")}
                  disabled={hizliGonderiliyor}
                  className="rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Al
                </button>
                <button
                  type="button"
                  onClick={() => hizliEmir("sell")}
                  disabled={hizliGonderiliyor}
                  className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-500 disabled:opacity-50"
                >
                  Sat
                </button>
                {hizliMesaj && <span className="text-zinc-400 text-sm">{hizliMesaj}</span>}
              </div>
            )}
          </div>
        </div>
        {loading ? (
          <div className="h-96 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-500">
            Grafik yükleniyor...
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <Chart symbol={symbol} data={ohlcv} />
          </div>
        )}
      </main>
    </div>
  );
}
