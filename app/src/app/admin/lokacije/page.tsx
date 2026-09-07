import { prisma } from "@/lib/prisma";
import { ustvariLokacijo, posodobiNastavitveLokacije, ustvariDelovnoMesto } from "@/lib/actions";
import { pridobiNastavitve } from "@/lib/nastavitve";
import { najdiDejavnost } from "@/lib/dejavnosti";
import { LokacijaGlava } from "@/components/LokacijaGlava";
import { DelovnoMestoVrstica } from "@/components/DelovnoMestoVrstica";

export default async function LokacijeStran() {
  const [lokacije, storitve, nastavitve] = await Promise.all([
    prisma.lokacija.findMany({
      where: { aktivna: true },
      include: { delovnaMesta: { where: { aktivno: true }, include: { storitve: true } } },
    }),
    prisma.storitev.findMany({ where: { aktivna: true, jePoljubna: false } }),
    pridobiNastavitve(),
  ]);
  const dejavnost = najdiDejavnost(nastavitve.dejavnost);

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-bold">Lokacije</h1>

      <div className="space-y-3">
        {lokacije.map((l) => {
          return (
            <div key={l.id} className="card space-y-3">
              <LokacijaGlava key={`glava-${l.id}-${l.updatedAt.getTime()}`} lokacija={l} />

              <form action={posodobiNastavitveLokacije.bind(null, l.id)} className="flex flex-wrap items-center gap-1.5">
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

              <div className="border-t border-slate-100 pt-3">
                <h3 className="mb-2 text-sm font-medium capitalize">
                  Delovna mesta ({dejavnost.oznakaMesta})
                </h3>
                {l.delovnaMesta.length === 0 && (
                  <p className="mb-2 text-xs text-amber-600">
                    Brez definiranih mest - zasedenost tu velja SAMO po zaposlenih (obstoječe obnašanje).
                  </p>
                )}
                <div className="space-y-2">
                  {l.delovnaMesta.map((m) => (
                    <DelovnoMestoVrstica key={`${m.id}-${m.updatedAt.getTime()}`} mesto={m} storitve={storitve} />
                  ))}
                </div>

                <form
                  key={l.delovnaMesta.length}
                  action={ustvariDelovnoMesto.bind(null, l.id)}
                  className="mt-2 rounded-lg border border-dashed border-slate-300 p-2.5"
                >
                  <input
                    name="naziv"
                    required
                    placeholder="Naziv novega mesta (npr. Rampa 1)"
                    className="input mb-1.5 py-1 text-xs"
                  />
                  <div className="mb-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {storitve.map((s) => (
                      <label key={s.id} className="flex items-center gap-1 text-xs text-slate-600">
                        <input type="checkbox" name="storitveIds" value={s.id} />
                        {s.naziv}
                      </label>
                    ))}
                  </div>
                  <button type="submit" className="btn-secondary py-1 text-xs">
                    Dodaj mesto
                  </button>
                </form>
              </div>
            </div>
          );
        })}
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
        <p className="text-xs text-slate-400">
          Delovna mesta ({dejavnost.oznakaMesta}) dodaš po ustvarjanju lokacije, spodaj v seznamu.
        </p>
      </form>
    </div>
  );
}
