import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DatumFilter } from "@/components/DatumFilter";
import { StatusSelect } from "@/components/StatusSelect";
import { NovTerminObrazec } from "@/components/NovTerminObrazec";
import { lokalniDatumString } from "@/lib/datum";
import { pridobiNastavitve } from "@/lib/nastavitve";

const OKVIR_PO_STATUSU: Record<string, string> = {
  V_POTRJEVANJU: "border-l-amber-400",
  REZERVIRAN: "border-l-primary-500",
  NEPRIHOD: "border-l-slate-400",
  ODPOVEDAN: "border-l-red-400",
  ZAKLJUCEN: "border-l-emerald-500",
};
const ZNACKA_PO_STATUSU: Record<string, string> = {
  V_POTRJEVANJU: "znacka-v-potrjevanju",
  REZERVIRAN: "znacka-rezerviran",
  NEPRIHOD: "znacka-neprihod",
  ODPOVEDAN: "znacka-odpovedan",
  ZAKLJUCEN: "znacka-zakljucen",
};
const STATUS_OZNAKE: Record<string, string> = {
  V_POTRJEVANJU: "V potrjevanju",
  REZERVIRAN: "Potrjen",
  NEPRIHOD: "Neprihod",
  ODPOVEDAN: "Zavrnjen/odpovedan",
  ZAKLJUCEN: "Zaključen",
};
const DNEVI_KRATKO = ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];
const MESECI = [
  "januar", "februar", "marec", "april", "maj", "junij",
  "julij", "avgust", "september", "oktober", "november", "december",
];

function ponedeljekTedna(datumStr: string) {
  const d = new Date(`${datumStr}T00:00:00`);
  const isoDan = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (isoDan - 1));
  return d;
}
function dStr(d: Date) {
  return lokalniDatumString(d);
}

