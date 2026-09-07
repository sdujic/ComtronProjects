import { prisma } from "@/lib/prisma";
import { UrnikObrazec } from "@/components/UrnikObrazec";
import { UrnikVrstica } from "@/components/UrnikVrstica";

// Stran združuje zaposlene IN lokacije (za spustna seznama v obrazcu), a
// akcije, ki ju ustvarjajo (ustvariZaposlenega, ustvariLokacijo ...) osvežijo
// samo SVOJO stran (revalidatePath("/admin/zaposleni")/("/admin/lokacije")) -
// brez tega bi stran ostala statično predpomnjena z zastarelim seznamom
// (npr. na novo dodan zaposleni se ne bi pojavil v spustnem seznamu).
export const dynamic = "force-dynamic";

export default async function UrnikiStran() {
  const [urniki, zaposleni, lokacije] = await Promise.all([
    prisma.urnik.findMany({
      include: { zaposleni: true, lokacija: true },
      orderBy: [{ zaposleniId: "asc" }, { dan: "asc" }],
    }),
    prisma.zaposleni.findMany({ where: { aktiven: true } }),
    prisma.lokacija.findMany({ where: { aktivna: true } }),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-bold">Urniki</h1>
        <p className="text-sm text-slate-500">
          Zaposleni je na voljo za rezervacije samo na dneve, za katere ima tu vnesen urnik - manjkajoč dan (npr.
          sobota) pomeni, da tisti dan ni ponujenih terminov, tudi če je lokacija sicer označena kot odprta.
        </p>
      </div>

      <div className="space-y-3">
        {zaposleni.map((z) => {
          const urnikiZaposlenega = urniki.filter((u) => u.zaposleniId === z.id);
          return (
            <div key={z.id} className="card">
              <div className="mb-2 font-medium">
                {z.ime} {z.priimek}
              </div>
              {urnikiZaposlenega.length === 0 ? (
                <p className="text-sm text-slate-400">Ni vnesenega urnika - ni na voljo za rezervacije nobenega dne.</p>
              ) : (
                <div className="space-y-1.5">
                  {urnikiZaposlenega.map((u) => (
                    <UrnikVrstica key={`${u.id}-${u.updatedAt.getTime()}`} urnik={u} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {zaposleni.length === 0 && <p className="text-slate-500">Najprej dodaj zaposlenega.</p>}
      </div>

      <UrnikObrazec zaposleni={zaposleni} lokacije={lokacije} />
    </div>
  );
}
