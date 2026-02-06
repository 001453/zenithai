"use client";

import { useEffect, useRef } from "react";

type Candle = [number, number, number, number, number, number]; // time, o, h, l, c, vol

function sma(closes: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += closes[i - j];
      result.push(sum / period);
    }
  }
  return result;
}

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
        height: 450,
        timeScale: { timeVisible: true, secondsVisible: false },
        rightPriceScale: { borderColor: "#27272a" },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
      });

      const times = data.map(([t]) => Math.floor(t / 1000) as unknown as string);
      const opens = data.map(([, o]) => o);
      const highs = data.map(([, , h]) => h);
      const lows = data.map(([, , , l]) => l);
      const closes = data.map(([, , , , c]) => c);
      const vols = data.map(([, , , , , v]) => v ?? 0);

      const seriesData = data.map(([time, o, h, l, c], i) => ({
        time: times[i],
        open: o,
        high: h,
        low: l,
        close: c,
      }));
      candleSeries.setData(seriesData);

      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceScaleId: "",
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
      });
      const volumeData = data.map(([time], i) => ({
        time: times[i],
        value: vols[i],
        color: closes[i] >= opens[i] ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
      }));
      volumeSeries.setData(volumeData);

      const ma7 = sma(closes, 7);
      const ma20 = sma(closes, 20);
      const ma7Series = chart.addLineSeries({ color: "#a78bfa", lineWidth: 2 });
      const ma20Series = chart.addLineSeries({ color: "#f59e0b", lineWidth: 2 });
      ma7Series.setData(
        times.map((t, i) => ({ time: t, value: ma7[i] })).filter((d) => !Number.isNaN(d.value))
      );
      ma20Series.setData(
        times.map((t, i) => ({ time: t, value: ma20[i] })).filter((d) => !Number.isNaN(d.value))
      );

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

  return <div ref={containerRef} className="w-full h-[450px]" />;
}
