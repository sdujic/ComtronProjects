import { prisma } from "@/lib/prisma";
import { dodajZapisekStranki } from "@/lib/actions";
import { notFound } from "next/navigation";
import { StrankaGlava } from "@/components/StrankaGlava";

const STATUS_OZNAKE: Record<string, string> = {
  V_POTRJEVANJU: "V potrjevanju",
  REZERVIRAN: "Potrjen",
  NEPRIHOD: "Neprihod",
  ODPOVEDAN: "Zavrnjen/odpovedan",
  ZAKLJUCEN: "Zaključen",
};
const ZNACKA_PO_STATUSU: Record<string, string> = {
  V_POTRJEVANJU: "znacka-v-potrjevanju",
  REZERVIRAN: "znacka-rezerviran",
  NEPRIHOD: "znacka-neprihod",
  ODPOVEDAN: "znacka-odpovedan",
  ZAKLJUCEN: "znacka-zakljucen",
};

export default async function KarticaStranke({ params }: { params: { id: string } }) {
  const stranka = await prisma.stranka.findUnique({
    where: { id: params.id },
    include: {
      termini: {
        orderBy: { datumOd: "desc" },
        include: { storitve: { include: { storitev: true } } },
      },
      zapiski: { orderBy: { datum: "desc" } },
    },
  });

  if (!stranka) notFound();

  const dodajZapisekVezan = dodajZapisekStranki.bind(null, stranka.id);

  return (
    <div className="max-w-2xl space-y-8">
      <StrankaGlava key={stranka.updatedAt.getTime()} stranka={stranka} />

      <section>
        <h2 className="mb-2 font-medium">Termini</h2>
        <div className="space-y-2">
          {stranka.termini.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {t.storitve.map((ts) => ts.storitev.naziv).join(", ")}
                  </div>
                  <div className="text-sm text-slate-500">
                    {new Date(t.datumOd).toLocaleString("sl-SI")} · {t.vir === "SPLET" ? "prek spleta" : "ročno"}
                    {t.registracija && ` · ${t.registracija}`}
                  </div>
                </div>
                <span className={`znacka ${ZNACKA_PO_STATUSU[t.status] ?? ""}`}>{STATUS_OZNAKE[t.status] ?? t.status}</span>
              </div>
            </div>
          ))}
          {stranka.termini.length === 0 && <p className="text-slate-500">Ni terminov.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Zapiski</h2>
        <div className="mb-3 space-y-2">
          {stranka.zapiski.map((z) => (
            <div key={z.id} className="card text-sm">
              <div>{z.besedilo}</div>
              <div className="text-xs text-slate-400">{new Date(z.datum).toLocaleString("sl-SI")}</div>
            </div>
          ))}
        </div>
        <form action={dodajZapisekVezan} className="flex gap-2">
          <input name="besedilo" className="input" placeholder="Nov zapisek ..." />
          <button type="submit" className="btn">
            Dodaj
          </button>
        </form>
      </section>
    </div>
  );
}