export default async function KoledarStran({
  searchParams,
}: {
  searchParams: { datum?: string; pogled?: string };
}) {
  const datum = searchParams.datum ?? lokalniDatumString(new Date());
  const pogled = searchParams.pogled === "teden" || searchParams.pogled === "mesec" ? searchParams.pogled : "dan";

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Koledar</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {(["dan", "teden", "mesec"] as const).map((p) => (
              <Link
                key={p}
                href={`/admin/koledar?pogled=${p}&datum=${datum}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                  pogled === p ? "bg-primary-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
          <DatumFilter datum={datum} pogled={pogled} />
        </div>
      </div>

      {pogled === "dan" && <DnevniPogled datum={datum} />}
      {pogled === "teden" && <TedenskiPogled datum={datum} />}
      {pogled === "mesec" && <MesecniPogled datum={datum} />}
    </div>
  );
}

async function DnevniPogled({ datum }: { datum: string }) {
  const zacetekDneva = new Date(`${datum}T00:00:00`);
  const koncDneva = new Date(`${datum}T23:59:59`);

  const [termini, lokacije, storitve, zaposleni, stranke, nastavitve] = await Promise.all([
    prisma.termin.findMany({
      where: { datumOd: { gte: zacetekDneva, lte: koncDneva } },
      orderBy: { datumOd: "asc" },
      include: { stranka: true, zaposleni: true, storitve: { include: { storitev: true } } },
    }),
    prisma.lokacija.findMany({ where: { aktivna: true } }),
    prisma.storitev.findMany({ where: { aktivna: true, jePoljubna: false } }),
    prisma.zaposleni.findMany({ where: { aktiven: true }, include: { lokacije: true } }),
    prisma.stranka.findMany(),
    pridobiNastavitve(),
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        {termini.map((t) => (
          <div
            key={t.id}
            className={`card flex items-center justify-between border-l-4 ${OKVIR_PO_STATUSU[t.status] ?? "border-l-slate-300"}`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {new Date(t.datumOd).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                  {t.storitve.map((ts) => ts.storitev.naziv).join(", ")}
                </span>
                <span className={`znacka ${ZNACKA_PO_STATUSU[t.status] ?? ""}`}>
                  {STATUS_OZNAKE[t.status] ?? t.status}
                </span>
              </div>
              <div className="text-sm text-slate-500">
                {t.stranka.ime} {t.stranka.priimek} · {t.zaposleni ? `${t.zaposleni.ime} ${t.zaposleni.priimek}` : "brez izvajalca"} ·{" "}
                {t.vir === "SPLET" ? "prek spleta" : "ročno"}
                {t.zapisek && <> · &quot;{t.zapisek}&quot;</>}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                {zaposleni
                  .filter((z) => z.lokacije.some((zl) => zl.lokacijaId === t.lokacijaId))
                  .map((z) => {
                    const zaseden = z.id === t.zaposleniId;
                    return (
                      <span key={z.id} className={zaseden ? "text-slate-400 line-through" : "text-slate-500"}>
                        {z.ime} {z.priimek}
                      </span>
                    );
                  })}
              </div>
            </div>
            <StatusSelect terminId={t.id} status={t.status} />
          </div>
        ))}
        {termini.length === 0 && <p className="text-slate-500">Ni terminov za izbrani dan.</p>}
      </div>

      <NovTerminObrazec
        lokacije={lokacije}
        storitve={storitve}
        stranke={stranke}
        datum={datum}
        korakMinut={nastavitve.korakMinutTermina}
      />
    </div>
  );
}

async function TedenskiPogled({ datum }: { datum: string }) {
  const ponedeljek = ponedeljekTedna(datum);
  const nedelja = new Date(ponedeljek);
  nedelja.setDate(nedelja.getDate() + 7);

  const [termini, zaposleni] = await Promise.all([
    prisma.termin.findMany({
      // Odpovedani/zavrnjeni termini ne štejejo kot zasedenost - naročnikova
      // zahteva (2.9.2026), da se v tedenskem/mesečnem pregledu ne kažejo.
      where: { datumOd: { gte: ponedeljek, lt: nedelja }, status: { not: "ODPOVEDAN" } },
      orderBy: { datumOd: "asc" },
      include: { stranka: true, storitve: { include: { storitev: true } } },
    }),
    prisma.zaposleni.findMany({ where: { aktiven: true }, include: { lokacije: true } }),
  ]);

  const dnevi = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ponedeljek);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-7 gap-3">
      {dnevi.map((d) => {
        const datumTegaDne = dStr(d);
        const terminiDneva = termini.filter((t) => dStr(new Date(t.datumOd)) === datumTegaDne);
        return (
          <div key={datumTegaDne} className="space-y-2">
            <Link
              href={`/admin/koledar?pogled=dan&datum=${datumTegaDne}`}
              className="block text-center text-sm font-medium text-slate-600 hover:text-primary-500"
            >
              {DNEVI_KRATKO[i(d)]} {d.getDate()}.{d.getMonth() + 1}.
            </Link>
            <div className="space-y-1.5">
              {terminiDneva.map((t) => (
                <div
                  key={t.id}
                  className={`card border-l-4 p-2 text-xs ${OKVIR_PO_STATUSU[t.status] ?? "border-l-slate-300"}`}
                >
                  <div className="font-medium">
                    {new Date(t.datumOd).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="truncate text-slate-500">{t.storitve.map((ts) => ts.storitev.naziv).join(", ")}</div>
                  <div className="truncate text-slate-400">
                    {t.stranka.ime} {t.stranka.priimek}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-1.5">
                    {zaposleni
                      .filter((z) => z.lokacije.some((zl) => zl.lokacijaId === t.lokacijaId))
                      .map((z) => (
                        <span key={z.id} className={z.id === t.zaposleniId ? "text-slate-300 line-through" : "text-slate-400"}>
                          {z.ime}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
              {terminiDneva.length === 0 && <div className="text-center text-xs text-slate-300">—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function i(d: Date) {
  return (d.getDay() + 6) % 7;
}

async function MesecniPogled({ datum }: { datum: string }) {
  const [leto, mesec] = datum.split("-").map(Number);
  const prviDan = new Date(leto, mesec - 1, 1);
  const zadnjiDan = new Date(leto, mesec, 0);
  const koncObdobja = new Date(leto, mesec, 0, 23, 59, 59);

  const termini = await prisma.termin.findMany({
    // Odpovedani/zavrnjeni termini ne štejejo kot zasedenost - naročnikova
    // zahteva (2.9.2026), da se v tedenskem/mesečnem pregledu ne kažejo.
    where: { datumOd: { gte: prviDan, lte: koncObdobja }, status: { not: "ODPOVEDAN" } },
    select: { datumOd: true, status: true },
  });

  const steviloPredDni = i(prviDan);
  const dnevi = Array.from({ length: zadnjiDan.getDate() }, (_, idx) => new Date(leto, mesec - 1, idx + 1));

  return (
    <div>
      <div className="mb-3 text-center font-medium text-slate-600">
        {MESECI[mesec - 1]} {leto}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {DNEVI_KRATKO.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-400">
            {d}
          </div>
        ))}
        {Array.from({ length: steviloPredDni }).map((_, idx) => (
          <div key={`prazno-${idx}`} />
        ))}
        {dnevi.map((d) => {
          const datumTegaDne = dStr(d);
          const terminiDneva = termini.filter((t) => dStr(new Date(t.datumOd)) === datumTegaDne);
          return (
            <Link
              key={datumTegaDne}
              href={`/admin/koledar?pogled=dan&datum=${datumTegaDne}`}
              className="rounded-md border border-slate-200 p-2 text-center hover:border-primary-400"
            >
              <div className="text-sm">{d.getDate()}</div>
              {terminiDneva.length > 0 && (
                <div className="text-xs text-primary-500">{terminiDneva.length} termin(ov)</div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
