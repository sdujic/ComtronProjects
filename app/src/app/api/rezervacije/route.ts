import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { POLJUBNA_STORITEV_SENTINEL, zagotoviPoljubnoStoritev } from "@/lib/poljubna-storitev";
import { najdiProstegaZaposlenega, najdiProstoDelovnoMesto } from "@/lib/dostopnost";
import { jeVeljavenEmail } from "@/lib/validacija";

// Splošna (ne po-državna) preverba oblike sestavljene telefonske številke
// (klicna koda + številka, npr. "+38641234567") - natančno preverjanje po
// posamezni državi (dolžina glede na izbrano državo) se zgodi na klientu,
// kjer je znano, katera država je bila izbrana (glej rezervacija/page.tsx,
// jeVeljavnaStevilka). Tu samo osnovna zaščita pred očitno neveljavnimi
// vrednostmi pri neposrednem API klicu mimo obrazca.
const TELEFON_REGEX = /^\+\d{7,15}$/;

export async function POST(req: Request) {
  const podatki = await req.json();
  const { storitevId, zaposleniId, lokacijaId, datumOd, datumDo, stranka, opisZelje, registracija } = podatki;

  if (!storitevId || !lokacijaId || !datumOd || !datumDo || !stranka?.ime || !stranka?.priimek || !stranka?.telefon) {
    return NextResponse.json({ napaka: "Manjkajo obvezni podatki" }, { status: 400 });
  }
  if (storitevId === POLJUBNA_STORITEV_SENTINEL && !String(opisZelje || "").trim()) {
    return NextResponse.json({ napaka: "Opis želje je obvezen" }, { status: 400 });
  }
  if (!TELEFON_REGEX.test(String(stranka.telefon))) {
    return NextResponse.json({ napaka: "Neveljavna telefonska številka" }, { status: 400 });
  }
  if (stranka.email && !jeVeljavenEmail(String(stranka.email))) {
    return NextResponse.json({ napaka: "Neveljaven e-poštni naslov" }, { status: 400 });
  }

  // Hitrostna optimizacija (7.9.2026): te tri poizvedbe so med seboj
  // neodvisne (mesto rabi samo surov storitevId/lokacijaId, ne rezultat
  // storitve) - prej so tekle ena za drugo, zdaj vzporedno.
  const [storitev, obstojecaStranka, mestoRezultat] = await Promise.all([
    storitevId === POLJUBNA_STORITEV_SENTINEL
      ? zagotoviPoljubnoStoritev()
      : prisma.storitev.findUnique({ where: { id: storitevId } }),
    prisma.stranka.findFirst({ where: { telefon: stranka.telefon } }),
    // Fizično delovno mesto (rampa/stol ipd.), upravičeno za TO storitev, je
    // PRIMARNI pogoj - glej dostopnost.ts, najdiProstoDelovnoMesto. Uporabimo
    // surov storitevId (lahko sentinel POLJUBNA), ne razrešen storitev.id -
    // isto kot pregledDneva.
    najdiProstoDelovnoMesto({ storitevId, lokacijaId, datumOd: new Date(datumOd), datumDo: new Date(datumDo) }),
  ]);
  if (!storitev) {
    return NextResponse.json({ napaka: "Storitev ne obstaja" }, { status: 404 });
  }
  if (mestoRezultat.omejeno && !mestoRezultat.mestoId) {
    return NextResponse.json({ napaka: "Za izbran termin žal ni več prostega delovnega mesta" }, { status: 409 });
  }

  let strankaZapis = obstojecaStranka;
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
      mestoId: mestoRezultat.mestoId,
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
