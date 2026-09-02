import { pridobiNastavitve } from "@/lib/nastavitve";
import { posodobiNastavitve, uvoziPredlogoStoritev } from "@/lib/actions";
import { DEJAVNOSTI, najdiDejavnost } from "@/lib/dejavnosti";

export default async function NastavitveStran() {
  const nastavitve = await pridobiNastavitve();
  const dejavnost = najdiDejavnost(nastavitve.dejavnost);

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-bold">Nastavitve</h1>

      <form action={posodobiNastavitve} className="card space-y-3">
        <h2 className="font-medium">Podjetje in dejavnost</h2>
        <div>
          <label className="label">Ime aplikacije (prikazano v glavi strani)</label>
          <input name="imeAplikacije" defaultValue={nastavitve.imeAplikacije} className="input" />
        </div>
        <div>
          <label className="label">Dejavnost</label>
          <select name="dejavnost" defaultValue={nastavitve.dejavnost} className="input">
            {DEJAVNOSTI.map((d) => (
              <option key={d.id} value={d.id}>
                {d.naziv}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Določa privzeto besedilo na vstopni strani. Ne vpliva na obstoječe storitve.
          </p>
        </div>
        <div>
          <label className="label">Slogan na vstopni strani (prazno = privzet glede na dejavnost)</label>
          <input name="slogan" defaultValue={nastavitve.slogan ?? ""} placeholder={dejavnost.slogan} className="input" />
        </div>
        <div>
          <label className="label">Korak minut pri ročni izbiri ure termina (admin, "Nov termin")</label>
          <input
            type="number"
            name="korakMinutTermina"
            min={1}
            max={30}
            defaultValue={nastavitve.korakMinutTermina}
            className="input"
          />
          <p className="mt-1 text-xs text-slate-500">
            Privzeto 5 minut (namesto vsake minute). Ne vpliva na javni rezervacijski obrazec - tam so termini vedno
            vezani na 30-minutne sklope.
          </p>
        </div>
        <button type="submit" className="btn">
          Shrani
        </button>
      </form>

      <div className="card space-y-3">
        <h2 className="font-medium">Predloga storitev za &quot;{dejavnost.naziv}&quot;</h2>
        {dejavnost.predlogeStoritev.length === 0 ? (
          <p className="text-sm text-slate-500">Za dejavnost &quot;Drugo&quot; ni pripravljene predloge - storitve dodaj ročno na strani Storitve.</p>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              Enkraten uvoz manjkajočih storitev za trenutno izbrano dejavnost (ne podvaja obstoječih storitev z enakim nazivom):
            </p>
            <ul className="list-inside list-disc text-sm text-slate-600">
              {dejavnost.predlogeStoritev.map((s) => (
                <li key={s.naziv}>
                  {s.naziv} ({s.trajanjeMin} min, {s.cena.toFixed(2)} €)
                </li>
              ))}
            </ul>
            <form action={uvoziPredlogoStoritev}>
              <button type="submit" className="btn-secondary">
                Uvozi predlogo storitev
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
