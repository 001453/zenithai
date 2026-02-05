"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getToken, clearToken } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Kontrol Paneli" },
  { href: "/markets", label: "Piyasalar" },
  { href: "/strategies", label: "Stratejiler" },
  { href: "/emirler", label: "Emirler" },
  { href: "/backtest", label: "Backtest" },
  { href: "/ml", label: "ML Modeller" },
  { href: "/risk", label: "Risk" },
];

type AppHeaderProps = {
  showBack?: boolean;
  backHref?: string;
  title?: string;
};

export default function AppHeader({ showBack = false, backHref = "/", title }: AppHeaderProps) {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => setToken(getToken()), []);

  return (
    <header className="border-b border-zinc-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        {showBack && (
          <Link href={backHref} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        <Link href="/" className="text-xl font-semibold text-emerald-400 hover:text-emerald-300">
          Zenithai
        </Link>
        {title && <span className="text-zinc-500">/ {title}</span>}
        <nav className="flex flex-wrap gap-4 ml-6">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? "text-white" : "text-zinc-400 hover:text-white"}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          {token ? (
            <button
              type="button"
              onClick={() => {
                clearToken();
                window.location.href = "/";
              }}
              className="text-zinc-400 hover:text-white text-sm"
            >
              Çıkış
            </button>
          ) : (
            <Link href="/giris" className="text-zinc-400 hover:text-white text-sm">
              Giriş
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
