"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

/**
 * Token yoksa /giris sayfasına yönlendirir.
 * Korumalı sayfalarda (dashboard, strategies, emirler, backtest, ml, risk) kullanın.
 * @returns { token: string | null, yuklendi: boolean } - token yoksa null, yönlendirme yapılıyorsa yuklendi true
 */
export function useRequireAuth(): { token: string | null; yuklendi: boolean } {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    const t = getToken();
    setToken(t);
    setYuklendi(true);
    if (!t) {
      router.replace("/giris");
    }
  }, [router]);

  return { token, yuklendi };
}
