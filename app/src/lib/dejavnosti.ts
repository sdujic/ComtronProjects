// Definicije podprtih dejavnosti - besedilo (naziv/slogan) + predloge
// storitev za hiter začetek. Brez server-only uvozov (prisma) - varno za
// rabo tudi v client komponentah.

export interface PredlogaStoritve {
  naziv: string;
  opis?: string;
  trajanjeMin: number;
  cena: number;
}

export interface Dejavnost {
  id: string;
  naziv: string;
  slogan: string;
  oznakaTermina: string; // npr. "servis vozila", "striženje", "masažo" - za vstavljanje v besedilo
  // Rodilnik množine za fizično delovno mesto te dejavnosti (npr. "ramp",
  // "frizerskih stolov") - za besedilo "Število {oznakaMesta}" na
  // /admin/lokacije, glej Lokacija.steviloDelovnihMest.
  oznakaMesta: string;
  kategorija: string;
  predlogeStoritev: PredlogaStoritve[];
}

export const DEJAVNOSTI: Dejavnost[] = [
  {
    id: "AVTOSERVIS",
    naziv: "Avtoservis",
    slogan: "Rezervirajte termin za servis vašega vozila v nekaj klikih.",
    oznakaTermina: "servis vozila",
    oznakaMesta: "ramp",
    kategorija: "Redno vzdrževanje",
    predlogeStoritev: [
      { naziv: "Redni servis", opis: "Zamenjava olja in filtrov, splošen pregled vozila.", trajanjeMin: 60, cena: 89 },
      { naziv: "Menjava pnevmatik", opis: "Menjava in uravnoteženje 4 pnevmatik.", trajanjeMin: 30, cena: 25 },
      { naziv: "Diagnostika napak", opis: "Računalniška diagnostika in odčitavanje napak.", trajanjeMin: 45, cena: 35 },
      { naziv: "Zamenjava zavornih ploščic", opis: "Zamenjava sprednjih ali zadnjih zavornih ploščic.", trajanjeMin: 60, cena: 55 },
    ],
  },
  {
    id: "FRIZERSTVO",
    naziv: "Frizerski salon",
    slogan: "Rezervirajte termin pri svojem frizerju v nekaj klikih.",
    oznakaTermina: "striženje",
    oznakaMesta: "frizerskih stolov",
    kategorija: "Frizerske storitve",
    predlogeStoritev: [
      { naziv: "Moško striženje", trajanjeMin: 30, cena: 18 },
      { naziv: "Žensko striženje", trajanjeMin: 45, cena: 28 },
      { naziv: "Barvanje las", opis: "Barvanje po celotni dolžini.", trajanjeMin: 90, cena: 55 },
      { naziv: "Feniranje", trajanjeMin: 30, cena: 15 },
      { naziv: "Trajna", trajanjeMin: 120, cena: 65 },
    ],
  },
  {
    id: "INSTALACIJE_KLIME",
    naziv: "Inštalacije in servis (klime ipd.)",
    slogan: "Rezervirajte termin za montažo ali servis v nekaj klikih.",
    oznakaTermina: "montažo ali servis",
    oznakaMesta: "servisnih ekip",
    kategorija: "Klimatske naprave",
    predlogeStoritev: [
      { naziv: "Montaža klimatske naprave", trajanjeMin: 180, cena: 150 },
      { naziv: "Servis klimatske naprave", opis: "Redni pregled in vzdrževanje.", trajanjeMin: 60, cena: 45 },
      { naziv: "Čiščenje in razkuževanje klime", trajanjeMin: 45, cena: 35 },
      { naziv: "Polnjenje s hladilnim sredstvom", trajanjeMin: 60, cena: 60 },
    ],
  },
  {
    id: "DIMNIKARSTVO",
    naziv: "Dimnikarstvo",
    slogan: "Rezervirajte termin za dimnikarski pregled v nekaj klikih.",
    oznakaTermina: "dimnikarski pregled",
    oznakaMesta: "dimnikarskih ekip",
    kategorija: "Dimnikarske storitve",
    predlogeStoritev: [
      { naziv: "Redni dimnikarski pregled", trajanjeMin: 45, cena: 40 },
      { naziv: "Čiščenje dimnika", trajanjeMin: 60, cena: 50 },
      { naziv: "Meritev emisij", trajanjeMin: 30, cena: 35 },
      { naziv: "Izredni pregled", opis: "Pregled ob spremembi kurilne naprave ali na zahtevo.", trajanjeMin: 45, cena: 45 },
    ],
  },
  {
    id: "SPA_MASAZE",
    naziv: "Spa in masaže",
    slogan: "Rezervirajte termin za sprostitev v nekaj klikih.",
    oznakaTermina: "masažo",
    oznakaMesta: "masažnih kabin",
    kategorija: "Sprostitvene storitve",
    predlogeStoritev: [
      { naziv: "Klasična masaža (60 min)", trajanjeMin: 60, cena: 45 },
      { naziv: "Športna masaža", trajanjeMin: 45, cena: 40 },
      { naziv: "Aromaterapija", trajanjeMin: 60, cena: 50 },
      { naziv: "Spa paket za dva", opis: "Masaža in dostop do savne za dve osebi.", trajanjeMin: 120, cena: 140 },
    ],
  },
  {
    id: "DRUGO",
    naziv: "Drugo",
    slogan: "Rezervirajte termin v nekaj klikih.",
    oznakaTermina: "termin",
    oznakaMesta: "delovnih mest",
    kategorija: "Storitve",
    predlogeStoritev: [],
  },
];

export function najdiDejavnost(id: string): Dejavnost {
  return DEJAVNOSTI.find((d) => d.id === id) ?? DEJAVNOSTI[0];
}
