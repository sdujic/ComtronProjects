"use client";

import { useEffect, useState } from "react";
import { ustvariTerminAdmin } from "@/lib/actions";

type Lokacija = { id: string; naziv: string };
type Storitev = { id: string; naziv: string; trajanjeMin: number };
type Stranka = { id: string; ime: string; priimek: string };
type Zaposleni = { id: string; ime: string; priimek: string };

export function NovTerminObrazec({
  lokacije,
  storitve,
  stranke,
  datum,
  korakMinut,
}: {
  lokacije: Lokacija[];
  storitve: Storitev[];
  stranke: Stranka[];
  datum: string;
  korakMinut: number;
}) {
  const [lokacijaId, setLokacijaId] = useState(lokacije[0]?.id ?? "");
  const [storitevId, setStoritevId] = useState(storitve[0]?.id ?? "");
  const [datumOd, setDatumOd] = useState(`${datum}T09:00`);
  const [prostiIzvajalci, setProstiIzvajalci] = useState<Zaposleni[]>([]);
  const [nalaga, setNalaga] = useState(false);

  // Ponudi samo izvajalce, ki so dejansko prosti za izbrano storitev/datum/uro
  // - že zaseden izvajalec se sploh ne ponudi (glej dostopnost.ts,
  // prostiIzvajalciZaTermin).
  useEffect(() => {
    const storitev = storitve.find((s) => s.id === storitevId);
    if (!storitevId || !lokacijaId || !datumOd || !storitev) {
      setProstiIzvajalci([]);
      return;
    }
    const od = new Date(datumOd);
    if (Number.isNaN(od.getTime())) return;
    const dovrsi = new Date(od.getTime() + storitev.trajanjeMin * 60000);

    setNalaga(true);
    const params = new URLSearchParams({
      storitevId,
      lokacijaId,
      datumOd: od.toISOString(),
      datumDo: dovrsi.toISOString(),
    });
    fetch(`/api/prosti-izvajalci?${params}`)
      .then((r) => r.json())
      .then(setProstiIzvajalci)
      .finally(() => setNalaga(false));
  }, [storitevId, lokacijaId, datumOd, storitve]);

  return (
    <form action={ustvariTerminAdmin} className="card max-w-xl space-y-3">
      <h2 className="font-medium">Nov termin</h2>
      <div>
        <label className="label">Lokacija *</label>
        <select name="lokacijaId" required className="input" value={lokacijaId} onChange={(e) => setLokacijaId(e.target.value)}>
          {lokacije.map((l) => (
            <option key={l.id} value={l.id}>
              {l.naziv}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Storitev *</label>
        <select name="storitevId" required className="input" value={storitevId} onChange={(e) => setStoritevId(e.target.value)}>
          {storitve.map((s) => (
            <option key={s.id} value={s.id}>
              {s.naziv} ({s.trajanjeMin} min)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Datum in ura *</label>
        <input
          type="datetime-local"
          name="datumOd"
          required
          step={korakMinut * 60}
          className="input"
          value={datumOd}
          onChange={(e) => setDatumOd(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Izvajalec</label>
        <select name="zaposleniId" className="input">
          <option value="">-- samodejno (prvi prosti) --</option>
          {prostiIzvajalci.map((z) => (
            <option key={z.id} value={z.id}>
              {z.ime} {z.priimek}
            </option>
          ))}
        </select>
        {!nalaga && prostiIzvajalci.length === 0 && (
          <p className="mt-1 text-xs text-amber-600">Za izbran termin trenutno ni prostega izvajalca za to storitev.</p>
        )}
      </div>
      <div>
        <label className="label">Stranka *</label>
        <select name="strankaId" required className="input">
          {stranke.map((s) => (
            <option key={s.id} value={s.id}>
              {s.ime} {s.priimek}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Registrska številka vozila</label>
        <input name="registracija" className="input" placeholder="npr. LJ 12-345 (neobvezno)" />
      </div>
      <button type="submit" className="btn" disabled={nalaga || prostiIzvajalci.length === 0}>
        Dodaj termin
      </button>
    </form>
  );
}
