"use client";

import { useState } from "react";
import { posodobiStranko } from "@/lib/actions";

type Stranka = {
  id: string;
  ime: string;
  priimek: string;
  email: string | null;
  telefon: string;
  ercPartnerId: string | null;
};

export function StrankaGlava({ stranka }: { stranka: Stranka }) {
  const [urejam, setUrejam] = useState(false);
  const s = stranka;

  if (urejam) {
    return (
      <form action={posodobiStranko.bind(null, s.id)} className="card space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ime *</label>
            <input name="ime" required defaultValue={s.ime} className="input" />
          </div>
          <div>
            <label className="label">Priimek *</label>
            <input name="priimek" required defaultValue={s.priimek} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Telefon *</label>
          <input name="telefon" required defaultValue={s.telefon} className="input" />
        </div>
        <div>
          <label className="label">E-pošta</label>
          <input name="email" type="email" defaultValue={s.email ?? ""} className="input" />
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

  return (
    <div onDoubleClick={() => setUrejam(true)} title="Dvoklik za urejanje">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">
          {s.ime} {s.priimek}
        </h1>
        <button type="button" className="text-sm text-primary-600 hover:underline" onClick={() => setUrejam(true)}>
          Uredi
        </button>
      </div>
      <p className="text-sm text-slate-500">
        {s.telefon} {s.email && `· ${s.email}`}
      </p>
      {s.ercPartnerId && <p className="text-sm text-slate-400">TRONxERP partner ID: {s.ercPartnerId}</p>}
    </div>
  );
}
