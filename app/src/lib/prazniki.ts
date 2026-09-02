// Dela prosti dnevi po državi - privzeto Slovenija (SI), podprta tudi
// Hrvaška (HR). Država je nastavljiva po Lokaciji (Lokacija.drzava), da je
// aplikacijo mogoče uporabljati tudi v drugih državah. Premakljivi prazniki
// (vezani na velikonočno nedeljo) se izračunajo za poljubno leto - seznam
// ni statičen/vezan samo na eno leto. Podatki povzeti po
// https://www.uporabi.net/prazniki (2.9.2026).

interface Praznik {
  naziv: string;
  mesec?: number; // 1-12, za fiksne praznike
  dan?: number;
  velikonocniOdmik?: number; // dnevi od velikonočne nedelje, za premakljive praznike
}

const PRAZNIKI_PO_DRZAVI: Record<string, Praznik[]> = {
  SI: [
    { naziv: "Novo leto", mesec: 1, dan: 1 },
    { naziv: "Novo leto (2. dan)", mesec: 1, dan: 2 },
    { naziv: "Prešernov dan, slovenski kulturni praznik", mesec: 2, dan: 8 },
    { naziv: "Velika noč", velikonocniOdmik: 0 },
    { naziv: "Velikonočni ponedeljek", velikonocniOdmik: 1 },
    { naziv: "Dan upora proti okupatorju", mesec: 4, dan: 27 },
    { naziv: "Praznik dela", mesec: 5, dan: 1 },
    { naziv: "Praznik dela (2. dan)", mesec: 5, dan: 2 },
    { naziv: "Binkošti", velikonocniOdmik: 49 },
    { naziv: "Dan državnosti", mesec: 6, dan: 25 },
    { naziv: "Marijino vnebovzetje", mesec: 8, dan: 15 },
    { naziv: "Dan reformacije", mesec: 10, dan: 31 },
    { naziv: "Dan spomina na mrtve", mesec: 11, dan: 1 },
    { naziv: "Božič", mesec: 12, dan: 25 },
    { naziv: "Dan samostojnosti in enotnosti", mesec: 12, dan: 26 },
  ],
  // Hrvaška po Zakonu o blagdanima, spomendanima i neradnim danima -
  // "Veliki petak" (Good Friday) namerno izpuščen, ker NI dela prost dan
  // (samo praznik/opazovanje). "Dan državnosti" je bil leta 2020
  // prestavljen z 25. junija na 30. maj. Ta seznam ima nižjo gotovost kot
  // slovenski (viri, ki so bili na voljo, so si nasprotovali pri nekaterih
  // datumih) - priporočeno preveriti pred produkcijsko rabo za HR lokacije.
  HR: [
    { naziv: "Nova godina", mesec: 1, dan: 1 },
    { naziv: "Bogojavljenje (Sveta tri kralja)", mesec: 1, dan: 6 },
    { naziv: "Uskrs", velikonocniOdmik: 0 },
    { naziv: "Uskrsni ponedjeljak", velikonocniOdmik: 1 },
    { naziv: "Praznik rada", mesec: 5, dan: 1 },
    { naziv: "Tijelovo", velikonocniOdmik: 60 },
    { naziv: "Dan državnosti", mesec: 5, dan: 30 },
    { naziv: "Dan antifašističke borbe", mesec: 6, dan: 22 },
    { naziv: "Dan pobjede i domovinske zahvalnosti i Dan hrvatskih branitelja", mesec: 8, dan: 5 },
    { naziv: "Velika Gospa", mesec: 8, dan: 15 },
    { naziv: "Dan neovisnosti", mesec: 10, dan: 8 },
    { naziv: "Svi sveti", mesec: 11, dan: 1 },
    { naziv: "Dan sjećanja na žrtve Domovinskog rata", mesec: 11, dan: 18 },
    { naziv: "Božić", mesec: 12, dan: 25 },
    { naziv: "Sveti Stjepan", mesec: 12, dan: 26 },
  ],
};

export const PRIVZETA_DRZAVA = "SI";

// Meeus/Jones/Butcher algoritem za velikonočno nedeljo (gregorijanski koledar) - deluje za poljubno leto.
function velikonocnaNedelja(leto: number): Date {
  const a = leto % 19;
  const b = Math.floor(leto / 100);
  const c = leto % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mesec = Math.floor((h + l - 7 * m + 114) / 31);
  const dan = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(leto, mesec - 1, dan);
}

function pristejDni(datum: Date, dni: number): Date {
  const rezultat = new Date(datum);
  rezultat.setDate(rezultat.getDate() + dni);
  return rezultat;
}

function isteDatume(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function najdiPraznik(drzava: string, datum: Date): string | null {
  const praznikiDrzave = PRAZNIKI_PO_DRZAVI[drzava] ?? PRAZNIKI_PO_DRZAVI[PRIVZETA_DRZAVA];
  const velikaNoc = velikonocnaNedelja(datum.getFullYear());

  for (const praznik of praznikiDrzave) {
    const praznikDatum =
      praznik.velikonocniOdmik !== undefined
        ? pristejDni(velikaNoc, praznik.velikonocniOdmik)
        : new Date(datum.getFullYear(), (praznik.mesec ?? 1) - 1, praznik.dan ?? 1);

    if (isteDatume(praznikDatum, datum)) return praznik.naziv;
  }
  return null;
}

export function jePraznik(drzava: string, datum: Date): boolean {
  return najdiPraznik(drzava, datum) !== null;
}
