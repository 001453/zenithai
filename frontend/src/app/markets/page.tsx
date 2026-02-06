"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

const DEFAULT_SYMBOL = "BTC/USDT";

export default function MarketsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/markets/${encodeURIComponent(DEFAULT_SYMBOL)}?exchange=binance`);
  }, [router]);

  return (
    <div className="min-h-screen">
      <AppHeader title="Piyasalar" />
      <main className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-center min-h-[40vh]">
        <p className="text-zinc-500">Yönlendiriliyor…</p>
      </main>
    </div>
  );
}
