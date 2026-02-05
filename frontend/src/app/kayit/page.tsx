"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setToken, getToken } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

export default function KayitPage() {
  const router = useRouter();
  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);
  const [kullanici, setKullanici] = useState("");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const kayit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    setYukleniyor(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "/api/backend";
      const res = await fetch(`${api}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: kullanici,
          email,
          password: sifre,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHata(data.detail || "Kayıt başarısız.");
        return;
      }
      setToken(data.access_token);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setHata("Bağlantı hatası.");
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <AppHeader title="Kayıt" />
      <div className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="text-center mb-6">
          <Link href="/" className="text-xl font-semibold text-emerald-400">
            Zenithai
          </Link>
          <h1 className="text-lg font-medium text-white mt-4">Kayıt ol</h1>
        </div>
        <form onSubmit={kayit} className="space-y-4">
          {hata && (
            <div className="rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm px-3 py-2">
              {hata}
            </div>
          )}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Kullanıcı adı</label>
            <input
              type="text"
              value={kullanici}
              onChange={(e) => setKullanici(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Şifre</label>
            <input
              type="password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full rounded-lg bg-emerald-600 py-2 text-white font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {yukleniyor ? "Kaydediliyor..." : "Kayıt ol"}
          </button>
        </form>
        <p className="text-center text-zinc-500 text-sm mt-4">
          Zaten hesabınız var mı?{" "}
          <Link href="/giris" className="text-emerald-400 hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
