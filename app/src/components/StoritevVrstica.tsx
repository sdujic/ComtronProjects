"use client";

import { useState } from "react";
import { posodobiStoritev, izbrisiStoritev } from "@/lib/actions";

type Kategorija = { id: string; naziv: string };
type Storitev = {
  id: string;
  naziv: string;
  opis: string | null;
  trajanjeMin: number;
  cena: number;
  kategorijaId: string | null;
  ercSifraArtikla: string | null;
  vidnaNaSpletu: boolean;
};

export function StoritevVrstica({ storitev, kategorije }: { storitev: Storitev; kategorije: Kategorija[] }) {
  const [urejam, setUrejam] = useState(false);
  const s = storitev;

  if (!urejam) {
    return (
      <div className="card flex items-center justify-between" onDoubleClick={() => setUrejam(true)} title="Dvoklik za urejanje">
        <div>
          <div className="font-medium">{s.naziv}</div>
          <div className="text-sm text-slate-500">
            {kategorije.find((k) => k.id === s.kategorijaId)?.naziv} · {s.trajanjeMin} min · {s.cena.toFixed(2)} €
            {s.ercSifraArtikla && ` · ERP šifra: ${s.ercSifraArtikla}`}
            {!s.vidnaNaSpletu && " · skrita na spletu"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" className="text-sm text-primary-600 hover:underline" onClick={() => setUrejam(true)}>
            Uredi
          </button>
          <form action={izbrisiStoritev.bind(null, s.id)}>
            <button className="text-sm text-red-600 hover:underline">Izbriši</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form action={posodobiStoritev.bind(null, s.id)} className="card space-y-3">
      <div>
        <label className="label">Naziv *</label>
        <input name="naziv" required defaultValue={s.naziv} className="input" />
      </div>
      <div>
        <label className="label">Opis</label>
        <textarea name="opis" defaultValue={s.opis ?? ""} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Trajanje (min) *</label>
          <input name="trajanjeMin" type="number" min={1} step={1} required defaultValue={s.trajanjeMin} className="input" />
        </div>
        <div>
          <label className="label">Cena (€) *</label>
          <input name="cena" type="number" min={0} step="0.01" required defaultValue={s.cena} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Kategorija</label>
        <select name="kategorijaId" defaultValue={s.kategorijaId ?? ""} className="input">
          <option value="">-- brez --</option>
          {kategorije.map((k) => (
            <option key={k.id} value={k.id}>
              {k.naziv}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">ERP šifra artikla</label>
        <input name="ercSifraArtikla" defaultValue={s.ercSifraArtikla ?? ""} className="input" placeholder="za povezavo s TRONxERP" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="vidnaNaSpletu" defaultChecked={s.vidnaNaSpletu} />
        Vidna na spletnem obrazcu
      </label>
      <div className="flex gap-3">
        <button type="submit" className="btn">
          Shrani
        </button>
        <button type="button" className="btn-secondary" onClick={() => setUrejam(false)}>
          Prekliči
        </button>
      </div>
    </form>
  );
}
