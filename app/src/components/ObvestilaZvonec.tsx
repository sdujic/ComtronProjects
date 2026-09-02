"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IkonaZvonec } from "@/components/icons";
import { lokalniDatumString } from "@/lib/datum";

type Obvestilo = { id: string; datumOd: string; stranka: string; storitve: string };

const OSVEZEVANJE_MS = 30000;

// Zvonec z obvestili v glavi admina - naročnikova zahteva (2.9.2026), po
// zgledu TRONxERP: značka s številom (tu: nepotrjene spletne rezervacije,
// status V_POTRJEVANJU) in klik na posamezno obvestilo odpre dnevni pogled
// koledarja za ta termin.
export function ObvestilaZvonec() {
  const [stevilo, setStevilo] = useState(0);
  const [termini, setTermini] = useState<Obvestilo[]>([]);
  const [odprto, setOdprto] = useState(false);
  const vsebnikRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let odstranjeno = false;
    async function osvezi() {
      try {
        const res = await fetch("/api/admin/nepotrjeni");
        if (odstranjeno || !res.ok) return;
        const data = await res.json();
        setStevilo(data.stevilo);
        setTermini(data.termini);
      } catch {
        // Tiho preskoči - naslednje osveževanje bo poskusilo znova.
      }
    }
    osvezi();
    const interval = setInterval(osvezi, OSVEZEVANJE_MS);
    return () => {
      odstranjeno = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function naZunanjiKlik(e: MouseEvent) {
      if (vsebnikRef.current && !vsebnikRef.current.contains(e.target as Node)) setOdprto(false);
    }
    document.addEventListener("mousedown", naZunanjiKlik);
    return () => document.removeEventListener("mousedown", naZunanjiKlik);
  }, []);

  return (
    <div ref={vsebnikRef} className="relative">
      <button
        onClick={() => setOdprto((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
        aria-label="Obvestila"
      >
        <IkonaZvonec className="h-5 w-5" />
        {stevilo > 0 && (
          <span className="zvonec-znacka absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {stevilo > 9 ? "9+" : stevilo}
          </span>
        )}
      </button>

      {odprto && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-medium">
            Nepotrjene rezervacije{stevilo > 0 && ` (${stevilo})`}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {termini.map((t) => (
              <Link
                key={t.id}
                href={`/admin/koledar?pogled=dan&datum=${lokalniDatumString(new Date(t.datumOd))}`}
                onClick={() => setOdprto(false)}
                className="block border-b border-slate-50 px-4 py-2.5 text-sm hover:bg-slate-50 last:border-0"
              >
                <div className="font-medium">{t.stranka}</div>
                <div className="text-xs text-slate-500">
                  {new Date(t.datumOd).toLocaleString("sl-SI", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {t.storitve}
                </div>
              </Link>
            ))}
            {termini.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">Ni nepotrjenih rezervacij.</div>
            )}
          </div>
          {stevilo > termini.length && (
            <div className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-400">
              +{stevilo - termini.length} več - glej koledar
            </div>
          )}
        </div>
      )}
    </div>
  );
}
