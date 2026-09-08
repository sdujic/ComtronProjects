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

// Ali za to storitev/lokacijo obstaja SPLOH kak (aktiven) zaposleni - ne
// glede na trenutno zasedenost. Uporabljeno pri ustvarjanju termina za
// razlikovanje "ni zaposlenih, lokacija deluje prek delovnih mest" (glej
// pregledDnevaPoMestih spodaj) od "zaposleni obstajajo, a so trenutno vsi
// zasedeni" - slednje NE sme tiho preskociti na rezervacijo samo prek
// delovnega mesta (npr. avtoservis MORA imeti dodeljenega mehanika).
export async function obstajaIzvajalecZaStoritev(storitevId: string, lokacijaId: string): Promise<boolean> {
  const pogoji =
    storitevId === POLJUBNA_STORITEV_SENTINEL
      ? { aktiven: true, lokacije: { some: { lokacijaId } } }
      : { aktiven: true, storitve: { some: { storitevId } }, lokacije: { some: { lokacijaId } } };
  const stevilo = await prisma.zaposleni.count({ where: pogoji });
  return stevilo > 0;
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
  if (!resitev || resitev.izvajalci.length === 0) return null;

  // En paketen poizvedovanje namesto po ene na zaposlenega (hitrostna
  // optimizacija, 7.9.2026 - prej N zaporednih poizvedb, zdaj vedno ena).
  const zasedeni = await zasedeniIzMnozice(
    resitev.izvajalci.map((z) => z.id),
    "zaposleniId",
    datumOd,
    datumDo
  );
  for (const zaposleni of resitev.izvajalci) {
    if (!zasedeni.has(zaposleni.id)) return zaposleni.id;
  }
  return null;
}

// Paketno preveri zasedenost VEČ kandidatov (zaposleni ali delovna mesta)
// hkrati z ENO poizvedbo namesto ene na kandidata - hitrostna optimizacija.
// `polje` je ime FK stolpca na Terminu ("zaposleniId" ali "mestoId").
async function zasedeniIzMnozice(
  idji: string[],
  polje: "zaposleniId" | "mestoId",
  datumOd: Date,
  datumDo: Date
): Promise<Set<string>> {
  if (idji.length === 0) return new Set();
  const termini =
    polje === "zaposleniId"
      ? await prisma.termin.findMany({
          where: { zaposleniId: { in: idji }, status: { not: "ODPOVEDAN" }, datumOd: { lt: datumDo }, datumDo: { gt: datumOd } },
          select: { zaposleniId: true },
        })
      : await prisma.termin.findMany({
          where: { mestoId: { in: idji }, status: { not: "ODPOVEDAN" }, datumOd: { lt: datumDo }, datumDo: { gt: datumOd } },
          select: { mestoId: true },
        });
  const zasedeni = new Set<string>();
  for (const t of termini) {
    const vrednost = polje === "zaposleniId" ? (t as { zaposleniId: string | null }).zaposleniId : (t as { mestoId: string | null }).mestoId;
    if (vrednost != null) zasedeni.add(vrednost);
  }
  return zasedeni;
}

