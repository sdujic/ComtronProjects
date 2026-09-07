import { prisma } from "@/lib/prisma";
import { izbrisiUrnik } from "@/lib/actions";
import { UrnikObrazec } from "@/components/UrnikObrazec";

// Stran združuje zaposlene IN lokacije (za spustna seznama v obrazcu), a
// akcije, ki ju ustvarjajo (ustvariZaposlenega, ustvariLokacijo ...) osvežijo
// samo SVOJO stran (revalidatePath("/admin/zaposleni")/("/admin/lokacije")) -
// brez tega bi stran ostala statično predpomnjena z zastarelim seznamom
// (npr. na novo dodan zaposleni se ne bi pojavil v spustnem seznamu).
export const dynamic = "force-dynamic";

const DNEVI = [
  { vrednost: 1, naziv: "Ponedeljek" },
  { vrednost: 2, naziv: "Torek" },
  { vrednost: 3, naziv: "Sreda" },
  { vrednost: 4, naziv: "Četrtek" },
  { vrednost: 5, naziv: "Petek" },
  { vrednost: 6, naziv: "Sobota" },
  { vrednost: 7, naziv: "Nedelja" },
];

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
                    <div key={u.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{DNEVI.find((d) => d.vrednost === u.dan)?.naziv}</span>
                        <span className="text-slate-500">
                          {" "}
                          · {u.lokacija.naziv} · delo {u.delovniCasOd}-{u.delovniCasDo} · rezervacije{" "}
                          {u.casRezervacijOd}-{u.casRezervacijDo}
                        </span>
                      </div>
                      <form action={izbrisiUrnik.bind(null, u.id)}>
                        <button className="text-xs text-red-600 hover:underline">Izbriši</button>
                      </form>
                    </div>
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
