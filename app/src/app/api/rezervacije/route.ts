import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { POLJUBNA_STORITEV_SENTINEL, zagotoviPoljubnoStoritev } from "@/lib/poljubna-storitev";
import { najdiProstegaZaposlenega } from "@/lib/dostopnost";

export async function POST(req: Request) {
  const podatki = await req.json();
  const { storitevId, zaposleniId, lokacijaId, datumOd, datumDo, stranka, opisZelje, registracija } = podatki;

  if (!storitevId || !lokacijaId || !datumOd || !datumDo || !stranka?.ime || !stranka?.priimek || !stranka?.telefon) {
    return NextResponse.json({ napaka: "Manjkajo obvezni podatki" }, { status: 400 });
  }
  if (storitevId === POLJUBNA_STORITEV_SENTINEL && !String(opisZelje || "").trim()) {
    return NextResponse.json({ napaka: "Opis želje je obvezen" }, { status: 400 });
  }

  const storitev =
    storitevId === POLJUBNA_STORITEV_SENTINEL
      ? await zagotoviPoljubnoStoritev()
      : await prisma.storitev.findUnique({ where: { id: storitevId } });
  if (!storitev) {
    return NextResponse.json({ napaka: "Storitev ne obstaja" }, { status: 404 });
  }

  let strankaZapis = await prisma.stranka.findFirst({ where: { telefon: stranka.telefon } });
  if (!strankaZapis) {
    strankaZapis = await prisma.stranka.create({
      data: {
        ime: stranka.ime,
        priimek: stranka.priimek,
        telefon: stranka.telefon,
        email: stranka.email || null,
        soglasjeObvestila: Boolean(stranka.soglasjeObvestila),
      },
    });
  }

  // Termin brez zaposleniId je neviden za preverjanje zasedenosti (glej
  // dostopnost.ts, pregledDneva) - javni obrazec sicer vedno pošlje
  // zaposleniId iz izbranega slota, a za robustnost (in vsak neposreden
  // API klic) tudi tu poskusimo samodejno dodeliti prostega izvajalca. Če
  // nihče ni prost, rezervacijo zavrnemo - termina z zaposleniId=null NE
  // ustvarjamo (bil bi neviden za preverjanje zasedenosti in bi dopuščal
  // neomejeno kopičenje prekrivajočih se rezervacij, pravi hrošč najden
  // 2.9.2026).
  const koncniZaposleniId =
    zaposleniId || (await najdiProstegaZaposlenega({ storitevId: storitev.id, lokacijaId, datumOd: new Date(datumOd), datumDo: new Date(datumDo) }));
  if (!koncniZaposleniId) {
    return NextResponse.json({ napaka: "Za izbran termin žal ni več prostega izvajalca" }, { status: 409 });
  }

  // Spletna rezervacija čaka na potrditev osebja - termin ostane
  // "V_POTRJEVANJU", dokler ga osebje ne potrdi ali zavrže (glej
  // actions.ts, spremeniStatusTermina). Delovni nalog v TRONxERP se pošlje
  // ŠELE ob potrditvi (prehod v status REZERVIRAN), ne že tukaj ob
  // nastanku - naročnikova izrecna odločitev (2.9.2026), da se v TRONxERP
  // ne pošiljajo še nepotrjene spletne rezervacije.
  const termin = await prisma.termin.create({
    data: {
      datumOd: new Date(datumOd),
      datumDo: new Date(datumDo),
      status: "V_POTRJEVANJU",
      vir: "SPLET",
      lokacijaId,
      strankaId: strankaZapis.id,
      zaposleniId: koncniZaposleniId,
      cenaSkupaj: storitev.cena,
      zapisek: storitevId === POLJUBNA_STORITEV_SENTINEL ? String(opisZelje).trim() : null,
      registracija: registracija ? String(registracija).trim().toUpperCase() : null,
      storitve: {
        create: [{ storitevId: storitev.id, cena: storitev.cena, trajanjeMin: storitev.trajanjeMin }],
      },
    },
    include: { storitve: true, stranka: true },
  });

  return NextResponse.json(termin, { status: 201 });
}
