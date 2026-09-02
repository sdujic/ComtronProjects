"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { tronXerpAdapter } from "@/lib/tronxerp-adapter";
import { najdiDejavnost } from "@/lib/dejavnosti";
import { pridobiNastavitve } from "@/lib/nastavitve";
import { najdiProstegaZaposlenega } from "@/lib/dostopnost";

export async function posodobiNastavitve(formData: FormData) {
  const korakMinutTermina = Math.min(30, Math.max(1, Number(formData.get("korakMinutTermina")) || 5));
  const podatki = {
    imeAplikacije: String(formData.get("imeAplikacije") || "Naročanje na termin"),
    dejavnost: String(formData.get("dejavnost") || "AVTOSERVIS"),
    slogan: String(formData.get("slogan") || "") || null,
    korakMinutTermina,
  };
  await prisma.nastavitve.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...podatki },
    update: podatki,
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/koledar");
}

// Ustvari manjkajočo kategorijo/storitve iz predloge za trenutno dejavnost -
// varno za ponovni klic (ne podvaja storitev z enakim nazivom).
export async function uvoziPredlogoStoritev() {
  const nastavitve = await pridobiNastavitve();
  const dejavnost = najdiDejavnost(nastavitve.dejavnost);
  if (dejavnost.predlogeStoritev.length === 0) return;

  let kategorija = await prisma.kategorijaStoritve.findFirst({ where: { naziv: dejavnost.kategorija } });
  if (!kategorija) {
    kategorija = await prisma.kategorijaStoritve.create({ data: { naziv: dejavnost.kategorija } });
  }

  for (const predloga of dejavnost.predlogeStoritev) {
    const obstaja = await prisma.storitev.findFirst({ where: { naziv: predloga.naziv } });
    if (obstaja) continue;
    await prisma.storitev.create({
      data: {
        naziv: predloga.naziv,
        opis: predloga.opis ?? null,
        trajanjeMin: predloga.trajanjeMin,
        cena: predloga.cena,
        kategorijaId: kategorija.id,
      },
    });
  }
  revalidatePath("/admin/storitve");
}

function parsiKoordinato(formData: FormData, polje: string): number | null {
  const vrednost = String(formData.get(polje) || "").trim();
  if (!vrednost) return null;
  const stevilo = Number(vrednost);
  return Number.isFinite(stevilo) ? stevilo : null;
}

export async function ustvariLokacijo(formData: FormData) {
  await prisma.lokacija.create({
    data: {
      naziv: String(formData.get("naziv")),
      naslov: String(formData.get("naslov") || "") || null,
      delovniCas: String(formData.get("delovniCas") || "") || null,
      drzava: String(formData.get("drzava") || "SI"),
      odprtoSobota: formData.get("odprtoSobota") === "on",
      odprtoNedelja: formData.get("odprtoNedelja") === "on",
      lat: parsiKoordinato(formData, "lat"),
      lng: parsiKoordinato(formData, "lng"),
    },
  });
  revalidatePath("/admin/lokacije");
}

// Koordinate se vnašajo ročno (kopirano iz Google Maps/OpenStreetMap - desni
// klik na lokacijo -> koordinate v oklepaju) - ni samodejnega geokodiranja
// iz naslova, glej opombo pri Lokacija.lat v schema.prisma.
export async function posodobiKoordinateLokacije(id: string, formData: FormData) {
  await prisma.lokacija.update({
    where: { id },
    data: { lat: parsiKoordinato(formData, "lat"), lng: parsiKoordinato(formData, "lng") },
  });
  revalidatePath("/admin/lokacije");
}

export async function izbrisiLokacijo(id: string) {
  await prisma.lokacija.update({ where: { id }, data: { aktivna: false } });
  revalidatePath("/admin/lokacije");
}

export async function preklopiDanLokacije(
  id: string,
  polje: "odprtoSobota" | "odprtoNedelja",
  trenutnaVrednost: boolean
) {
  await prisma.lokacija.update({ where: { id }, data: { [polje]: !trenutnaVrednost } });
  revalidatePath("/admin/lokacije");
}

export async function ustvariKategorijoStoritve(naziv: string) {
  if (!naziv.trim()) return;
  await prisma.kategorijaStoritve.create({ data: { naziv } });
  revalidatePath("/admin/storitve");
}

export async function ustvariStoritev(formData: FormData) {
  // Polje "min" na <input type="number"> v obrazcu prepreči negativne
  // vrednosti samo prek puščic/spinnerja brskalnika, ne pa tudi ročnega
  // vnosa ali neposrednega POST-a - zato preverimo tudi tu.
  const trajanjeMin = Math.max(1, Math.round(Number(formData.get("trajanjeMin")) || 0));
  const cena = Math.max(0, Number(formData.get("cena")) || 0);

  const storitev = await prisma.storitev.create({
    data: {
      naziv: String(formData.get("naziv")),
      opis: String(formData.get("opis") || "") || null,
      trajanjeMin,
      cena,
      kategorijaId: String(formData.get("kategorijaId") || "") || null,
      ercSifraArtikla: String(formData.get("ercSifraArtikla") || "") || null,
      vidnaNaSpletu: formData.get("vidnaNaSpletu") === "on",
    },
  });
  try {
    await tronXerpAdapter.sinhronizirajStoritev(storitev);
  } catch (e) {
    console.error("[TRONxERP] sinhronizacija storitve ni uspela", e);
  }
  revalidatePath("/admin/storitve");
}

