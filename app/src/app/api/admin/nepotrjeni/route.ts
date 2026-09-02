import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Podatki za zvonec z obvestili v adminu (glej ObvestilaZvonec.tsx) -
// število je TOČNO (ločen count), seznam za dropdown je omejen na
// najbližje prihajajoče, da se dropdown ne napihne pri veliko čakajočih
// rezervacijah.
export async function GET() {
  const [stevilo, termini] = await Promise.all([
    prisma.termin.count({ where: { status: "V_POTRJEVANJU" } }),
    prisma.termin.findMany({
      where: { status: "V_POTRJEVANJU" },
      orderBy: { datumOd: "asc" },
      take: 8,
      include: { stranka: true, storitve: { include: { storitev: true } } },
    }),
  ]);

  return NextResponse.json({
    stevilo,
    termini: termini.map((t) => ({
      id: t.id,
      datumOd: t.datumOd,
      stranka: `${t.stranka.ime} ${t.stranka.priimek}`,
      storitve: t.storitve.map((ts) => ts.storitev.naziv).join(", "),
    })),
  });
}
