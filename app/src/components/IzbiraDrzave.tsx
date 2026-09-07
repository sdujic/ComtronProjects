"use client";

import { useEffect, useRef, useState } from "react";
import { DRZAVE, type Drzava } from "@/lib/drzave";

// Zastavica prek "flag-icons" paketa (SVG slike, CSS uvožen v globals.css) -
// NE prek Unicode emoji ("regional indicator" znakov): Windows (tudi
// Windows 11) glede na privzete pisave (Segoe UI Emoji) zastavic ne izriše
// kot slike, ampak pokaže samo dve črki kode države - to je bilo dejansko
// opaženo pri naročnikovem testiranju (7.9.2026), ne le teoretična skrb.
function Zastava({ id }: { id: string }) {
  return <span className={`fi fi-${id.toLowerCase()}`} />;
}

// Izbira klicne kode države pri vnosu telefonske številke - naročnikova
// zahteva (7.9.2026), po zgledu priloženega zaslonskega posnetka (zastava +
// klicna koda + puščica, klik odpre iskalni seznam vseh držav).
export function IzbiraDrzave({ izbrana, onIzberi }: { izbrana: Drzava; onIzberi: (d: Drzava) => void }) {
  const [odprto, setOdprto] = useState(false);
  const [iskanje, setIskanje] = useState("");
  const vsebnikRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function naZunanjiKlik(e: MouseEvent) {
      if (vsebnikRef.current && !vsebnikRef.current.contains(e.target as Node)) {
        setOdprto(false);
        setIskanje("");
      }
    }
    document.addEventListener("mousedown", naZunanjiKlik);
    return () => document.removeEventListener("mousedown", naZunanjiKlik);
  }, []);

  const iskanjeMalo = iskanje.trim().toLowerCase();
  const filtrirane = iskanjeMalo
    ? DRZAVE.filter((d) => d.naziv.toLowerCase().includes(iskanjeMalo) || d.klicnaStevilka.includes(iskanjeMalo))
    : DRZAVE;

  return (
    <div ref={vsebnikRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOdprto((o) => !o)}
        className="flex h-full items-center gap-1.5 border-r border-slate-300 bg-slate-50 px-2.5 text-sm hover:bg-slate-100"
      >
        <Zastava id={izbrana.id} />
        <span>{izbrana.klicnaStevilka}</span>
        <span className="text-xs text-slate-400">▾</span>
      </button>
      {odprto && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
          <input
            autoFocus
            value={iskanje}
            onChange={(e) => setIskanje(e.target.value)}
            placeholder="Išči državo ..."
            className="input m-1.5 w-[calc(100%-12px)] text-sm"
          />
          <div className="max-h-56 overflow-y-auto">
            {filtrirane.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onIzberi(d);
                  setOdprto(false);
                  setIskanje("");
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                <Zastava id={d.id} />
                <span className="flex-1 truncate">{d.naziv}</span>
                <span className="text-slate-400">{d.klicnaStevilka}</span>
              </button>
            ))}
            {filtrirane.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">Ni zadetkov.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