// Vrne upravičena delovna mesta za to storitev na tej lokaciji - poljubna
// storitev (glej poljubna-storitev.ts) ni vezana na specifično mesto,
// zato je zanjo upravičeno VSAKO aktivno mesto (ista poenostavitev kot pri
// izvajalcih v resiIzvajalceInTrajanje - katerokoli mesto lahko sprejme
// poljubno željo/težavo).
//
// Sortirano naraščajoče po številu storitev, ki jih mesto podpira (najbolj
// "ekskluzivna" mesta najprej) - pomembno pri DODELJEVANJU (glej
// najdiProstoDelovnoMesto): če ima npr. avtoservis "Rampo 1" (samo menjava
// gum) in "Rampo 2" (menjava gum + redni servis), mora rezervacija za
// menjavo gum prednostno zasesti Rampo 1, NE Rampe 2 - sicer bi po
// nepotrebnem zasedla edino rampo, ki zna redni servis, in bi ta storitev
// postala nedosegljiva, čeprav bi Rampa 1 zadoščala. To je naročnikova
// izrecna zahteva (7.9.2026, primer z 2 rampama).
async function upravicenaDelovnaMesta(storitevId: string, lokacijaId: string) {
  const mesta =
    storitevId === POLJUBNA_STORITEV_SENTINEL
      ? await prisma.delovnoMesto.findMany({
          where: { lokacijaId, aktivno: true },
          include: { _count: { select: { storitve: true } } },
        })
      : await prisma.delovnoMesto.findMany({
          where: { lokacijaId, aktivno: true, storitve: { some: { storitevId } } },
          include: { _count: { select: { storitve: true } } },
        });
  return mesta.sort((a, b) => a._count.storitve - b._count.storitve);
}

export interface RezultatDelovnegaMesta {
  // Ali ima ta LOKACIJA sploh definirana delovna mesta - če ne (privzeto
  // stanje), ni omejitve (obstoječe obnašanje, samo po zaposlenih), ne
  // glede na storitev.
  omejeno: boolean;
  // Id prostega upravičenega mesta, ali null, če je lokacija omejena IN ni
  // nobeno mesto prosto (ali ta storitev na tej lokaciji nima nobenega
  // upravičenega mesta - admin ga ni dodal na noben ramp/stol).
  mestoId: string | null;
}

// Primarni pogoj zasedenosti - poišče prosto fizično delovno mesto (rampa,
// stol ipd., glej DelovnoMesto v schema.prisma) za točno to storitev/termin.
// Eno mesto streže samo EN termin naenkrat, ne glede na izvajalca. Uporabi
// se PRED ustvarjanjem termina (ustvariTerminAdmin, /api/rezervacije), da
// fizične kapacitete ni mogoče preseči, tudi če je izvajalec sam po sebi
// prost.
export async function najdiProstoDelovnoMesto(params: {
  storitevId: string;
  lokacijaId: string;
  datumOd: Date;
  datumDo: Date;
}): Promise<RezultatDelovnegaMesta> {
  const { storitevId, lokacijaId, datumOd, datumDo } = params;

  const steviloVsehMest = await prisma.delovnoMesto.count({ where: { lokacijaId, aktivno: true } });
  if (steviloVsehMest === 0) return { omejeno: false, mestoId: null };

  const upravicena = await upravicenaDelovnaMesta(storitevId, lokacijaId);
  const zasedena = await zasedeniIzMnozice(
    upravicena.map((m) => m.id),
    "mestoId",
    datumOd,
    datumDo
  );
  for (const mesto of upravicena) {
    if (!zasedena.has(mesto.id)) return { omejeno: true, mestoId: mesto.id };
  }
  return { omejeno: true, mestoId: null };
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

  const zasedeni = await zasedeniIzMnozice(
    resitev.izvajalci.map((z) => z.id),
    "zaposleniId",
    datumOd,
    datumDo
  );
  return resitev.izvajalci
    .filter((z) => !zasedeni.has(z.id))
    .map((z) => ({ id: z.id, ime: z.ime, priimek: z.priimek }));
}

