// Pravila preverjanja veljavnosti e-pošte in telefonske številke za javni
// obrazec - naročnikova zahteva (7.9.2026). Čista funkcija (brez server-only
// uvozov), varna za rabo na klientu IN strežniku (defense-in-depth vzorec,
// ki se v tem projektu dosledno uporablja - preveri oboje, ne le enega).

// Naročnikova natančna specifikacija: vsaj 2 znaka pred @, vsaj 2 znaka med
// @ in (zadnjo) piko, vsaj 2 znaka za piko.
const EMAIL_REGEX = /^[^\s@]{2,}@[^\s@]{2,}\.[^\s@]{2,}$/;

export function jeVeljavenEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

// Telefon: po izbiri klicne številke države mora ostanek vsebovati SAMO
// števke, znotraj razumne dolžine za to državo (glej Drzava.dolzinaStevilke
// v drzave.ts - privzeto [6, 12], natančneje nastavljeno za SI/HR).
export function jeVeljavnaStevilka(stevilka: string, dolzina: [number, number]): boolean {
  const ocisceno = stevilka.trim();
  if (!/^\d+$/.test(ocisceno)) return false;
  const [min, max] = dolzina;
  return ocisceno.length >= min && ocisceno.length <= max;
}
