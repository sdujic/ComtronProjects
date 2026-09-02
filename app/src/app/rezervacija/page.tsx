"use client";

import { useEffect, useState } from "react";
import { IzbiraTermina } from "@/components/IzbiraTermina";
import { TronXerpLogotip } from "@/components/TronXerpLogotip";
import { ZemljevidLokacij } from "@/components/ZemljevidLokacij";
import { POLJUBNA_STORITEV_SENTINEL } from "@/lib/poljubna-konstante";

type Lokacija = { id: string; naziv: string; naslov?: string | null; lat?: number | null; lng?: number | null };
type Storitev = { id: string; naziv: string; opis?: string; trajanjeMin: number; cena: number };
type Zaposleni = { id: string; ime: string; priimek: string };
type IzbranTermin = { datumOd: string; datumDo: string; zaposleniId: string };

const POLJUBNA_KARTICA: Storitev = {
  id: POLJUBNA_STORITEV_SENTINEL,
  naziv: "Druga želja / opis težave",
  opis: "Ni na seznamu, kar potrebujete? Opišite svojo željo ali težavo.",
  trajanjeMin: 30,
  cena: 0,
};

export default function RezervacijaStran() {
  const [korak, setKorak] = useState(0);

  const [lokacije, setLokacije] = useState<Lokacija[]>([]);
  const [lokacija, setLokacija] = useState<Lokacija | null>(null);
  const [pokaziZemljevid, setPokaziZemljevid] = useState(false);
  const [storitve, setStoritve] = useState<Storitev[]>([]);
  const [izbranaStoritev, setIzbranaStoritev] = useState<Storitev | null>(null);
  // Registrska številka vozila je smiselna samo za avtoservis/vulkanizer -
  // polje se v koraku "Podatki" prikaže le, ko je dejavnost AVTOSERVIS.
  const [dejavnost, setDejavnost] = useState<string | null>(null);
  const [registracija, setRegistracija] = useState("");

  const [izbranTermin, setIzbranTermin] = useState<IzbranTermin | null>(null);
  // Izvajalci, ki so dejansko prosti za IZBRANI termin (izpolnjeno šele po
  // izbiri termina, glej korak "Termin" -> "Naprej") - že zaseden izvajalec
  // se sploh ne ponudi.
  const [prostiIzvajalci, setProstiIzvajalci] = useState<Zaposleni[]>([]);
  const [nalagaIzvajalce, setNalagaIzvajalce] = useState(false);

  const [strankaPodatki, setStrankaPodatki] = useState({ ime: "", priimek: "", telefon: "", email: "" });
  const [opisZelje, setOpisZelje] = useState("");
  const [oddano, setOddano] = useState(false);
  const [napaka, setNapaka] = useState<string | null>(null);
  const [nalaganje, setNalaganje] = useState(false);

  const jePoljubna = izbranaStoritev?.id === POLJUBNA_STORITEV_SENTINEL;

  // Korak "Poslovalnica" se prikaže samo, če je aktivnih lokacij več kot ena
  // - pri eni sami se, kot prej, samodejno izbere brez dodatnega koraka.
  const vecLokacij = lokacije.length > 1;
  const KORAKI = vecLokacij
    ? (["Poslovalnica", "Storitev", "Termin", "Izvajalec", "Podatki"] as const)
    : (["Storitev", "Termin", "Izvajalec", "Podatki"] as const);
  const O = vecLokacij ? 1 : 0;

  useEffect(() => {
    fetch("/api/lokacije")
      .then((r) => r.json())
      .then((data: Lokacija[]) => {
        setLokacije(data);
        if (data.length <= 1) setLokacija(data[0] ?? null);
      });
    fetch("/api/nastavitve")
      .then((r) => r.json())
      .then((data: { dejavnost: string }) => setDejavnost(data.dejavnost));
  }, []);

  useEffect(() => {
    if (!lokacija) return;
    fetch(`/api/storitve?lokacijaId=${lokacija.id}`)
      .then((r) => r.json())
      .then(setStoritve);
  }, [lokacija]);

  async function pridobiProsteIzvajalce(termin: IzbranTermin) {
    if (!izbranaStoritev || !lokacija) return [];
    const params = new URLSearchParams({
      storitevId: izbranaStoritev.id,
      lokacijaId: lokacija.id,
      datumOd: termin.datumOd,
      datumDo: termin.datumDo,
    });
    const res = await fetch(`/api/prosti-izvajalci?${params}`);
    return (await res.json()) as Zaposleni[];
  }

  // Po izbiri termina: če je storitev poljubna ali je za ta termin prost
  // samo en izvajalec, izvajalca korak preskočimo (samodejno dodeljen).
  // Sicer pokažemo izbiro med dejansko prostimi izvajalci.
  async function naprejPoTerminu() {
    if (!izbranTermin) return;
    if (jePoljubna) {
      setKorak(O + 3);
      return;
    }
    setNalagaIzvajalce(true);
    try {
      const prosti = await pridobiProsteIzvajalce(izbranTermin);
      setProstiIzvajalci(prosti);
      setKorak(prosti.length > 1 ? O + 2 : O + 3);
    } finally {
      setNalagaIzvajalce(false);
    }
  }

  async function oddajRezervacijo() {
    if (!izbranaStoritev || !izbranTermin || !lokacija) return;
    setNalaganje(true);
    setNapaka(null);
    try {
      const res = await fetch("/api/rezervacije", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storitevId: izbranaStoritev.id,
          zaposleniId: izbranTermin.zaposleniId,
          lokacijaId: lokacija.id,
          datumOd: izbranTermin.datumOd,
          datumDo: izbranTermin.datumDo,
          stranka: strankaPodatki,
          ...(jePoljubna ? { opisZelje } : {}),
          ...(registracija.trim() ? { registracija: registracija.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const podatki = await res.json();
        throw new Error(podatki.napaka || "Napaka pri rezervaciji");
      }
      setOddano(true);
    } catch (e) {
      setNapaka(e instanceof Error ? e.message : "Napaka pri rezervaciji");
    } finally {
      setNalaganje(false);
    }
  }

  if (oddano) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">Zahtevek za termin je oddan!</h1>
        <p className="text-slate-600">
          Termin za storitev &quot;{izbranaStoritev?.naziv}&quot; smo prejeli in je trenutno <strong>v
          potrjevanju</strong>. Kmalu vas bomo kontaktirali s potrditvijo termina.
        </p>
        <div className="mt-10 flex flex-col items-center gap-1 text-xs text-slate-400">
          <span>Povezano s</span>
          <TronXerpLogotip velikost="md" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Rezervacija termina</h1>

      <ol className="mb-8 flex gap-2 text-sm">
        {KORAKI.map((naziv, i) => (
          <li
            key={naziv}
            className={`flex-1 rounded-md px-2 py-1 text-center ${
              i === korak ? "bg-primary-500 text-white" : i < korak ? "bg-primary-100 text-primary-600" : "bg-slate-100 text-slate-400"
            }`}
          >
            {naziv}
          </li>
        ))}
      </ol>

      {vecLokacij && korak === 0 && (
        <div className="mx-auto max-w-xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Izberite poslovalnico, kjer bi radi rezervirali termin.</p>
            <button onClick={() => setPokaziZemljevid(true)} className="btn-secondary shrink-0 text-sm">
              Pokaži v zemljevidih
            </button>
          </div>
          {lokacije.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setLokacija(l);
                setKorak(O);
              }}
              className="card w-full text-left hover:border-primary-400"
            >
              <div className="font-medium">{l.naziv}</div>
              {l.naslov && <div className="text-sm text-slate-500">{l.naslov}</div>}
            </button>
          ))}
          {pokaziZemljevid && (
            <ZemljevidLokacij
              lokacije={lokacije}
              onIzberi={(l) => {
                setLokacija(lokacije.find((lok) => lok.id === l.id) ?? null);
                setPokaziZemljevid(false);
                setKorak(O);
              }}
              onZapri={() => setPokaziZemljevid(false)}
            />
          )}
        </div>
      )}

      {korak === O && (
        <div className="mx-auto max-w-xl space-y-3">
          {vecLokacij && lokacija && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>
                Poslovalnica: <strong className="text-ink">{lokacija.naziv}</strong>
              </span>
              <button onClick={() => setKorak(0)} className="text-primary-500 hover:underline">
                Zamenjaj
              </button>
            </div>
          )}
          {storitve.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setIzbranaStoritev(s);
                setIzbranTermin(null);
                setProstiIzvajalci([]);
                setKorak(O + 1);
              }}
              className="card w-full text-left hover:border-primary-400"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.naziv}</div>
                  {s.opis && <div className="text-sm text-slate-500">{s.opis}</div>}
                </div>
                <div className="text-right text-sm text-slate-600">
                  <div>{s.trajanjeMin} min</div>
                  <div className="font-medium">{s.cena.toFixed(2)} €</div>
                </div>
              </div>
            </button>
          ))}
          {storitve.length === 0 && <p className="text-slate-500">Nalaganje storitev ...</p>}

          <button
            onClick={() => {
              setIzbranaStoritev(POLJUBNA_KARTICA);
              setIzbranTermin(null);
              setProstiIzvajalci([]);
              setKorak(O + 1);
            }}
            className="card w-full border-dashed text-left hover:border-primary-400"
          >
            <div className="font-medium">{POLJUBNA_KARTICA.naziv}</div>
            <div className="text-sm text-slate-500">{POLJUBNA_KARTICA.opis}</div>
          </button>
        </div>
      )}

      {korak === O + 1 && izbranaStoritev && lokacija && (
        <div className="space-y-4">
          <IzbiraTermina
            storitevId={izbranaStoritev.id}
            lokacijaId={lokacija.id}
            izbranTermin={izbranTermin}
            onIzberi={setIzbranTermin}
          />

          <div className="flex gap-2">
            <button onClick={() => setKorak(O)} className="btn-secondary">
              Nazaj
            </button>
            <button onClick={naprejPoTerminu} disabled={!izbranTermin || nalagaIzvajalce} className="btn">
              {nalagaIzvajalce ? "Preverjanje ..." : "Naprej"}
            </button>
          </div>
        </div>
      )}

      {korak === O + 2 && izbranTermin && (
        <div className="mx-auto max-w-xl space-y-3">
          <p className="text-sm text-slate-500">Za ta termin je na voljo več izvajalcev - izberite, kdo naj opravi storitev.</p>
          <button
            onClick={() => setKorak(O + 3)}
            className="card w-full text-left hover:border-primary-400"
          >
            Vseeno mi je, kdo izvede storitev
          </button>
          {prostiIzvajalci.map((z) => (
            <button
              key={z.id}
              onClick={() => {
                setIzbranTermin({ ...izbranTermin, zaposleniId: z.id });
                setKorak(O + 3);
              }}
              className="card w-full text-left hover:border-primary-400"
            >
              {z.ime} {z.priimek}
            </button>
          ))}
          <button onClick={() => setKorak(O + 1)} className="btn-secondary mt-4">
            Nazaj
          </button>
        </div>
      )}

      {korak === O + 3 && (
        <div className="mx-auto max-w-xl space-y-4">
          {jePoljubna && (
            <div>
              <label className="label">Opišite svojo željo ali težavo *</label>
              <textarea
                className="input"
                rows={4}
                value={opisZelje}
                onChange={(e) => setOpisZelje(e.target.value)}
                placeholder="Opišite, kaj potrebujete oz. kakšna je vaša želja."
              />
            </div>
          )}
          {dejavnost === "AVTOSERVIS" && (
            <div>
              <label className="label">Registrska številka vozila</label>
              <input
                className="input"
                value={registracija}
                onChange={(e) => setRegistracija(e.target.value)}
                placeholder="npr. LJ 12-345"
              />
            </div>
          )}
          <div>
            <label className="label">Ime *</label>
            <input
              className="input"
              value={strankaPodatki.ime}
              onChange={(e) => setStrankaPodatki({ ...strankaPodatki, ime: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Priimek *</label>
            <input
              className="input"
              value={strankaPodatki.priimek}
              onChange={(e) => setStrankaPodatki({ ...strankaPodatki, priimek: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Telefon *</label>
            <input
              className="input"
              value={strankaPodatki.telefon}
              onChange={(e) => setStrankaPodatki({ ...strankaPodatki, telefon: e.target.value })}
            />
          </div>
          <div>
            <label className="label">E-pošta</label>
            <input
              className="input"
              value={strankaPodatki.email}
              onChange={(e) => setStrankaPodatki({ ...strankaPodatki, email: e.target.value })}
            />
          </div>

          {napaka && <p className="text-sm text-red-600">{napaka}</p>}

          <div className="flex gap-2">
            <button onClick={() => setKorak(prostiIzvajalci.length > 1 && !jePoljubna ? O + 2 : O + 1)} className="btn-secondary">
              Nazaj
            </button>
            <button
              onClick={oddajRezervacijo}
              disabled={
                !strankaPodatki.ime ||
                !strankaPodatki.priimek ||
                !strankaPodatki.telefon ||
                (jePoljubna && !opisZelje.trim()) ||
                nalaganje
              }
              className="btn"
            >
              {nalaganje ? "Pošiljanje ..." : "Potrdi rezervacijo"}
            </button>
          </div>
        </div>
      )}
      <div className="mt-10 flex flex-col items-center gap-1 text-xs text-slate-400">
        <span>Povezano s</span>
        <TronXerpLogotip velikost="md" />
      </div>
    </main>
  );
}
