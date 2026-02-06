"use client";

type Row = [price: number, amount: number];

export default function OrderBook({
  bids,
  asks,
  maxRows = 10,
}: {
  bids: Row[];
  asks: Row[];
  maxRows?: number;
}) {
  const askRows = asks.slice(0, maxRows).reverse();
  const bidRows = bids.slice(0, maxRows);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-800 text-zinc-400 text-sm font-medium">
        Emir defteri
      </div>
      <div className="grid grid-cols-3 gap-1 px-2 py-1 text-zinc-500 text-xs border-b border-zinc-800">
        <span>Fiyat</span>
        <span className="text-right">Miktar</span>
        <span className="text-right">Toplam</span>
      </div>
      <div className="max-h-[240px] overflow-y-auto">
        {askRows.map(([price, amount], i) => (
          <div
            key={`ask-${i}`}
            className="grid grid-cols-3 gap-1 px-2 py-0.5 text-xs text-red-400"
          >
            <span>{Number(price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-right text-zinc-400">{Number(amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
            <span className="text-right text-zinc-500">{(price * amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        ))}
        {bidRows.map(([price, amount], i) => (
          <div
            key={`bid-${i}`}
            className="grid grid-cols-3 gap-1 px-2 py-0.5 text-xs text-emerald-400"
          >
            <span>{Number(price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-right text-zinc-400">{Number(amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
            <span className="text-right text-zinc-500">{(price * amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
