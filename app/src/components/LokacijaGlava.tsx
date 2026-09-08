"use client";

import { useState } from "react";
import { posodobiOsnovnePodatkeLokacije, preklopiDanLokacije, izbrisiLokacijo } from "@/lib/actions";

type Lokacija = {
  id: string;
  naziv: string;
  naslov: string | null;
  delovniCas: string | null;
  drzava: string;
  odprtoSobota: boolean;
  odprtoNedelja: boolean;
  casRezervacijOd: string | null;
  casRezervacijDo: string | null;
};

export function LokacijaGlava({ lokacija }: { lokacija: Lokacija }) {
  const [urejam, setUrejam] = useState(false);
  const l = lokacija;

  if (urejam) {
    return (
      <form action={posodobiOsnovnePodatkeLokacije.bind(null, l.id)} className="space-y-2">
        <div>
          <label className="label">Naziv *</label>
          <input name="naziv" required defaultValue={l.naziv} className="input" />
        </div>
        <div>
          <label className="label">Naslov</label>
          <input name="naslov" defaultValue={l.naslov ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Delovni čas</label>
          <input name="delovniCas" defaultValue={l.delovniCas ?? ""} placeholder="08:00-18:00" className="input" />
        </div>
        <div>
          <label className="label">Država (za dela proste dneve)</label>
          <select name="drzava" defaultValue={l.drzava} className="input">
            <option value="SI">Slovenija</option>
            <option value="HR">Hrvaška</option>
          </select>
        </div>
        <div>
          <label className="label">Rezervacije od-do (samo za lokacije BREZ lastnih zaposlenih - glej Delovna mesta spodaj)</label>
          <div className="flex gap-2">
            <input type="time" name="casRezervacijOd" defaultValue={l.casRezervacijOd ?? ""} className="input" />
            <input type="time" name="casRezervacijDo" defaultValue={l.casRezervacijDo ?? ""} className="input" />
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

  return (
    <div className="flex items-start justify-between" onDoubleClick={() => setUrejam(true)} title="Dvoklik za urejanje">
      <div>
        <div className="font-medium">{l.naziv}</div>
        <div className="text-sm text-slate-500">{l.naslov}</div>
        <div className="text-sm text-slate-500">
          {l.delovniCas} · dela prosti dnevi: {l.drzava}
          {l.casRezervacijOd && l.casRezervacijDo && (
            <> · rezervacije {l.casRezervacijOd}-{l.casRezervacijDo} (brez zaposlenih)</>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="text-sm text-primary-600 hover:underline" onClick={() => setUrejam(true)}>
          Uredi
        </button>
        <form action={preklopiDanLokacije.bind(null, l.id, "odprtoSobota", l.odprtoSobota)}>
          <button type="submit" className={`znacka ${l.odprtoSobota ? "znacka-zakljucen" : "znacka-neprihod"}`}>
            Sobota: {l.odprtoSobota ? "odprto" : "zaprto"}
          </button>
        </form>
        <form action={preklopiDanLokacije.bind(null, l.id, "odprtoNedelja", l.odprtoNedelja)}>
          <button type="submit" className={`znacka ${l.odprtoNedelja ? "znacka-zakljucen" : "znacka-neprihod"}`}>
            Nedelja: {l.odprtoNedelja ? "odprto" : "zaprto"}
          </button>
        </form>
        <form action={izbrisiLokacijo.bind(null, l.id)}>
          <button className="text-sm text-red-600 hover:underline">Izbriši</button>
        </form>
      </div>
    </div>
  );
}
