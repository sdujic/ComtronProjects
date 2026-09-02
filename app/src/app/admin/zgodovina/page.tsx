import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { lokalniDatumString } from "@/lib/datum";

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

export default async function ZgodovinaServisovStran({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();

  // Iskanje po stranki (ime/priimek/telefon) ALI po registrski številki
  // vozila na terminu - SQLite "contains" je za ASCII privzeto neobčutljiv
  // na velike/male črke, zato mode:"insensitive" ni potreben (in ga sqlite
  // provider tudi ne podpira).
  const termini = q
    ? await prisma.termin.findMany({
        where: {
          OR: [
            { registracija: { contains: q } },
            { stranka: { ime: { contains: q } } },
            { stranka: { priimek: { contains: q } } },
            { stranka: { telefon: { contains: q } } },
          ],
        },
        include: {
          stranka: true,
          lokacija: true,
          storitve: { include: { storitev: true } },
        },
        orderBy: { datumOd: "desc" },
        take: 200,
      })
    : [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Zgodovina servisov</h1>
        <p className="text-sm text-slate-500">
          Poiščite celotno zgodovino obiskov po stranki (ime, priimek, telefon) ali po registrski
          številki vozila.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="npr. Novak, 041123456 ali LJ 12-345"
          className="input"
        />
        <button type="submit" className="btn">
          Išči
        </button>
      </form>

      {!q && (
        <p className="text-sm text-slate-400">Vnesite iskalni niz za prikaz zgodovine servisov.</p>
      )}

      {q && termini.length === 0 && (
        <p className="text-sm text-slate-400">Ni zadetkov za &quot;{q}&quot;.</p>
      )}

      {termini.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">
            {termini.length} {termini.length === 1 ? "zadetek" : "zadetkov"}
          </p>
          {termini.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">{lokalniDatumString(t.datumOd)}</div>
                  <Link href={`/admin/stranke/${t.strankaId}`} className="font-medium hover:text-primary-500">
                    {t.stranka.ime} {t.stranka.priimek}
                  </Link>
                  <div className="text-sm text-slate-500">
                    {t.storitve.map((ts) => ts.storitev.naziv).join(", ")}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    {t.registracija && (
                      <span className="rounded border border-slate-200 px-1.5 py-0.5 font-mono">
                        {t.registracija}
                      </span>
                    )}
                    <span>{t.lokacija.naziv}</span>
                    <span>· {t.vir === "SPLET" ? "prek spleta" : "ročno"}</span>
                  </div>
                </div>
                <span className={`znacka shrink-0 ${ZNACKA_PO_STATUSU[t.status] ?? ""}`}>
                  {STATUS_OZNAKE[t.status] ?? t.status}
                </span>
              </div>
            </div>
          ))}
          <p className="pt-2 text-xs text-slate-400">
            Podatki o storitvah in datumih so iz te aplikacije. Podrobnosti dejansko opravljenega dela
            iz delovnih nalogov v TRONxERP trenutno niso prikazane - TronOfficeAPI (glej
            TronOfficeAPI-referenca.md) še nima potrjenega endpointa za poizvedovanje/branje že
            ustvarjenih nalogov nazaj, ampak samo za njihovo ustvarjanje (importOrder).
          </p>
        </div>
      )}
    </div>
  );
}
