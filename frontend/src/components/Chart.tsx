"use client";

import { useEffect, useRef } from "react";

type Candle = [number, number, number, number, number, number]; // time, o, h, l, c, vol

export default function Chart({
  symbol,
  data,
}: {
  symbol: string;
  data: Candle[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    const init = async () => {
      const { createChart } = await import("lightweight-charts");
      const chart = createChart(containerRef.current!, {
        layout: { background: { color: "#18181b" }, textColor: "#a1a1aa" },
        grid: { vertLines: { color: "#27272a" }, horzLines: { color: "#27272a" } },
        width: containerRef.current!.clientWidth,
        height: 400,
        timeScale: { timeVisible: true, secondsVisible: false },
        rightPriceScale: { borderColor: "#27272a" },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
      });

      const seriesData = data.map(([time, o, h, l, c]) => ({
        time: Math.floor(time / 1000) as unknown as string,
        open: o,
        high: h,
        low: l,
        close: c,
      }));
      candleSeries.setData(seriesData);
      chart.timeScale().fitContent();

      const resize = () => {
        if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
      };
      window.addEventListener("resize", resize);
      return () => {
        window.removeEventListener("resize", resize);
        chart.remove();
      };
    };

    let cleanup: (() => void) | void;
    init().then((c) => { cleanup = c; });
    return () => { cleanup?.(); };
  }, [symbol, data]);

  return <div ref={containerRef} className="w-full h-[400px]" />;
}
