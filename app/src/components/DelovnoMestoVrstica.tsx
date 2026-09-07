"use client";

import { useState } from "react";
import { posodobiDelovnoMesto, izbrisiDelovnoMesto } from "@/lib/actions";

type Storitev = { id: string; naziv: string };
type DelovnoMesto = {
  id: string;
  naziv: string;
  storitve: { storitevId: string }[];
};

export function DelovnoMestoVrstica({ mesto, storitve }: { mesto: DelovnoMesto; storitve: Storitev[] }) {
  const [urejam, setUrejam] = useState(false);
  const m = mesto;
  const izbraneStoritve = new Set(m.storitve.map((s) => s.storitevId));

  if (!urejam) {
    return (
      <div
        className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5"
        onDoubleClick={() => setUrejam(true)}
        title="Dvoklik za urejanje"
      >
        <div>
          <div className="text-sm font-medium">{m.naziv}</div>
          <div className="text-xs text-slate-500">
            {storitve.filter((s) => izbraneStoritve.has(s.id)).map((s) => s.naziv).join(", ") || "brez dodeljenih storitev"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="text-xs text-primary-600 hover:underline" onClick={() => setUrejam(true)}>
            Uredi
          </button>
          <form action={izbrisiDelovnoMesto.bind(null, m.id)}>
            <button className="text-xs text-red-600 hover:underline">Izbriši</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form action={posodobiDelovnoMesto.bind(null, m.id)} className="rounded-lg border border-slate-200 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <input name="naziv" required defaultValue={m.naziv} className="input py-1 text-sm font-medium" />
        <div className="flex shrink-0 items-center gap-2">
          <button type="submit" className="btn-secondary py-0.5 text-xs">
            Shrani
          </button>
          <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setUrejam(false)}>
            Prekliči
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {storitve.map((s) => (
          <label key={s.id} className="flex items-center gap-1 text-xs text-slate-600">
            <input type="checkbox" name="storitveIds" value={s.id} defaultChecked={izbraneStoritve.has(s.id)} />
            {s.naziv}
          </label>
        ))}
      </div>
    </form>
  );
}
