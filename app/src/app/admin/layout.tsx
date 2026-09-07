import { AdminNav } from "@/components/AdminNav";
import { IkonaLokacije, IkonaUporabnik } from "@/components/icons";
import { TronXerpLogotip } from "@/components/TronXerpLogotip";
import { ObvestilaZvonec } from "@/components/ObvestilaZvonec";
import { prisma } from "@/lib/prisma";
import { pridobiNastavitve } from "@/lib/nastavitve";
import { odjavaAdmin } from "@/lib/admin-auth-actions";

// Prijava/odjava: middleware.ts ščiti vse /admin poti (glej tudi
// src/lib/admin-seja.ts) - en sam admin uporabnik iz .env, enostavna
// rešitev za MVP (glej .env.example za pojasnilo omejitev).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [lokacija, nastavitve] = await Promise.all([
    prisma.lokacija.findFirst({ where: { aktivna: true } }),
    pridobiNastavitve(),
  ]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-4 py-5">
          <span className="text-lg font-bold text-primary-500">{nastavitve.imeAplikacije}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <AdminNav />
        </div>
        <div className="space-y-2 border-t border-slate-100 px-4 py-4">
          <div className="text-xs text-slate-400">{nastavitve.imeAplikacije} · Admin</div>
          <TronXerpLogotip />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="text-base font-semibold text-ink">{nastavitve.imeAplikacije}</div>
          <div className="flex items-center gap-4">
            {lokacija && (
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
                <IkonaLokacije className="h-4 w-4 text-slate-400" />
                {lokacija.naziv}
              </div>
            )}
            <ObvestilaZvonec />
            <form action={odjavaAdmin}>
              <button
                type="submit"
                title="Odjava"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-500 hover:bg-primary-100"
              >
                <IkonaUporabnik className="h-5 w-5" />
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
