"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { tronXerpAdapter } from "@/lib/tronxerp-adapter";
import { najdiDejavnost } from "@/lib/dejavnosti";
import { pridobiNastavitve } from "@/lib/nastavitve";
import { najdiProstegaZaposlenega, najdiProstoDelovnoMesto, obstajaIzvajalecZaStoritev } from "@/lib/dostopnost";

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
  revalidatePath("/admin/zaposleni");
}

export async function posodobiStranko(id: string, formData: FormData) {
  await prisma.stranka.update({
    where: { id },
    data: {
      ime: String(formData.get("ime")),
      priimek: String(formData.get("priimek")),
      email: String(formData.get("email") || "") || null,
      telefon: String(formData.get("telefon")),
    },
  });
  revalidatePath(`/admin/stranke/${id}`);
  revalidatePath("/admin/stranke");
}

export async function posodobiOsnovnePodatkeLokacije(id: string, formData: FormData) {
  await prisma.lokacija.update({
    where: { id },
    data: {
      naziv: String(formData.get("naziv")),
      naslov: String(formData.get("naslov") || "") || null,
      delovniCas: String(formData.get("delovniCas") || "") || null,
      drzava: String(formData.get("drzava") || "SI"),
      casRezervacijOd: String(formData.get("casRezervacijOd") || "") || null,
      casRezervacijDo: String(formData.get("casRezervacijDo") || "") || null,
    },
  });
  revalidatePath("/admin/lokacije");
  revalidatePath("/admin/zaposleni");
}

// Koordinate se vnašajo ročno (kopirano iz Google Maps/OpenStreetMap - desni
// klik na lokacijo -> koordinate v oklepaju) - ni samodejnega geokodiranja
// iz naslova, glej opombo pri Lokacija.lat v schema.prisma. Fizična delovna
// mesta (rampe/stoli - primarni pogoj zasedenosti) se urejajo LOČENO, glej
// ustvariDelovnoMesto spodaj.
export async function posodobiNastavitveLokacije(id: string, formData: FormData) {
  await prisma.lokacija.update({
    where: { id },
    data: {
      lat: parsiKoordinato(formData, "lat"),
      lng: parsiKoordinato(formData, "lng"),
    },
  });
  revalidatePath("/admin/lokacije");
  revalidatePath("/admin/zaposleni");
}

// updateMany namesto update - če je zapis medtem že izbrisan/spremenjen na
// drugem zavihku (npr. dva admina na isti strani), update z where:{id} vrže
// napako "Record not found" (P2025), updateMany na 0 zadetkih samo tiho ne
// naredi nič - brisanje naj bo idempotentno.
export async function izbrisiLokacijo(id: string) {
  await prisma.lokacija.updateMany({ where: { id }, data: { aktivna: false } });
  revalidatePath("/admin/lokacije");
  revalidatePath("/admin/zaposleni");
}

export async function preklopiDanLokacije(
  id: string,
  polje: "odprtoSobota" | "odprtoNedelja",
  trenutnaVrednost: boolean
) {
  await prisma.lokacija.update({ where: { id }, data: { [polje]: !trenutnaVrednost } });
  revalidatePath("/admin/lokacije");
  revalidatePath("/admin/zaposleni");
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
  revalidatePath("/admin/lokacije");
  revalidatePath("/admin/zaposleni");
  revalidatePath("/admin/koledar");
}