export async function izbrisiStoritev(id: string) {
  await prisma.storitev.update({ where: { id }, data: { aktivna: false } });
  revalidatePath("/admin/storitve");
}

export async function ustvariZaposlenega(formData: FormData) {
  const lokacijaId = String(formData.get("lokacijaId") || "");
  const storitveIds = formData.getAll("storitveIds").map(String);

  await prisma.zaposleni.create({
    data: {
      ime: String(formData.get("ime")),
      priimek: String(formData.get("priimek")),
      email: String(formData.get("email") || "") || null,
      telefon: String(formData.get("telefon") || "") || null,
      lokacije: lokacijaId ? { create: [{ lokacijaId }] } : undefined,
      storitve: { create: storitveIds.map((storitevId) => ({ storitevId })) },
    },
  });
  revalidatePath("/admin/zaposleni");
}

export async function ustvariUrnik(formData: FormData) {
  await prisma.urnik.create({
    data: {
      zaposleniId: String(formData.get("zaposleniId")),
      lokacijaId: String(formData.get("lokacijaId")),
      dan: Number(formData.get("dan")),
      delovniCasOd: String(formData.get("delovniCasOd")),
      delovniCasDo: String(formData.get("delovniCasDo")),
      casRezervacijOd: String(formData.get("casRezervacijOd")),
      casRezervacijDo: String(formData.get("casRezervacijDo")),
    },
  });
  revalidatePath("/admin/urniki");
}

export async function izbrisiUrnik(id: string) {
  await prisma.urnik.delete({ where: { id } });
  revalidatePath("/admin/urniki");
}

export async function izbrisiZaposlenega(id: string) {
  await prisma.zaposleni.update({ where: { id }, data: { aktiven: false } });
  revalidatePath("/admin/zaposleni");
}

export async function dodajZapisekStranki(strankaId: string, formData: FormData) {
  const besedilo = String(formData.get("besedilo") || "");
  if (!besedilo.trim()) return;
  await prisma.zapisek.create({ data: { strankaId, besedilo } });
  revalidatePath(`/admin/stranke/${strankaId}`);
}

// Delovni nalog v TRONxERP se pošlje ŠELE ob prehodu termina v status
// REZERVIRAN (potrditev) - ne že ob nastanku spletne rezervacije (glej
// api/rezervacije/route.ts). Ob ročnem admin vnosu (ustvariTerminAdmin
// spodaj) je termin takoj REZERVIRAN, zato se delovni nalog pošlje takoj
// tam. Tu preverimo prejšnji status, da se nalog ne podvoji, če admin
// status samo "osveži" (npr. REZERVIRAN -> REZERVIRAN ni mogoče prek
// select-a, a NEPRIHOD -> REZERVIRAN -> NEPRIHOD -> REZERVIRAN bi se sicer
// poslalo dvakrat).
export async function spremeniStatusTermina(terminId: string, status: string) {
  const prejsnji = await prisma.termin.findUniqueOrThrow({ where: { id: terminId } });
  const termin = await prisma.termin.update({ where: { id: terminId }, data: { status } });

  if (status === "REZERVIRAN" && prejsnji.status !== "REZERVIRAN") {
    try {
      await tronXerpAdapter.sinhronizirajTermin(termin);
    } catch (e) {
      console.error("[TRONxERP] ustvarjanje delovnega naloga ni uspelo", e);
    }
  }

  revalidatePath("/admin/koledar");
}

export async function ustvariTerminAdmin(formData: FormData) {
  const storitevId = String(formData.get("storitevId"));
  const storitev = await prisma.storitev.findUniqueOrThrow({ where: { id: storitevId } });
  const datumOd = new Date(String(formData.get("datumOd")));
  const datumDo = new Date(datumOd.getTime() + storitev.trajanjeMin * 60000);
  const lokacijaId = String(formData.get("lokacijaId"));

  // Termin brez zaposleniId je neviden za preverjanje zasedenosti (glej
  // dostopnost.ts) - zato pri "-- samodejno --" izbiri poskusimo dodeliti
  // prvega prostega upravičenega izvajalca. Če nihče ni prost, termina NE
  // ustvarimo (prej se je tu tiho ustvaril termin z zaposleniId=null, ki je
  // bil neviden za preverjanje zasedenosti - to je dopuščalo neomejeno
  // kopičenje prekrivajočih se rezervacij na isti termin, pravi hrošč,
  // najden v testiranju 2.9.2026).
  const izbranZaposleniId = String(formData.get("zaposleniId") || "") || null;
  const zaposleniId =
    izbranZaposleniId ?? (await najdiProstegaZaposlenega({ storitevId, lokacijaId, datumOd, datumDo }));

  if (!zaposleniId) {
    throw new Error(
      "Za izbrano storitev/termin trenutno ni prostega izvajalca - izberite drug termin ali izvajalca."
    );
  }

  const termin = await prisma.termin.create({
    data: {
      datumOd,
      datumDo,
      status: "REZERVIRAN",
      vir: "ADMIN",
      lokacijaId,
      strankaId: String(formData.get("strankaId")),
      zaposleniId,
      cenaSkupaj: storitev.cena,
      registracija: String(formData.get("registracija") || "").trim().toUpperCase() || null,
      storitve: {
        create: [{ storitevId, cena: storitev.cena, trajanjeMin: storitev.trajanjeMin }],
      },
    },
  });

  try {
    await tronXerpAdapter.sinhronizirajTermin(termin);
  } catch (e) {
    console.error("[TRONxERP] ustvarjanje delovnega naloga ni uspelo", e);
  }

  revalidatePath("/admin/koledar");
}
