"use client";

import { useState } from "react";
import { posodobiZaposlenega, izbrisiZaposlenega } from "@/lib/actions";

type Lokacija = { id: string; naziv: string };
type Storitev = { id: string; naziv: string };
type Zaposleni = {
  id: string;
  ime: string;
  priimek: string;
  email: string | null;
  telefon: string | null;
  lokacije: { lokacija: Lokacija }[];
  storitve: { storitev: Storitev }[];
};

export function ZaposleniVrstica({
  zaposleni,
  lokacije,
  storitve,
}: {
  zaposleni: Zaposleni;
  lokacije: Lokacija[];
  storitve: Storitev[];
}) {
  const [urejam, setUrejam] = useState(false);
  const z = zaposleni;

  if (!urejam) {
    return (
      <div
        className="card flex items-center justify-between"
        onDoubleClick={() => setUrejam(true)}
        title="Dvoklik za urejanje"
      >
        <div>
          <div className="font-medium">
            {z.ime} {z.priimek}
          </div>
          <div className="text-sm text-slate-500">
            {z.email} {z.telefon && `· ${z.telefon}`}
          </div>
          <div className="text-sm text-slate-500">
            Lokacije: {z.lokacije.map((l) => l.lokacija.naziv).join(", ") || "—"}
          </div>
          <div className="text-sm text-slate-500">
            Storitve: {z.storitve.map((s) => s.storitev.naziv).join(", ") || "—"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" className="text-sm text-primary-600 hover:underline" onClick={() => setUrejam(true)}>
            Uredi
          </button>
          <form action={izbrisiZaposlenega.bind(null, z.id)}>
            <button className="text-sm text-red-600 hover:underline">Izbriši</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form action={posodobiZaposlenega.bind(null, z.id)} className="card space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Ime *</label>
          <input name="ime" required defaultValue={z.ime} className="input" />
        </div>
        <div>
          <label className="label">Priimek *</label>
          <input name="priimek" required defaultValue={z.priimek} className="input" />
        </div>
      </div>
      <div>
        <label className="label">E-pošta</label>
        <input name="email" type="email" defaultValue={z.email ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Telefon</label>
        <input name="telefon" defaultValue={z.telefon ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Lokacija</label>
        <select name="lokacijaId" defaultValue={z.lokacije[0]?.lokacija.id ?? ""} className="input">
          <option value="">-- brez --</option>
          {lokacije.map((l) => (
            <option key={l.id} value={l.id}>
              {l.naziv}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Storitve, ki jih izvaja</label>
        <div className="space-y-1">
          {storitve.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="storitveIds"
                value={s.id}
                defaultChecked={z.storitve.some((zs) => zs.storitev.id === s.id)}
              />
              {s.naziv}
            </label>
          ))}
        </div>
      </div>
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
