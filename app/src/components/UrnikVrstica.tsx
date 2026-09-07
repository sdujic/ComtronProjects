"use client";

import { useState } from "react";
import { ustvariUrnik, izbrisiUrnik } from "@/lib/actions";
import { odsteviMinut } from "@/lib/cas";

const DNEVI = [
  { vrednost: 1, naziv: "Ponedeljek" },
  { vrednost: 2, naziv: "Torek" },
  { vrednost: 3, naziv: "Sreda" },
  { vrednost: 4, naziv: "Četrtek" },
  { vrednost: 5, naziv: "Petek" },
  { vrednost: 6, naziv: "Sobota" },
  { vrednost: 7, naziv: "Nedelja" },
];

type Urnik = {
  id: string;
  zaposleniId: string;
  lokacijaId: string;
  dan: number;
  delovniCasOd: string;
  delovniCasDo: string;
  casRezervacijOd: string;
  casRezervacijDo: string;
  lokacija: { naziv: string };
};

export function UrnikVrstica({ urnik }: { urnik: Urnik }) {
  const [urejam, setUrejam] = useState(false);
  const [delovniCasOd, setDelovniCasOd] = useState(urnik.delovniCasOd);
  const [delovniCasDo, setDelovniCasDo] = useState(urnik.delovniCasDo);
  const [casRezervacijOd, setCasRezervacijOd] = useState(urnik.casRezervacijOd);
  const [casRezervacijDo, setCasRezervacijDo] = useState(urnik.casRezervacijDo);

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

  if (!urejam) {
    return (
      <div
        className="flex items-center justify-between text-sm"
        onDoubleClick={() => setUrejam(true)}
        title="Dvoklik za urejanje"
      >
        <div>
          <span className="font-medium">{DNEVI.find((d) => d.vrednost === urnik.dan)?.naziv}</span>
          <span className="text-slate-500">
            {" "}
            · {urnik.lokacija.naziv} · delo {urnik.delovniCasOd}-{urnik.delovniCasDo} · rezervacije{" "}
            {urnik.casRezervacijOd}-{urnik.casRezervacijDo}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" className="text-xs text-primary-600 hover:underline" onClick={() => setUrejam(true)}>
            Uredi
          </button>
          <form action={izbrisiUrnik.bind(null, urnik.id)}>
            <button className="text-xs text-red-600 hover:underline">Izbriši</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form action={ustvariUrnik} className="rounded-lg border border-slate-200 p-2.5 space-y-2">
      <input type="hidden" name="zaposleniId" value={urnik.zaposleniId} />
      <input type="hidden" name="lokacijaId" value={urnik.lokacijaId} />
      <input type="hidden" name="dan" value={urnik.dan} />
      <div className="text-xs font-medium text-slate-600">
        {DNEVI.find((d) => d.vrednost === urnik.dan)?.naziv} · {urnik.lokacija.naziv}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-xs">Delovni čas od</label>
          <input
            type="time"
            name="delovniCasOd"
            required
            className="input py-1 text-xs"
            value={delovniCasOd}
            onChange={(e) => spremeniDelovniCasOd(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs">Delovni čas do</label>
          <input
            type="time"
            name="delovniCasDo"
            required
            className="input py-1 text-xs"
            value={delovniCasDo}
            onChange={(e) => spremeniDelovniCasDo(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs">Rezervacije od</label>
          <input
            type="time"
            name="casRezervacijOd"
            required
            className="input py-1 text-xs"
            value={casRezervacijOd}
            onChange={(e) => setCasRezervacijOd(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs">Rezervacije do</label>
          <input
            type="time"
            name="casRezervacijDo"
            required
            className="input py-1 text-xs"
            value={casRezervacijDo}
            onChange={(e) => setCasRezervacijDo(e.target.value)}
          />
        </div>
      </div>
      {!znotrajDelovnegaCasa && (
        <p className="text-xs font-medium text-red-600">Čas za rezervacije mora biti znotraj delovnega časa.</p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-secondary py-1 text-xs" disabled={!znotrajDelovnegaCasa}>
          Shrani
        </button>
        <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setUrejam(false)}>
          Prekliči
        </button>
      </div>
    </form>
  );
}