// Dnevni pregled za lokacijo BREZ lastnih zaposlenih za to storitev -
// prosti termini se generirajo neposredno iz rezervacijskega okna lokacije
// (Lokacija.casRezervacijOd/Do) in kapacitete upravicenih delovnih mest, ne
// iz zaposlenega urnika (ki tu ne obstaja). En termin = eno mesto, ne glede
// na izvajalca (zaposleniId ostane prazen, glej Termin.zaposleniId).
async function pregledDnevaPoMestih(params: {
  datumStr: string;
  datum: Date;
  trajanjeMin: number;
  mesta: { id: string }[];
  casRezervacijOd: string;
  casRezervacijDo: string;
}): Promise<DnevniPregled> {
  const { datumStr, datum, trajanjeMin, mesta, casRezervacijOd, casRezervacijDo } = params;
  const zacetekDneva = new Date(datum);
  zacetekDneva.setHours(0, 0, 0, 0);
  const koncDneva = new Date(datum);
  koncDneva.setHours(23, 59, 59, 999);

  const odMin = casVMinute(casRezervacijOd);
  const doMin = casVMinute(casRezervacijDo);
  const mestaIds = mesta.map((m) => m.id);

  const termini = await prisma.termin.findMany({
    where: {
      mestoId: { in: mestaIds },
      status: { not: "ODPOVEDAN" },
      datumOd: { lte: koncDneva },
      datumDo: { gte: zacetekDneva },
    },
  });

  const sloti: Slot[] = [];
  for (let slotOd = odMin; slotOd + trajanjeMin <= doMin; slotOd += KORAK_MIN) {
    const slotDo = slotOd + trajanjeMin;
    const slotDatumOd = datumOb(datum, minuteVCas(slotOd));
    const slotDatumDo = datumOb(datum, minuteVCas(slotDo));

    const prostihMest = mesta.filter(
      (m) => !termini.some((t) => t.mestoId === m.id && slotDatumOd < t.datumDo && slotDatumDo > t.datumOd)
    ).length;

    sloti.push({
      ura: minuteVCas(slotOd),
      datumOd: slotDatumOd,
      datumDo: slotDatumDo,
      prost: prostihMest > 0,
      zaposleniId: undefined,
      prostihMest,
    });
  }

  return { datum: datumStr, zaprto: false, sloti };
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
  if (!resitev) {
    return { datum: datumStr, zaprto: true, razlogZaprtja: "Ni razpoložljivih izvajalcev", sloti: [] };
  }
  if (resitev.izvajalci.length === 0) {
    const upravicenaMesta = await upravicenaDelovnaMesta(storitevId, lokacijaId);
    if (upravicenaMesta.length === 0 || !lokacija.casRezervacijOd || !lokacija.casRezervacijDo) {
      return { datum: datumStr, zaprto: true, razlogZaprtja: "Ni razpoložljivih izvajalcev", sloti: [] };
    }
    return pregledDnevaPoMestih({
      datumStr,
      datum,
      trajanjeMin: resitev.trajanjeMin,
      mesta: upravicenaMesta,
      casRezervacijOd: lokacija.casRezervacijOd,
      casRezervacijDo: lokacija.casRezervacijDo,
    });
  }
  const { trajanjeMin, izvajalci } = resitev;

  const dan = isoDanVTednu(datum);
  const zacetekDneva = new Date(datum);
  zacetekDneva.setHours(0, 0, 0, 0);
  const koncDneva = new Date(datum);
  koncDneva.setHours(23, 59, 59, 999);

  // Hitrostna optimizacija (7.9.2026): prej je zanka spodaj za VSAKEGA
  // zaposlenega posebej poizvedovala urnik + termine (2*N poizvedb
  // zaporedno) - zdaj vse potrebno pridobimo v NAJVEČ 4 vzporednih
  // poizvedbah (Promise.all), ne glede na število zaposlenih/mest, nato
  // obdelamo v pomnilniku. Pri tedenskem/mesečnem pregledu (7x/31x klic
  // pregledDneva) je bil ta N+1 vzorec glavni vzrok počasnega odpiranja
  // prostih terminov.
  const izvajalciIds = izvajalci.map((z) => z.id);
  const [urniki, terminiZaposlenih, steviloVsehMest, upravicenaMesta] = await Promise.all([
    prisma.urnik.findMany({ where: { zaposleniId: { in: izvajalciIds }, lokacijaId, dan } }),
    prisma.termin.findMany({
      where: {
        zaposleniId: { in: izvajalciIds },
        status: { not: "ODPOVEDAN" },
        datumOd: { lte: koncDneva },
        datumDo: { gte: zacetekDneva },
      },
    }),
    prisma.delovnoMesto.count({ where: { lokacijaId, aktivno: true } }),
    upravicenaDelovnaMesta(storitevId, lokacijaId),
  ]);
  const jeOmejenoZMesti = steviloVsehMest > 0;
  const terminiMest =
    jeOmejenoZMesti && upravicenaMesta.length > 0
      ? await prisma.termin.findMany({
          where: {
            mestoId: { in: upravicenaMesta.map((m) => m.id) },
            status: { not: "ODPOVEDAN" },
            datumOd: { lte: koncDneva },
            datumDo: { gte: zacetekDneva },
          },
        })
      : [];

  const urnikPoZaposlenem = new Map(urniki.map((u) => [u.zaposleniId, u]));
  const terminiPoZaposlenem = new Map<string, typeof terminiZaposlenih>();
  for (const t of terminiZaposlenih) {
    if (!t.zaposleniId) continue;
    const seznam = terminiPoZaposlenem.get(t.zaposleniId);
    if (seznam) seznam.push(t);
    else terminiPoZaposlenem.set(t.zaposleniId, [t]);
  }

  // minuta od polnoci -> katera izvajalci so na ta slot prosti
  const prostiPoMinuti = new Map<number, Set<string>>();

  for (const zaposleni of izvajalci) {
    const urnik = urnikPoZaposlenem.get(zaposleni.id);
    if (!urnik) continue;

    const obstojeciTermini = terminiPoZaposlenem.get(zaposleni.id) ?? [];

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

      // Fizično delovno mesto je PRIMARNI pogoj - kolikor je prostih
      // upravičenih mest, toliko je (kvečjemu) prostih terminov, ČEPRAV bi
      // bilo po izvajalcih prostih več. Če za to storitev na tej lokaciji
      // ni NOBENEGA upravičenega mesta (admin ga ni dodal na noben
      // ramp/stol), je prostihMest vedno 0 - storitev tu ni izvedljiva.
      let prostihMest = prostiSet.size;
      if (jeOmejenoZMesti) {
        const prostaMesta = upravicenaMesta.filter(
          (m) => !terminiMest.some((t) => t.mestoId === m.id && datumOd < t.datumDo && datumDo > t.datumOd)
        ).length;
        prostihMest = Math.min(prostihMest, prostaMesta);
      }

      const prost = prostihMest > 0;
      return {
        ura: minuteVCas(slotOd),
        datumOd,
        datumDo,
        prost,
        zaposleniId: prost ? [...prostiSet][0] : undefined,
        prostihMest,
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
  // Hitrostna optimizacija (7.9.2026): 7 dni vzporedno namesto zaporedno -
  // prej je vsak naslednji dan čakal na prejšnjega, čeprav so neodvisni.
  const dnevi = Array.from({ length: 7 }, (_, i) => {
    const dan = new Date(ponedeljek);
    dan.setDate(dan.getDate() + i);
    return dan;
  });
  return Promise.all(dnevi.map((datum) => pregledDneva({ ...params, datum })));
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
  // Hitrostna optimizacija (7.9.2026): vsi dnevi v mesecu vzporedno namesto
  // zaporedno (prej do 31 zaporednih klicev pregledDneva).
  const dnevi = Array.from({ length: steviloDni }, (_, i) => new Date(leto, mesec - 1, i + 1));
  const rezultati = await Promise.all(dnevi.map((datum) => pregledDneva({ ...ostalo, datum })));

  return rezultati.map((dan) => ({
    datum: dan.datum,
    zaprto: dan.zaprto,
    razlogZaprtja: dan.razlogZaprtja,
    steviloProstih: dan.sloti.filter((s) => s.prost).length,
  }));
}