// Ne sinhronizira ponovno v TRONxERP (`saveArticle` se kliče samo ob
// ustvarjanju, glej ustvariStoritev) - namerna poenostavitev, dokumentirana
// v README, ni bila del te zahteve (samo lokalno urejanje polj).
export async function posodobiStoritev(id: string, formData: FormData) {
  const trajanjeMin = Math.max(1, Math.round(Number(formData.get("trajanjeMin")) || 0));
  const cena = Math.max(0, Number(formData.get("cena")) || 0);
  await prisma.storitev.update({
    where: { id },
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
  revalidatePath("/admin/storitve");
  revalidatePath("/admin/lokacije");
  revalidatePath("/admin/zaposleni");
  revalidatePath("/admin/koledar");
}

export async function izbrisiStoritev(id: string) {
  await prisma.storitev.updateMany({ where: { id }, data: { aktivna: false } });
  revalidatePath("/admin/storitve");
  revalidatePath("/admin/lokacije");
  revalidatePath("/admin/zaposleni");
  revalidatePath("/admin/koledar");
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

export async function posodobiZaposlenega(id: string, formData: FormData) {
  const lokacijaId = String(formData.get("lokacijaId") || "");
  const storitveIds = formData.getAll("storitveIds").map(String);

  await prisma.$transaction([
    prisma.zaposleni.update({
      where: { id },
      data: {
        ime: String(formData.get("ime")),
        priimek: String(formData.get("priimek")),
        email: String(formData.get("email") || "") || null,
        telefon: String(formData.get("telefon") || "") || null,
      },
    }),
    prisma.zaposleniLokacija.deleteMany({ where: { zaposleniId: id } }),
    prisma.zaposleniLokacija.createMany({
      data: lokacijaId ? [{ zaposleniId: id, lokacijaId }] : [],
    }),
    prisma.zaposleniStoritev.deleteMany({ where: { zaposleniId: id } }),
    prisma.zaposleniStoritev.createMany({
      data: storitveIds.map((storitevId) => ({ zaposleniId: id, storitevId })),
    }),
  ]);
  revalidatePath("/admin/zaposleni");
}

export async function ustvariUrnik(formData: FormData) {
  const zaposleniId = String(formData.get("zaposleniId"));
  const lokacijaId = String(formData.get("lokacijaId"));
  const dan = Number(formData.get("dan"));
  const podatki = {
    delovniCasOd: String(formData.get("delovniCasOd")),
    delovniCasDo: String(formData.get("delovniCasDo")),
    casRezervacijOd: String(formData.get("casRezervacijOd")),
    casRezervacijDo: String(formData.get("casRezervacijDo")),
  };
  // Čas za rezervacije je tisti, ki dejansko šteje za razpoložljivost
  // terminov (glej dostopnost.ts) - MORA biti znotraj delovnega časa, sicer
  // bi bil zaposleni "na voljo" v urah, ko sploh ne dela (npr. delovni čas
  // 8-12, a rezervacije do 15.30 - najdeno pri naročnikovem testiranju).
  // Obrazec (UrnikObrazec.tsx) to preprečuje že na klientu, tu je varovalka.
  if (
    podatki.casRezervacijOd < podatki.delovniCasOd ||
    podatki.casRezervacijDo > podatki.delovniCasDo ||
    podatki.casRezervacijOd >= podatki.casRezervacijDo
  ) {
    throw new Error("Čas za rezervacije mora biti znotraj delovnega časa (in 'od' pred 'do').");
  }
  // Za isto kombinacijo zaposleni+lokacija+dan urnik PREPIŠE obstoječega
  // (upsert), namesto da bi ustvaril podvojen zapis za isti dan.
  await prisma.urnik.upsert({
    where: { zaposleniId_lokacijaId_dan: { zaposleniId, lokacijaId, dan } },
    update: podatki,
    create: { zaposleniId, lokacijaId, dan, ...podatki },
  });
  revalidatePath("/admin/urniki");
}

export async function izbrisiUrnik(id: string) {
  await prisma.urnik.deleteMany({ where: { id } });
  revalidatePath("/admin/urniki");
}

export async function izbrisiZaposlenega(id: string) {
  await prisma.zaposleni.updateMany({ where: { id }, data: { aktiven: false } });
  revalidatePath("/admin/zaposleni");
}

// Fizično delovno mesto (rampa/stol ipd., glej DelovnoMesto v
// schema.prisma) - vsako mesto ima SVOJ nabor storitev, ki jih lahko
// izvaja (npr. "Rampa 1" samo menjavo gum, "Rampa 2" tudi redni servis).
// To je PRIMARNI pogoj zasedenosti, glej dostopnost.ts.
export async function ustvariDelovnoMesto(lokacijaId: string, formData: FormData) {
  const naziv = String(formData.get("naziv") || "").trim();
  if (!naziv) return;
  const storitveIds = formData.getAll("storitveIds").map(String);

  await prisma.delovnoMesto.create({
    data: {
      lokacijaId,
      naziv,
      storitve: { create: storitveIds.map((storitevId) => ({ storitevId })) },
    },
  });
  revalidatePath("/admin/lokacije");
  revalidatePath("/admin/zaposleni");
}

// Posodobi naziv IN cel nabor storitev za obstoječe delovno mesto (naziv
// preprosto update, storitve izbriši vse pa ustvari izbrane - enostavnejše
// od primerjave razlik, varno ker DelovnoMestoStoritev nima lastnih
// podatkov razen veznih ključev).
export async function posodobiDelovnoMesto(id: string, formData: FormData) {
  const naziv = String(formData.get("naziv") || "").trim();
  const storitveIds = formData.getAll("storitveIds").map(String);
  await prisma.$transaction([
    prisma.delovnoMesto.update({ where: { id }, data: naziv ? { naziv } : {} }),
    prisma.delovnoMestoStoritev.deleteMany({ where: { delovnoMestoId: id } }),
    prisma.delovnoMestoStoritev.createMany({
      data: storitveIds.map((storitevId) => ({ delovnoMestoId: id, storitevId })),
    }),
  ]);
  revalidatePath("/admin/lokacije");
  revalidatePath("/admin/zaposleni");
}

export async function izbrisiDelovnoMesto(id: string) {
  await prisma.delovnoMesto.updateMany({ where: { id }, data: { aktivno: false } });
  revalidatePath("/admin/lokacije");
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

  // Fizično delovno mesto (rampa/stol ipd.) je PRIMARNI pogoj - preverimo
  // PRED izvajalcem, tudi če je izvajalec sam po sebi prost, termina ne
  // ustvarimo, če ni prostega mesta, upravičenega za TO storitev.
  const mestoRezultat = await najdiProstoDelovnoMesto({ storitevId, lokacijaId, datumOd, datumDo });
  if (mestoRezultat.omejeno && !mestoRezultat.mestoId) {
    throw new Error("Za izbrano storitev trenutno ni prostega delovnega mesta na tej lokaciji.");
  }

  // Termin brez zaposleniId je neviden za preverjanje zasedenosti (glej
  // dostopnost.ts) - zato pri "-- samodejno --" izbiri poskusimo dodeliti
  // prvega prostega upravičenega izvajalca. Če nihče ni prost, termina NE
  // ustvarimo (prej se je tu tiho ustvaril termin z zaposleniId=null, ki je
  // bil neviden za preverjanje zasedenosti - to je dopuščalo neomejeno
  // kopičenje prekrivajočih se rezervacij na isti termin, pravi hrošč,
  // najden v testiranju 2.9.2026).
  const nimaIzvajalcev = !(await obstajaIzvajalecZaStoritev(storitevId, lokacijaId));
  const izbranZaposleniId = String(formData.get("zaposleniId") || "") || null;
  const zaposleniId =
    izbranZaposleniId ??
    (nimaIzvajalcev ? null : await najdiProstegaZaposlenega({ storitevId, lokacijaId, datumOd, datumDo }));

  if (!zaposleniId && !(nimaIzvajalcev && mestoRezultat.mestoId)) {
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
      mestoId: mestoRezultat.mestoId,
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
