"use client";

import { useState } from "react";
import { ustvariUrnik } from "@/lib/actions";
import { odsteviMinut } from "@/lib/cas";

type Zaposleni = { id: string; ime: string; priimek: string };
type Lokacija = { id: string; naziv: string };

const DNEVI = [
  { vrednost: 1, naziv: "Ponedeljek" },
  { vrednost: 2, naziv: "Torek" },
  { vrednost: 3, naziv: "Sreda" },
  { vrednost: 4, naziv: "Četrtek" },
  { vrednost: 5, naziv: "Petek" },
  { vrednost: 6, naziv: "Sobota" },
  { vrednost: 7, naziv: "Nedelja" },
];

export function UrnikObrazec({ zaposleni, lokacije }: { zaposleni: Zaposleni[]; lokacije: Lokacija[] }) {
  const [delovniCasOd, setDelovniCasOd] = useState("08:00");
  const [delovniCasDo, setDelovniCasDo] = useState("16:00");
  const [casRezervacijOd, setCasRezervacijOd] = useState("08:00");
  const [casRezervacijDo, setCasRezervacijDo] = useState("15:30");

  // Čas za rezervacije se ob spremembi delovnega časa samodejno uskladi
  // (do-uro s privzetim 30-min zamikom pred koncem) - admin ga lahko po tem
  // še vedno ročno zoži, a se s tem izogne pozabljeni "osiroteli" stari
  // vrednosti, ki bi bila širša od (novega, krajšega) delovnega časa.
  function spremeniDelovniCasOd(v: string) {
    setDelovniCasOd(v);
    setCasRezervacijOd(v);
  }
  function spremeniDelovniCasDo(v: string) {
    setDelovniCasDo(v);
    setCasRezervacijDo(odsteviMinut(v, 30) < delovniCasOd ? v : odsteviMinut(v, 30));
  }

  const znotrajDelovnegaCasa =
    casRezervacijOd >= delovniCasOd && casRezervacijDo <= delovniCasDo && casRezervacijOd < casRezervacijDo;

  return (
    <form action={ustvariUrnik} className="card space-y-3">
      <h2 className="font-medium">Dodaj urnik</h2>
      <div>
        <label className="label">Zaposleni *</label>
        <select name="zaposleniId" required className="input">
          {zaposleni.map((z) => (
            <option key={z.id} value={z.id}>
              {z.ime} {z.priimek}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Lokacija *</label>
        <select name="lokacijaId" required className="input">
          {lokacije.map((l) => (
            <option key={l.id} value={l.id}>
              {l.naziv}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Dan *</label>
        <select name="dan" required className="input">
          {DNEVI.map((d) => (
            <option key={d.vrednost} value={d.vrednost}>
              {d.naziv}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Delovni čas od *</label>
          <input
            type="time"
            name="delovniCasOd"
            required
            className="input"
            value={delovniCasOd}
            onChange={(e) => spremeniDelovniCasOd(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Delovni čas do *</label>
          <input
            type="time"
            name="delovniCasDo"
            required
            className="input"
            value={delovniCasDo}
            onChange={(e) => spremeniDelovniCasDo(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Čas za rezervacije od *</label>
          <input
            type="time"
            name="casRezervacijOd"
            required
            className="input"
            value={casRezervacijOd}
            onChange={(e) => setCasRezervacijOd(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Čas za rezervacije do *</label>
          <input
            type="time"
            name="casRezervacijDo"
            required
            className="input"
            value={casRezervacijDo}
            onChange={(e) => setCasRezervacijDo(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        "Delovni čas" je informativen; za dejansko razpoložljivost terminov šteje "čas za rezervacije" (lahko je ožji,
        npr. če si zaposleni zadnjih 30 min pusti za administrativno delo) - MORA biti znotraj delovnega časa.
      </p>
      {!znotrajDelovnegaCasa && (
        <p className="text-xs font-medium text-red-600">
          Čas za rezervacije mora biti znotraj delovnega časa (in "od" pred "do").
        </p>
      )}
      <button type="submit" className="btn" disabled={!znotrajDelovnegaCasa}>
        Dodaj urnik
      </button>
    </form>
  );
}
