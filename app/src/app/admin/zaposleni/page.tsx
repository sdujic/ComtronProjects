import { prisma } from "@/lib/prisma";
import { ustvariZaposlenega } from "@/lib/actions";
import { ZaposleniVrstica } from "@/components/ZaposleniVrstica";

export default async function ZaposleniStran() {
  const [zaposleni, lokacije, storitve] = await Promise.all([
    prisma.zaposleni.findMany({
      where: { aktiven: true },
      include: { lokacije: { include: { lokacija: true } }, storitve: { include: { storitev: true } } },
    }),
    prisma.lokacija.findMany({ where: { aktivna: true } }),
    prisma.storitev.findMany({ where: { aktivna: true, jePoljubna: false } }),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-bold">Zaposleni</h1>

      <div className="space-y-3">
        {zaposleni.map((z) => (
          // key vključuje updatedAt, da se po uspešnem shranjevanju komponenta
          // ponovno "namontira" in se sama vrne v prikazni (ne urejevalni) način.
          <ZaposleniVrstica key={`${z.id}-${z.updatedAt.getTime()}`} zaposleni={z} lokacije={lokacije} storitve={storitve} />
        ))}
      </div>

      <form action={ustvariZaposlenega} className="card space-y-3">
        <h2 className="font-medium">Nov zaposleni</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ime *</label>
            <input name="ime" required className="input" />
          </div>
          <div>
            <label className="label">Priimek *</label>
            <input name="priimek" required className="input" />
          </div>
        </div>
        <div>
          <label className="label">E-pošta</label>
          <input name="email" type="email" className="input" />
        </div>
        <div>
          <label className="label">Telefon</label>
          <input name="telefon" className="input" />
        </div>
        <div>
          <label className="label">Lokacija</label>
          <select name="lokacijaId" className="input">
            <option value="">-- izberi --</option>
            {lokacije.map((l) => (
              <option key={l.id} value={l.id}>
                {l.naziv}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Storitve, ki jih izvaja</label>
          <div className="space-y-1">
            {storitve.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="storitveIds" value={s.id} />
                {s.naziv}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="btn">
          Dodaj zaposlenega
        </button>
      </form>
    </div>
  );
}
