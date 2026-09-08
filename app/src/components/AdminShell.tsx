"use client";

import { useState } from "react";
import { AdminNav } from "@/components/AdminNav";
import { IkonaLokacije, IkonaUporabnik } from "@/components/icons";
import { TronXerpLogotip } from "@/components/TronXerpLogotip";
import { ObvestilaZvonec } from "@/components/ObvestilaZvonec";
import { odjavaAdmin } from "@/lib/admin-auth-actions";

// Stranska navigacija je na ozkih zaslonih (telefon/tablica) skrita za
// "hamburger" gumbom namesto stalno vidne (bila je fiksne širine 256px, kar
// je na mobilnem vzelo vecino zaslona) - naročnikova zahteva 8.9.2026,
// responsive dizajn admin dela. Na širokih zaslonih (lg+) ostane vedno
// vidna, obnašanje nespremenjeno.
export function AdminShell({
  imeAplikacije,
  lokacijaNaziv,
  children,
}: {
  imeAplikacije: string;
  lokacijaNaziv: string | null;
  children: React.ReactNode;
}) {
  const [odprtMeni, setOdprtMeni] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {odprtMeni && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOdprtMeni(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          odprtMeni ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <span className="text-lg font-bold text-primary-500">{imeAplikacije}</span>
          <button
            type="button"
            onClick={() => setOdprtMeni(false)}
            className="rounded-lg p-1 text-xl leading-none text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Zapri meni"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3" onClick={() => setOdprtMeni(false)}>
          <AdminNav />
        </div>
        <div className="space-y-2 border-t border-slate-100 px-4 py-4">
          <div className="text-xs text-slate-400">{imeAplikacije} · Admin</div>
          <TronXerpLogotip />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setOdprtMeni(true)}
              className="shrink-0 rounded-lg p-2 text-xl leading-none text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Odpri meni"
            >
              ☰
            </button>
            <div className="truncate text-base font-semibold text-ink">{imeAplikacije}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
            {lokacijaNaziv && (
              <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 md:flex">
                <IkonaLokacije className="h-4 w-4 text-slate-400" />
                {lokacijaNaziv}
              </div>
            )}
            <a
              href="/rezervacija"
              target="_blank"
              rel="noreferrer"
              title="Stran za naročanje (stranke)"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 sm:px-3 sm:text-sm"
            >
              <span className="hidden sm:inline">Stran za naročanje (stranke) ↗</span>
              <span className="sm:hidden">Naročanje ↗</span>
            </a>
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
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
