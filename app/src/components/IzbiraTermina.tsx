"use client";

import { useEffect, useState } from "react";
import { lokalniDatumString } from "@/lib/datum";
import { besedilaProstaMesta } from "@/lib/besedila";

interface Slot {
  ura: string;
  datumOd: string;
  datumDo: string;
  prost: boolean;
  zaposleniId?: string;
  prostihMest: number;
}
interface DnevniPregled {
  datum: string;
  zaprto: boolean;
  razlogZaprtja?: string;
  sloti: Slot[];
}
interface DanPovzetek {
  datum: string;
  zaprto: boolean;
  razlogZaprtja?: string;
  steviloProstih: number;
}
interface IzbranTermin {
  datumOd: string;
  datumDo: string;
  zaposleniId: string;
}

const DNEVI_KRATKO = ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];
const MESECI = [
  "januar", "februar", "marec", "april", "maj", "junij",
  "julij", "avgust", "september", "oktober", "november", "december",
];

function dodajDni(datumStr: string, dni: number) {
  const d = new Date(`${datumStr}T00:00:00`);
  d.setDate(d.getDate() + dni);
  return lokalniDatumString(d);
}
function dodajMesece(datumStr: string, mesecev: number) {
  const d = new Date(`${datumStr}T00:00:00`);
  d.setMonth(d.getMonth() + mesecev);
  return lokalniDatumString(d);
}
function formatDan(datumStr: string) {
  const d = new Date(`${datumStr}T00:00:00`);
  return `${DNEVI_KRATKO[(d.getDay() + 6) % 7]} ${d.getDate()}.${d.getMonth() + 1}.`;
}

export function IzbiraTermina({
  storitevId,
  zaposleniId,
  lokacijaId,
  izbranTermin,
  onIzberi,
}: {
  storitevId: string;
  zaposleniId?: string;
  lokacijaId: string;
  izbranTermin: IzbranTermin | null;
  onIzberi: (slot: IzbranTermin) => void;
}) {
  const [pogled, setPogled] = useState<"dan" | "teden" | "mesec">("dan");
  const [datum, setDatum] = useState(() => lokalniDatumString(new Date()));
  const [nalaganje, setNalaganje] = useState(false);

  const [dan, setDan] = useState<DnevniPregled | null>(null);
  const [teden, setTeden] = useState<DnevniPregled[]>([]);
  const [mesec, setMesec] = useState<DanPovzetek[]>([]);

  const skupniParametri = new URLSearchParams({
    storitevId,
    lokacijaId,
    ...(zaposleniId ? { zaposleniId } : {}),
  });

  useEffect(() => {
    setNalaganje(true);
    if (pogled === "dan") {
      fetch(`/api/pregled-dneva?${skupniParametri}&datum=${datum}`)
        .then((r) => r.json())
        .then(setDan)
        .finally(() => setNalaganje(false));
    } else if (pogled === "teden") {
      fetch(`/api/pregled-tedna?${skupniParametri}&datum=${datum}`)
        .then((r) => r.json())
        .then(setTeden)
        .finally(() => setNalaganje(false));
    } else {
      const [leto, mes] = datum.split("-").map(Number);
      fetch(`/api/pregled-meseca?${skupniParametri}&leto=${leto}&mesec=${mes}`)
        .then((r) => r.json())
        .then(setMesec)
        .finally(() => setNalaganje(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storitevId, zaposleniId, lokacijaId, datum, pogled]);

  function slotGumb(s: Slot) {
    const izbran = izbranTermin?.datumOd === s.datumOd;
    const namig = besedilaProstaMesta(s.prostihMest);
    if (!s.prost) {
      return (
        <button
          key={s.ura}
          disabled
          title={namig}
          className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-400"
        >
          {s.ura}
        </button>
      );
    }
    return (
      <button
        key={s.ura}
        title={namig}
        onClick={() => onIzberi({ datumOd: s.datumOd, datumDo: s.datumDo, zaposleniId: s.zaposleniId! })}
        className={`rounded-md border px-3 py-2 text-sm ${
          izbran ? "border-primary-500 bg-primary-500 text-white" : "border-slate-300 hover:border-primary-400"
        }`}
      >
        {s.ura}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["dan", "teden", "mesec"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPogled(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                pogled === p ? "bg-primary-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setDatum(pogled === "mesec" ? dodajMesece(datum, -1) : dodajDni(datum, pogled === "teden" ? -7 : -1))
            }
            className="btn-secondary px-2 py-1"
          >
            ‹
          </button>
          <input type="date" className="input" value={datum} onChange={(e) => setDatum(e.target.value)} />
          <button
            onClick={() =>
              setDatum(pogled === "mesec" ? dodajMesece(datum, 1) : dodajDni(datum, pogled === "teden" ? 7 : 1))
            }
            className="btn-secondary px-2 py-1"
          >
            ›
          </button>
        </div>
      </div>

      {nalaganje && <p className="text-slate-500">Nalaganje ...</p>}

      {!nalaganje && pogled === "dan" && dan && (
        <>
          {dan.zaprto ? (
            <p className="text-slate-500">Zaprto{dan.razlogZaprtja ? ` (${dan.razlogZaprtja})` : ""}.</p>
          ) : dan.sloti.length === 0 ? (
            <p className="text-slate-500">Na ta dan ni terminov.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">{dan.sloti.map(slotGumb)}</div>
          )}
        </>
      )}

      {!nalaganje && pogled === "teden" && (
        <div className="grid grid-cols-7 gap-2">
          {teden.map((d) => (
            <div key={d.datum} className="space-y-1">
              <div className="text-center text-xs font-medium text-slate-500">{formatDan(d.datum)}</div>
              {d.zaprto ? (
                <div title={d.razlogZaprtja} className="rounded-md bg-slate-50 p-2 text-center text-xs text-slate-400">
                  Zaprto
                </div>
              ) : (
                <div className="space-y-1">{d.sloti.map(slotGumb)}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {!nalaganje && pogled === "mesec" && (
        <div>
          <div className="mb-2 text-center text-sm font-medium text-slate-600">
            {MESECI[Number(datum.split("-")[1]) - 1]} {datum.split("-")[0]}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {DNEVI_KRATKO.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-400">
                {d}
              </div>
            ))}
            {mesec.length > 0 &&
              Array.from({ length: (new Date(`${mesec[0].datum}T00:00:00`).getDay() + 6) % 7 }).map((_, idx) => (
                <div key={`prazno-${idx}`} />
              ))}
            {mesec.map((d) => {
              const dStr = new Date(`${d.datum}T00:00:00`).getDate();
              return (
                <button
                  key={d.datum}
                  disabled={d.zaprto}
                  title={d.zaprto ? d.razlogZaprtja : undefined}
                  onClick={() => {
                    setDatum(d.datum);
                    setPogled("dan");
                  }}
                  className={`rounded-md border p-2 text-center text-sm ${
                    d.zaprto ? "border-slate-100 bg-slate-50 text-slate-300" : "border-slate-300 hover:border-primary-400"
                  }`}
                >
                  <div>{dStr}</div>
                  {!d.zaprto && <div className="text-xs text-primary-500">{d.steviloProstih} prosti</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
