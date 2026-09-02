import { prisma } from "@/lib/prisma";
import { ustvariStoritev, izbrisiStoritev } from "@/lib/actions";

export default async function StoritveStran() {
  const [storitve, kategorije] = await Promise.all([
    // jePoljubna izpuščen - to je interni sidrni zapis za "Druga želja / opis
    // težave" na javnem obrazcu (glej src/lib/poljubna-storitev.ts), ne
    // prava storitev za upravljanje.
    prisma.storitev.findMany({ where: { aktivna: true, jePoljubna: false }, include: { kategorija: true } }),
    prisma.kategorijaStoritve.findMany(),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-bold">Storitve</h1>

      <div className="space-y-3">
        {storitve.map((s) => (
          <div key={s.id} className="card flex items-center justify-between">
            <div>
              <div className="font-medium">{s.naziv}</div>
              <div className="text-sm text-slate-500">
                {s.kategorija?.naziv} · {s.trajanjeMin} min · {s.cena.toFixed(2)} €
                {s.ercSifraArtikla && ` · ERP šifra: ${s.ercSifraArtikla}`}
              </div>
            </div>
            <form action={izbrisiStoritev.bind(null, s.id)}>
              <button className="text-sm text-red-600 hover:underline">Izbriši</button>
            </form>
          </div>
        ))}
      </div>

      <form action={ustvariStoritev} className="card space-y-3">
        <h2 className="font-medium">Nova storitev</h2>
        <div>
          <label className="label">Naziv *</label>
          <input name="naziv" required className="input" />
        </div>
        <div>
          <label className="label">Opis</label>
          <textarea name="opis" className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Trajanje (min) *</label>
            <input name="trajanjeMin" type="number" min={1} step={1} required className="input" />
          </div>
          <div>
            <label className="label">Cena (€) *</label>
            <input name="cena" type="number" min={0} step="0.01" required className="input" />
          </div>
        </div>
        <div>
          <label className="label">Kategorija</label>
          <select name="kategorijaId" className="input">
            <option value="">-- brez --</option>
            {kategorije.map((k) => (
              <option key={k.id} value={k.id}>
                {k.naziv}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">ERP šifra artikla</label>
          <input name="ercSifraArtikla" className="input" placeholder="za povezavo s TRONxERP" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="vidnaNaSpletu" defaultChecked />
          Vidna na spletnem obrazcu
        </label>
        <button type="submit" className="btn">
          Dodaj storitev
        </button>
      </form>
    </div>
  );
}
