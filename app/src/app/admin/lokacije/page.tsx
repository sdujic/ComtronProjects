import { prisma } from "@/lib/prisma";
import { ustvariLokacijo, izbrisiLokacijo, preklopiDanLokacije, posodobiKoordinateLokacije } from "@/lib/actions";

export default async function LokacijeStran() {
  const lokacije = await prisma.lokacija.findMany({ where: { aktivna: true } });

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-bold">Lokacije</h1>

      <div className="space-y-3">
        {lokacije.map((l) => (
          <div key={l.id} className="card flex items-center justify-between">
            <div>
              <div className="font-medium">{l.naziv}</div>
              <div className="text-sm text-slate-500">{l.naslov}</div>
              <div className="text-sm text-slate-500">
                {l.delovniCas} · dela prosti dnevi: {l.drzava}
              </div>
              <form action={posodobiKoordinateLokacije.bind(null, l.id)} className="mt-2 flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  name="lat"
                  defaultValue={l.lat ?? ""}
                  placeholder="Lat"
                  className="input w-24 py-1 text-xs"
                />
                <input
                  type="number"
                  step="any"
                  name="lng"
                  defaultValue={l.lng ?? ""}
                  placeholder="Lng"
                  className="input w-24 py-1 text-xs"
                />
                <button type="submit" className="btn-secondary py-1 text-xs">
                  Shrani koordinate
                </button>
                {(l.lat == null || l.lng == null) && (
                  <span className="text-xs text-amber-600">brez koordinat - ne bo na zemljevidu</span>
                )}
              </form>
            </div>
            <div className="flex items-center gap-3">
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
        ))}
      </div>

      <form action={ustvariLokacijo} className="card space-y-3">
        <h2 className="font-medium">Nova lokacija</h2>
        <div>
          <label className="label">Naziv *</label>
          <input name="naziv" required className="input" />
        </div>
        <div>
          <label className="label">Naslov</label>
          <input name="naslov" className="input" />
        </div>
        <div>
          <label className="label">Delovni čas</label>
          <input name="delovniCas" placeholder="08:00-18:00" className="input" />
        </div>
        <div>
          <label className="label">Država (za dela proste dneve)</label>
          <select name="drzava" defaultValue="SI" className="input">
            <option value="SI">Slovenija</option>
            <option value="HR">Hrvaška</option>
          </select>
        </div>
        <div>
          <label className="label">Koordinate (za prikaz na zemljevidu pri izbiri poslovalnice)</label>
          <div className="flex gap-2">
            <input type="number" step="any" name="lat" placeholder="Zemljepisna širina (lat)" className="input" />
            <input type="number" step="any" name="lng" placeholder="Zemljepisna dolžina (lng)" className="input" />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Neobvezno. Dobiš ju z desnim klikom na lokacijo na{" "}
            <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="underline">
              Google Maps
            </a>{" "}
            (klikni na prikazane koordinate, da ju kopiraš).
          </p>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="odprtoSobota" defaultChecked />
            Odprto ob sobotah
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="odprtoNedelja" />
            Odprto ob nedeljah
          </label>
        </div>
        <button type="submit" className="btn">
          Dodaj lokacijo
        </button>
      </form>
    </div>
  );
}
