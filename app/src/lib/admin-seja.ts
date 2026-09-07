// Podpisovanje/preverjanje prijavnega piškotka za /admin - namenoma SAMO
// Web Crypto API (`crypto.subtle`) in `btoa`/`atob`, BREZ Node-jevega
// `crypto` modula ali `Buffer` - ta datoteka teče tako v navadnih server
// akcijah (Node.js runtime) KOT v middleware.ts (Edge runtime, ki Node
// modulov ne podpira, Prisma pa tam sploh ne deluje - zato je preverjanje
// piškotka brezstanjsko/podpisano, ne poizvedba v bazo).
export const IME_PISKOTKA = "admin_seja";
const TRAJANJE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dni

function skrivniKljuc(): string {
  return process.env.ADMIN_SESSION_SECRET || "razvojni-privzeti-kljuc-NI-varen-za-produkcijo";
}

async function pridobiKljuc(): Promise<CryptoKey> {
  const podatki = new TextEncoder().encode(skrivniKljuc());
  return crypto.subtle.importKey("raw", podatki, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function bufferVBase64Url(buffer: ArrayBuffer): string {
  const bajti = new Uint8Array(buffer);
  let binarno = "";
  for (const b of bajti) binarno += String.fromCharCode(b);
  return btoa(binarno).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function ustvariSejniPiskotek(email: string): Promise<string> {
  const potece = Date.now() + TRAJANJE_MS;
  const podatki = `${email}|${potece}`;
  const kljuc = await pridobiKljuc();
  const podpis = await crypto.subtle.sign("HMAC", kljuc, new TextEncoder().encode(podatki));
  return `${btoa(podatki)}.${bufferVBase64Url(podpis)}`;
}

export async function preveriSejniPiskotek(vrednost: string | undefined): Promise<string | null> {
  if (!vrednost) return null;
  const [podatkiB64, podpisPricakovan] = vrednost.split(".");
  if (!podatkiB64 || !podpisPricakovan) return null;

  let podatki: string;
  try {
    podatki = atob(podatkiB64);
  } catch {
    return null;
  }
  const [email, potecePotencial] = podatki.split("|");
  const potece = Number(potecePotencial);
  if (!email || !Number.isFinite(potece) || Date.now() > potece) return null;

  const kljuc = await pridobiKljuc();
  const podpis = await crypto.subtle.sign("HMAC", kljuc, new TextEncoder().encode(podatki));
  const pricakovanRacunan = bufferVBase64Url(podpis);
  if (pricakovanRacunan !== podpisPricakovan) return null;

  return email;
}
