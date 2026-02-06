"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import AppHeader from "@/components/AppHeader";
import { fetchAuth, getToken, getApiBase } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

const Chart = dynamic(() => import("@/components/Chart"), { ssr: false });
const OrderBook = dynamic(() => import("@/components/OrderBook"), { ssr: false });

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

const TIMEFRAMES = [
  { value: "1m", label: "1 dk" },
  { value: "5m", label: "5 dk" },
  { value: "15m", label: "15 dk" },
  { value: "1h", label: "1 saat" },
  { value: "4h", label: "4 saat" },
  { value: "1d", label: "1 gün" },
];

function getOhlcvWsUrl(sym: string, exch: string, timeframe: string): string {
  const base = getWsBase();
  const path = base.startsWith("ws") ? "/api/v1/ws/ohlcv" : "/api/backend/api/v1/ws/ohlcv";
  const params = new URLSearchParams({
    symbol: sym,
    exchange: exch,
    timeframe,
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
  const [timeframe, setTimeframe] = useState("1h");
  const [ohlcv, setOhlcv] = useState<[number, number, number, number, number, number][]>([]);
  const [ticker, setTicker] = useState<{ last?: number; change_24h?: number; high_24h?: number; low_24h?: number; volume?: number } | null>(null);
  const [orderBook, setOrderBook] = useState<{ bids: [number, number][]; asks: [number, number][] }>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<{ price: number; amount: number; side: string; timestamp?: number }[]>([]);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [quoteFilter, setQuoteFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hizliMiktar, setHizliMiktar] = useState("0.001");
  const [hizliFiyat, setHizliFiyat] = useState("");
  const [emirTipi, setEmirTipi] = useState<"market" | "limit">("market");
  const [hizliGonderiliyor, setHizliGonderiliyor] = useState(false);
  const [hizliMesaj, setHizliMesaj] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const toast = useToast();
  useEffect(() => setToken(getToken()), []);
  useEffect(() => {
    if (ticker?.last != null && !hizliFiyat) setHizliFiyat(String(ticker.last));
  }, [ticker?.last]);

  const hizliEmir = async (side: "buy" | "sell") => {
    if (!token || !hizliMiktar) return;
    if (emirTipi === "limit" && (!hizliFiyat || Number(hizliFiyat) <= 0)) {
      toast.error("Limit emir için fiyat girin.");
      return;
    }
    setHizliMesaj(null);
    setHizliGonderiliyor(true);
    const price = emirTipi === "limit" && hizliFiyat ? Number(hizliFiyat) : null;
    try {
      const res = await fetchAuth("/api/v1/orders/paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          side,
          quantity: hizliMiktar,
          price,
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
    fetch(`${getApiBase()}/api/v1/markets/symbols?exchange=${exchange}`)
      .then((r) => r.json())
      .then((d) => { if (d.symbols) setSymbols(d.symbols.slice(0, 200)); })
      .catch(() => {});
  }, [exchange]);

  const quotes = useMemo(() => {
    const set = new Set<string>();
    symbols.forEach((s) => {
      const i = s.lastIndexOf("/");
      if (i >= 0) set.add(s.slice(i + 1));
    });
    return Array.from(set).sort();
  }, [symbols]);

  const filteredSymbols = useMemo(() => {
    let list = symbols;
    if (quoteFilter) list = list.filter((s) => s.endsWith("/" + quoteFilter));
    if (symbolSearch.trim()) {
      const q = symbolSearch.trim().toUpperCase();
      list = list.filter((s) => s.toUpperCase().includes(q));
    }
    return list;
  }, [symbols, symbolSearch, quoteFilter]);

  const orderTotal = useMemo(() => {
    const q = Number(hizliMiktar);
    const p = emirTipi === "limit" && hizliFiyat ? Number(hizliFiyat) : (ticker?.last ?? 0);
    if (!q || !p) return "";
    return (q * p).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }, [hizliMiktar, hizliFiyat, emirTipi, ticker?.last]);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      fetch(`${getApiBase()}/api/v1/markets/ohlcv?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=100`).then((r) => r.json()),
      fetch(`${getApiBase()}/api/v1/markets/ticker?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()),
      fetch(`${getApiBase()}/api/v1/markets/orderbook?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&limit=20`).then((r) => r.json()),
      fetch(`${getApiBase()}/api/v1/markets/trades?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&limit=30`).then((r) => r.json()),
    ])
      .then(([ohlcvRes, tickerRes, obRes, tradesRes]) => {
        if (ohlcvRes?.candles) setOhlcv(ohlcvRes.candles);
        setTicker(tickerRes);
        if (obRes?.bids && obRes?.asks) setOrderBook({ bids: obRes.bids, asks: obRes.asks });
        if (Array.isArray(tradesRes?.trades)) setTrades(tradesRes.trades);
      })
      .catch((err) => {
        setLoadError("Veri yüklenemedi. Backend çalışıyor mu?");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [symbol, exchange, timeframe]);

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
        ws.onclose = () => { ws = null; reconnectTimer = setTimeout(connect, RECONNECT_MS); };
        ws.onerror = () => { ws?.close(); };
      } catch { /* ignore */ }
    };
    connect();
    return () => { if (reconnectTimer) clearTimeout(reconnectTimer); ws?.close(); };
  }, [symbol, exchange]);

  useEffect(() => {
    if (!symbol || typeof window === "undefined") return;
    const wsUrl = getOhlcvWsUrl(symbol, exchange, timeframe);
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
        ws.onclose = () => { ws = null; reconnectTimer = setTimeout(connect, RECONNECT_MS); };
        ws.onerror = () => { ws?.close(); };
      } catch { /* ignore */ }
    };
    connect();
    return () => { if (reconnectTimer) clearTimeout(reconnectTimer); ws?.close(); };
  }, [symbol, exchange, timeframe]);

  return (
    <div className="min-h-screen bg-zinc-950">
      <AppHeader showBack backHref="/markets" title={symbol} />

      <main className="mx-auto px-3 py-4 max-w-[1920px]">
        {/* Üst: Sembol + Fiyat + 24s özet + Timeframe */}
        <div className="flex flex-wrap items-center gap-4 mb-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{symbol}</h1>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 uppercase">{exchange}</span>
            {ticker && (
              <>
                <span className="text-white font-mono text-lg">
                  {ticker.last != null ? Number(ticker.last).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : "—"}
                </span>
                {ticker.change_24h != null && (
                  <span className={ticker.change_24h >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {ticker.change_24h >= 0 ? "+" : ""}{ticker.change_24h?.toFixed(2)}%
                  </span>
                )}
              </>
            )}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-white text-sm"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
          </div>
          {ticker && (ticker.high_24h != null || ticker.low_24h != null || ticker.volume != null) && (
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              {ticker.high_24h != null && (
                <span>24s Yüksek <span className="text-zinc-300">{Number(ticker.high_24h).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span></span>
              )}
              {ticker.low_24h != null && (
                <span>24s Düşük <span className="text-zinc-300">{Number(ticker.low_24h).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span></span>
              )}
              {ticker.volume != null && (
                <span>24s Hacim <span className="text-zinc-300">{Number(ticker.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
              )}
            </div>
          )}
        </div>

        {/* Ana grid: Sol Order Book | Orta Grafik + Al/Sat | Sağ Token list + Trades */}
        {loadError ? (
          <div className="rounded-xl border border-red-900/50 bg-red-900/10 p-6 text-center text-red-300">
            <p>{loadError}</p>
            <p className="text-sm text-zinc-500 mt-2">Sayfayı yenileyerek tekrar deneyin.</p>
          </div>
        ) : loading ? (
          <div className="h-[480px] rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-500">
            Grafik yükleniyor...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_240px] gap-3">
            {/* Sol: Emir defteri */}
            <div className="order-2 lg:order-1">
              <OrderBook
              bids={orderBook.bids}
              asks={orderBook.asks}
              maxRows={12}
              onPriceClick={(price) => {
                setHizliFiyat(String(price));
                setEmirTipi("limit");
              }}
            />
            </div>

            {/* Orta: Grafik + Grafiğin altında Al/Sat */}
            <div className="order-1 lg:order-2 flex flex-col gap-3">
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <Chart symbol={symbol} data={ohlcv} />
                <div className="flex items-center gap-4 px-3 py-1.5 bg-zinc-900/80 border-t border-zinc-800 text-xs text-zinc-500">
                  <span><span className="inline-block w-2 h-0.5 bg-[#a78bfa] rounded mr-1" /> MA(7)</span>
                  <span><span className="inline-block w-2 h-0.5 bg-[#f59e0b] rounded mr-1" /> MA(20)</span>
                </div>
              </div>
              {/* Al/Sat grafiğin altında */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="text-zinc-400 text-sm font-medium mb-3">Emir</div>
                {token ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={emirTipi}
                      onChange={(e) => setEmirTipi(e.target.value as "market" | "limit")}
                      className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-white text-sm"
                    >
                      <option value="market">Piyasa</option>
                      <option value="limit">Limit</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <label className="text-zinc-500 text-xs">Fiyat</label>
                      <input
                        type="text"
                        value={emirTipi === "limit" ? hizliFiyat : (ticker?.last != null ? String(ticker.last) : "")}
                        onChange={(e) => setHizliFiyat(e.target.value)}
                        placeholder="Fiyat"
                        readOnly={emirTipi === "market"}
                        className="w-28 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-zinc-500 text-xs">Miktar</label>
                      <input
                        type="text"
                        value={hizliMiktar}
                        onChange={(e) => setHizliMiktar(e.target.value)}
                        placeholder="0.001"
                        title="Minimum miktar borsaya göre değişir"
                        className="w-24 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-white text-sm"
                      />
                    </div>
                    {orderTotal && (
                      <div className="flex items-center gap-1">
                        <label className="text-zinc-500 text-xs">Toplam</label>
                        <span className="text-zinc-300 text-sm font-mono px-2 py-1 rounded bg-zinc-800/50">{orderTotal}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => hizliEmir("buy")}
                      disabled={hizliGonderiliyor}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Al
                    </button>
                    <button
                      type="button"
                      onClick={() => hizliEmir("sell")}
                      disabled={hizliGonderiliyor}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Sat
                    </button>
                    {hizliMesaj && <span className="text-zinc-400 text-sm">{hizliMesaj}</span>}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">Emir vermek için giriş yapın.</p>
                )}
              </div>
            </div>

            {/* Sağ: Arama + Diğer tokenler + Market Trades */}
            <div className="order-3 flex flex-col gap-3 min-h-0">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="p-2 border-b border-zinc-800 space-y-2">
                  <input
                    type="text"
                    placeholder="Sembol ara..."
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value)}
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white text-sm placeholder-zinc-500"
                  />
                  <select
                    value={quoteFilter}
                    onChange={(e) => setQuoteFilter(e.target.value)}
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-white text-xs"
                  >
                    <option value="">Tüm pariteler</option>
                    {quotes.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                <div className="text-zinc-400 text-xs px-2 py-1.5 border-b border-zinc-800">Pariteler</div>
                <div className="flex-1 overflow-y-auto max-h-[200px] min-h-[120px]">
                  {filteredSymbols.length === 0 ? (
                    <p className="px-2 py-3 text-zinc-500 text-xs">Eşleşen parite yok</p>
                  ) : (
                    filteredSymbols.map((s) => (
                      <Link
                        key={s}
                        href={`/markets/${encodeURIComponent(s)}?exchange=${exchange}`}
                        className={`block px-2 py-1.5 text-sm border-b border-zinc-800/50 hover:bg-zinc-800/50 ${s === symbol ? "bg-emerald-900/20 text-emerald-400" : "text-zinc-300"}`}
                      >
                        {s}
                      </Link>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="px-2 py-2 border-b border-zinc-800 text-zinc-400 text-sm font-medium">
                  Market Trades
                </div>
                <div className="overflow-y-auto max-h-[220px] text-xs">
                  <table className="w-full">
                    <thead className="text-zinc-500 sticky top-0 bg-zinc-900">
                      <tr>
                        <th className="text-left py-1 px-2">Fiyat</th>
                        <th className="text-right py-1 px-2">Miktar</th>
                        <th className="text-right py-1 px-2">Saat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 px-2 text-center text-zinc-500 text-xs">
                            Henüz işlem yok
                          </td>
                        </tr>
                      ) : (
                        trades.slice(0, 30).map((t, i) => (
                          <tr key={i}>
                            <td className={`py-0.5 px-2 ${t.side === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                              {Number(t.price).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </td>
                            <td className="text-right py-0.5 px-2 text-zinc-400">
                              {Number(t.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                            </td>
                            <td className="text-right py-0.5 px-2 text-zinc-500">
                              {t.timestamp ? new Date(t.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
