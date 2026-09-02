import { prisma } from "@/lib/prisma";
import { jePraznik, najdiPraznik } from "@/lib/prazniki";
import { POLJUBNA_STORITEV_SENTINEL, POLJUBNA_TRAJANJE_MIN } from "@/lib/poljubna-storitev";
import { lokalniDatumString } from "@/lib/datum";

const KORAK_MIN = 30;

function casVMinute(cas: string) {
  const [h, m] = cas.split(":").map(Number);
  return h * 60 + m;
}

function minuteVCas(min: number) {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ISO: 1 = ponedeljek ... 7 = nedelja
function isoDanVTednu(datum: Date) {
  const dan = datum.getDay();
  return dan === 0 ? 7 : dan;
}

function datumOb(datum: Date, ura: string) {
  const rezultat = new Date(datum);
  const [h, m] = ura.split(":").map(Number);
  rezultat.setHours(h, m, 0, 0);
  return rezultat;
}

export interface ProstiTermin {
  zaposleniId: string;
  datumOd: Date;
  datumDo: Date;
}

export async function najdiProsteTermine(params: {
  storitevId: string;
  zaposleniId?: string;
  lokacijaId: string;
  datum: Date;
}): Promise<ProstiTermin[]> {
  const { storitevId, zaposleniId, lokacijaId, datum } = params;

  const [storitev, lokacija] = await Promise.all([
    prisma.storitev.findUnique({ where: { id: storitevId } }),
    prisma.lokacija.findUnique({ where: { id: lokacijaId } }),
  ]);
  if (!storitev || !lokacija) return [];

  if (jePraznik(lokacija.drzava, datum)) return [];

  const dan0 = datum.getDay();
  if (dan0 === 0 && !lokacija.odprtoNedelja) return [];
  if (dan0 === 6 && !lokacija.odprtoSobota) return [];

  const izvajalci = await prisma.zaposleni.findMany({
    where: {
      aktiven: true,
      ...(zaposleniId ? { id: zaposleniId } : {}),
      storitve: { some: { storitevId } },
      lokacije: { some: { lokacijaId } },
    },
  });
  if (izvajalci.length === 0) return [];

  const dan = isoDanVTednu(datum);
  const zacetekDneva = new Date(datum);
  zacetekDneva.setHours(0, 0, 0, 0);
  const koncDneva = new Date(datum);
  koncDneva.setHours(23, 59, 59, 999);

  const rezultat: ProstiTermin[] = [];

  for (const zaposleni of izvajalci) {
    const urnik = await prisma.urnik.findFirst({
      where: { zaposleniId: zaposleni.id, lokacijaId, dan },
    });
    if (!urnik) continue;

    const obstojeciTermini = await prisma.termin.findMany({
      where: {
        zaposleniId: zaposleni.id,
        status: { not: "ODPOVEDAN" },
        datumOd: { lte: koncDneva },
        datumDo: { gte: zacetekDneva },
      },
    });

    const odMin = casVMinute(urnik.casRezervacijOd);
    const doMin = casVMinute(urnik.casRezervacijDo);

    for (let slotOd = odMin; slotOd + storitev.trajanjeMin <= doMin; slotOd += KORAK_MIN) {
      const slotDo = slotOd + storitev.trajanjeMin;
      const datumOd = datumOb(datum, minuteVCas(slotOd));
      const datumDo = datumOb(datum, minuteVCas(slotDo));

      const zaseden = obstojeciTermini.some((t) => datumOd < t.datumDo && datumDo > t.datumOd);
      if (!zaseden) {
        rezultat.push({ zaposleniId: zaposleni.id, datumOd, datumDo });
      }
    }
  }

  return rezultat.sort((a, b) => a.datumOd.getTime() - b.datumOd.getTime());
}

// --- Dnevni/tedenski/mesečni pregled (javno-varen: zasedeni sloti brez podatkov o stranki) ---

export interface Slot {
  ura: string;
  datumOd: Date;
  datumDo: Date;
  prost: boolean;
  zaposleniId?: string;
  prostihMest: number;
}

export interface DnevniPregled {
  datum: string;
  zaprto: boolean;
  razlogZaprtja?: string;
  sloti: Slot[];
}

async function resiIzvajalceInTrajanje(storitevId: string, zaposleniId: string | undefined, lokacijaId: string) {
  if (storitevId === POLJUBNA_STORITEV_SENTINEL) {
    const izvajalci = await prisma.zaposleni.findMany({
      where: {
        aktiven: true,
        ...(zaposleniId ? { id: zaposleniId } : {}),
        lokacije: { some: { lokacijaId } },
      },
    });
    return { trajanjeMin: POLJUBNA_TRAJANJE_MIN, izvajalci };
  }

  const storitev = await prisma.storitev.findUnique({ where: { id: storitevId } });
  if (!storitev) return null;

  const izvajalci = await prisma.zaposleni.findMany({
    where: {
      aktiven: true,
      ...(zaposleniId ? { id: zaposleniId } : {}),
      storitve: { some: { storitevId } },
      lokacije: { some: { lokacijaId } },
    },
  });
  return { trajanjeMin: storitev.trajanjeMin, izvajalci };
}

// Za ročno ustvarjanje termina v adminu brez izbire izvajalca ("-- brez --")
// - poišče prvega prostega upravičenega izvajalca, da termin dejansko
// zasede njegov urnik (termin brez zaposleniId je sicer neviden za
// preverjanje zasedenosti, glej pregledDneva zgoraj). Vrne null, če ni
// nihče prost (redek rob - admin lahko kljub temu vztraja pri "brez").
export async function najdiProstegaZaposlenega(params: {
  storitevId: string;
  lokacijaId: string;
  datumOd: Date;
  datumDo: Date;
}): Promise<string | null> {
  const { storitevId, lokacijaId, datumOd, datumDo } = params;
  const resitev = await resiIzvajalceInTrajanje(storitevId, undefined, lokacijaId);
  if (!resitev) return null;

  for (const zaposleni of resitev.izvajalci) {
    const prekrivanje = await prisma.termin.findFirst({
      where: {
        zaposleniId: zaposleni.id,
        status: { not: "ODPOVEDAN" },
        datumOd: { lt: datumDo },
        datumDo: { gt: datumOd },
      },
    });
    if (!prekrivanje) return zaposleni.id;
  }
  return null;
}

// Vrne VSE upravičene izvajalce, ki so dejansko prosti v točno tem
// terminu - uporablja se za izbiro izvajalca PO izbiri termina (ne prej),
// da se že zaseden izvajalec sploh ne ponudi (glej rezervacija/page.tsx in
// admin/koledar - "Nov termin").
export async function prostiIzvajalciZaTermin(params: {
  storitevId: string;
  lokacijaId: string;
  datumOd: Date;
  datumDo: Date;
}) {
  const { storitevId, lokacijaId, datumOd, datumDo } = params;
  const resitev = await resiIzvajalceInTrajanje(storitevId, undefined, lokacijaId);
  if (!resitev) return [];

  const prosti = [];
  for (const zaposleni of resitev.izvajalci) {
    const prekrivanje = await prisma.termin.findFirst({
      where: {
        zaposleniId: zaposleni.id,
        status: { not: "ODPOVEDAN" },
        datumOd: { lt: datumDo },
        datumDo: { gt: datumOd },
      },
    });
    if (!prekrivanje) prosti.push({ id: zaposleni.id, ime: zaposleni.ime, priimek: zaposleni.priimek });
  }
  return prosti;
}

export async function pregledDneva(params: {
  storitevId: string;
  zaposleniId?: string;
  lokacijaId: string;
  datum: Date;
}): Promise<DnevniPregled> {
  const { storitevId, zaposleniId, lokacijaId, datum } = params;
  const datumStr = lokalniDatumString(datum);

  const lokacija = await prisma.lokacija.findUnique({ where: { id: lokacijaId } });
  if (!lokacija) return { datum: datumStr, zaprto: true, razlogZaprtja: "Lokacija ne obstaja", sloti: [] };

  const praznik = najdiPraznik(lokacija.drzava, datum);
  if (praznik) return { datum: datumStr, zaprto: true, razlogZaprtja: praznik, sloti: [] };

  const dan0 = datum.getDay();
  if (dan0 === 0 && !lokacija.odprtoNedelja) return { datum: datumStr, zaprto: true, razlogZaprtja: "Nedelja", sloti: [] };
  if (dan0 === 6 && !lokacija.odprtoSobota) return { datum: datumStr, zaprto: true, razlogZaprtja: "Sobota", sloti: [] };

  const resitev = await resiIzvajalceInTrajanje(storitevId, zaposleniId, lokacijaId);
  if (!resitev || resitev.izvajalci.length === 0) {
    return { datum: datumStr, zaprto: true, razlogZaprtja: "Ni razpoložljivih izvajalcev", sloti: [] };
  }
  const { trajanjeMin, izvajalci } = resitev;

  const dan = isoDanVTednu(datum);
  const zacetekDneva = new Date(datum);
  zacetekDneva.setHours(0, 0, 0, 0);
  const koncDneva = new Date(datum);
  koncDneva.setHours(23, 59, 59, 999);

  // minuta od polnoci -> katera izvajalci so na ta slot prosti
  const prostiPoMinuti = new Map<number, Set<string>>();

  for (const zaposleni of izvajalci) {
    const urnik = await prisma.urnik.findFirst({ where: { zaposleniId: zaposleni.id, lokacijaId, dan } });
    if (!urnik) continue;

    const obstojeciTermini = await prisma.termin.findMany({
      where: {
        zaposleniId: zaposleni.id,
        status: { not: "ODPOVEDAN" },
        datumOd: { lte: koncDneva },
        datumDo: { gte: zacetekDneva },
      },
    });

    const odMin = casVMinute(urnik.casRezervacijOd);
    const doMin = casVMinute(urnik.casRezervacijDo);

    for (let slotOd = odMin; slotOd + trajanjeMin <= doMin; slotOd += KORAK_MIN) {
      const slotDo = slotOd + trajanjeMin;
      const datumOd = datumOb(datum, minuteVCas(slotOd));
      const datumDo = datumOb(datum, minuteVCas(slotDo));

      if (!prostiPoMinuti.has(slotOd)) prostiPoMinuti.set(slotOd, new Set());

      const zaseden = obstojeciTermini.some((t) => datumOd < t.datumDo && datumDo > t.datumOd);
      if (!zaseden) prostiPoMinuti.get(slotOd)!.add(zaposleni.id);
    }
  }

  const sloti: Slot[] = [...prostiPoMinuti.entries()]
    .sort(([a], [b]) => a - b)
    .map(([slotOd, prostiSet]) => {
      const datumOd = datumOb(datum, minuteVCas(slotOd));
      const datumDo = datumOb(datum, minuteVCas(slotOd + trajanjeMin));
      const prost = prostiSet.size > 0;
      return {
        ura: minuteVCas(slotOd),
        datumOd,
        datumDo,
        prost,
        zaposleniId: prost ? [...prostiSet][0] : undefined,
        prostihMest: prostiSet.size,
      };
    });

  return { datum: datumStr, zaprto: false, sloti };
}

function ponedeljekTedna(datum: Date) {
  const rezultat = new Date(datum);
  const dan = isoDanVTednu(datum);
  rezultat.setDate(rezultat.getDate() - (dan - 1));
  rezultat.setHours(0, 0, 0, 0);
  return rezultat;
}

export async function pregledTedna(params: {
  storitevId: string;
  zaposleniId?: string;
  lokacijaId: string;
  datum: Date;
}): Promise<DnevniPregled[]> {
  const ponedeljek = ponedeljekTedna(params.datum);
  const dnevi: DnevniPregled[] = [];
  for (let i = 0; i < 7; i++) {
    const dan = new Date(ponedeljek);
    dan.setDate(dan.getDate() + i);
    dnevi.push(await pregledDneva({ ...params, datum: dan }));
  }
  return dnevi;
}

export interface DanPovzetek {
  datum: string;
  zaprto: boolean;
  razlogZaprtja?: string;
  steviloProstih: number;
}

export async function pregledMeseca(params: {
  storitevId: string;
  zaposleniId?: string;
  lokacijaId: string;
  leto: number;
  mesec: number; // 1-12
}): Promise<DanPovzetek[]> {
  const { leto, mesec, ...ostalo } = params;
  const steviloDni = new Date(leto, mesec, 0).getDate();
  const rezultat: DanPovzetek[] = [];

  for (let d = 1; d <= steviloDni; d++) {
    const datum = new Date(leto, mesec - 1, d);
    const dan = await pregledDneva({ ...ostalo, datum });
    rezultat.push({
      datum: dan.datum,
      zaprto: dan.zaprto,
      razlogZaprtja: dan.razlogZaprtja,
      steviloProstih: dan.sloti.filter((s) => s.prost).length,
    });
  }

  return rezultat;
}
