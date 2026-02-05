"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { fetchAuth } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type RiskLimit = {
  id: number;
  strateji_id: number | null;
  maksimum_pozisyon: string | null;
  gunluk_zarar_limiti: string | null;
};

export default function RiskPage() {
  const [limitler, setLimitler] = useState<RiskLimit[]>([]);
  const [strategies, setStrategies] = useState<{ id: number; name: string }[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [form, setForm] = useState({
    strategy_id: "" as number | "",
    max_position_size: "",
    daily_loss_limit: "",
  });
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [duzenlenenId, setDuzenlenenId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ strategy_id: "" as number | "", max_position_size: "", daily_loss_limit: "" });

  const { token, yuklendi } = useRequireAuth();

  const yukle = () => {
    if (!token) return;
    Promise.all([
      fetchAuth("/api/v1/risk").then((r) => r.json()),
      fetchAuth("/api/v1/strategies").then((r) => r.json()),
    ])
      .then(([riskRes, stratRes]) => {
        setLimitler(riskRes.limitler || []);
        setStrategies(stratRes.strategies || []);
      })
      .catch(() => setHata("API bağlantı hatası."))
      .finally(() => setYukleniyor(false));
  };

  useEffect(() => { if (token) yukle(); }, [token]);

  const ekle = async (e: React.FormEvent) => {
    e.preventDefault();
    setGonderiliyor(true);
    try {
      const res = await fetchAuth("/api/v1/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_id: form.strategy_id === "" ? null : form.strategy_id,
          max_position_size: form.max_position_size ? form.max_position_size : null,
          daily_loss_limit: form.daily_loss_limit ? form.daily_loss_limit : null,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setLimitler((prev) => [
          ...prev,
          {
            id: data.id,
            strateji_id: form.strategy_id === "" ? null : form.strategy_id,
            maksimum_pozisyon: form.max_position_size || null,
            gunluk_zarar_limiti: form.daily_loss_limit || null,
          },
        ]);
        setForm({ strategy_id: "", max_position_size: "", daily_loss_limit: "" });
      }
    } catch {
      // ignore
    }
    setGonderiliyor(false);
  };

  const strategyName = (id: number | null) => {
    if (id == null) return "Tümü";
    const s = strategies.find((x) => x.id === id);
    return s ? s.name : `#${id}`;
  };

  const duzenlemeyeAl = (r: RiskLimit) => {
    setDuzenlenenId(r.id);
    setEditForm({
      strategy_id: r.strateji_id ?? "",
      max_position_size: r.maksimum_pozisyon ?? "",
      daily_loss_limit: r.gunluk_zarar_limiti ?? "",
    });
  };

  const guncelle = async () => {
    if (duzenlenenId == null) return;
    setGonderiliyor(true);
    try {
      const res = await fetchAuth(`/api/v1/risk/${duzenlenenId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_id: editForm.strategy_id === "" ? null : editForm.strategy_id,
          max_position_size: editForm.max_position_size || null,
          daily_loss_limit: editForm.daily_loss_limit || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setLimitler((prev) =>
          prev.map((x) =>
            x.id === duzenlenenId
              ? {
                  ...x,
                  strateji_id: data.strateji_id ?? x.strateji_id,
                  maksimum_pozisyon: data.maksimum_pozisyon ?? x.maksimum_pozisyon,
                  gunluk_zarar_limiti: data.gunluk_zarar_limiti ?? x.gunluk_zarar_limiti,
                }
              : x
          )
        );
        setDuzenlenenId(null);
      }
    } catch {
      // ignore
    }
    setGonderiliyor(false);
  };

  const sil = async (id: number) => {
    if (!confirm("Bu risk limitini silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetchAuth(`/api/v1/risk/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setLimitler((prev) => prev.filter((x) => x.id !== id));
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader title="Risk" />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Risk Limitleri</h1>
        {hata && (
          <div className="rounded-lg bg-amber-900/20 border border-amber-700 text-amber-200 px-4 py-3 mb-6">
            {hata} <Link href="/giris" className="underline">Giriş sayfasına git</Link>
          </div>
        )}

        {token && (
          <form onSubmit={ekle} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 mb-8">
            <h2 className="text-lg font-medium text-white mb-4">Yeni risk limiti</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Strateji (opsiyonel)</label>
                <select
                  value={form.strategy_id === "" ? "" : form.strategy_id}
                  onChange={(e) => setForm((f) => ({ ...f, strategy_id: e.target.value === "" ? "" : Number(e.target.value) }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  <option value="">Tüm stratejiler</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Maks. pozisyon büyüklüğü</label>
                <input
                  type="text"
                  placeholder="örn. 1.5"
                  value={form.max_position_size}
                  onChange={(e) => setForm((f) => ({ ...f, max_position_size: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Günlük zarar limiti</label>
                <input
                  type="text"
                  placeholder="örn. 500"
                  value={form.daily_loss_limit}
                  onChange={(e) => setForm((f) => ({ ...f, daily_loss_limit: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={gonderiliyor}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {gonderiliyor ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <h2 className="text-lg font-medium text-white p-4 border-b border-zinc-800">Kayıtlı limitler</h2>
          {yukleniyor ? (
            <p className="text-zinc-500 p-6">Yükleniyor...</p>
          ) : limitler.length === 0 ? (
            <p className="text-zinc-500 p-6">Henüz risk limiti yok. Yukarıdan ekleyebilirsiniz.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                    <th className="p-4">Strateji</th>
                    <th className="p-4">Maks. pozisyon</th>
                    <th className="p-4">Günlük zarar limiti</th>
                    <th className="p-4">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {limitler.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-800/80">
                      {duzenlenenId === r.id ? (
                        <>
                          <td className="p-4">
                            <select
                              value={editForm.strategy_id === "" ? "" : editForm.strategy_id}
                              onChange={(e) => setEditForm((f) => ({ ...f, strategy_id: e.target.value === "" ? "" : Number(e.target.value) }))}
                              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm"
                            >
                              <option value="">Tümü</option>
                              {strategies.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-4">
                            <input
                              type="text"
                              value={editForm.max_position_size}
                              onChange={(e) => setEditForm((f) => ({ ...f, max_position_size: e.target.value }))}
                              className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm"
                            />
                          </td>
                          <td className="p-4">
                            <input
                              type="text"
                              value={editForm.daily_loss_limit}
                              onChange={(e) => setEditForm((f) => ({ ...f, daily_loss_limit: e.target.value }))}
                              className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm"
                            />
                          </td>
                          <td className="p-4">
                            <button type="button" onClick={guncelle} disabled={gonderiliyor} className="rounded px-2 py-1 text-sm bg-emerald-600 text-white mr-2 disabled:opacity-50">Kaydet</button>
                            <button type="button" onClick={() => setDuzenlenenId(null)} className="rounded px-2 py-1 text-sm border border-zinc-600 text-zinc-300">İptal</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4 text-white">{strategyName(r.strateji_id)}</td>
                          <td className="p-4 text-zinc-300">{r.maksimum_pozisyon ?? "—"}</td>
                          <td className="p-4 text-zinc-300">{r.gunluk_zarar_limiti ?? "—"}</td>
                          <td className="p-4">
                            <button type="button" onClick={() => duzenlemeyeAl(r)} className="rounded px-2 py-1 text-sm border border-zinc-600 text-zinc-300 hover:bg-zinc-700 mr-2">Düzenle</button>
                            <button type="button" onClick={() => sil(r.id)} className="rounded px-2 py-1 text-sm border border-red-800 text-red-400 hover:bg-red-900/30">Sil</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
