"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { jeVeljavenEmail } from "@/lib/validacija";
import { IME_PISKOTKA, ustvariSejniPiskotek } from "@/lib/admin-seja";

// Prijava preveri DVA vira, v tem vrstnem redu:
// 1. "Korenski" admin iz .env (ADMIN_EMAIL/PASSWORD, geslo v čistem
//    besedilu - namerna MVP poenostavitev, glej .env.example). Deluje
//    VEDNO, tudi na povsem sveži bazi brez ijednega AdminUporabnik zapisa -
//    da se admin nikoli ne more sam "zakleniti ven".
// 2. Dodatni admini iz baze (AdminUporabnik, dodani na /admin/nastavitve),
//    geslo HASHIRANO (bcrypt) - glej ustvariAdminUporabnika spodaj.
export async function prijavaAdmin(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const geslo = String(formData.get("geslo") || "");

  if (!email || !geslo) {
    redirect("/prijava?napaka=1");
  }

  const pravilnoEmail = process.env.ADMIN_EMAIL || "";
  const pravilnoGeslo = process.env.ADMIN_PASSWORD || "";
  const jeKorenskiAdmin = email.toLowerCase() === pravilnoEmail.toLowerCase() && geslo === pravilnoGeslo;

  let veljavno = jeKorenskiAdmin;
  if (!veljavno) {
    const uporabnik = await prisma.adminUporabnik.findUnique({ where: { email: email.toLowerCase() } });
    veljavno = uporabnik ? await bcrypt.compare(geslo, uporabnik.geslo) : false;
  }

  if (!veljavno) {
    redirect("/prijava?napaka=1");
  }

  const piskotek = await ustvariSejniPiskotek(email);
  cookies().set(IME_PISKOTKA, piskotek, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  redirect("/admin");
}

export async function odjavaAdmin() {
  cookies().delete(IME_PISKOTKA);
  redirect("/prijava");
}

// Dodajanje novih admin uporabnikov - naročnikova zahteva (7.9.2026), na
// /admin/nastavitve. Geslo se hashira (bcrypt, 10 rund) - za razliko od
// "korenskega" admina v .env je to uporabnikovo lastno izbrano geslo, zato
// je pravilno hashirati od začetka, ne kot MVP poenostavitev.
export async function ustvariAdminUporabnika(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const geslo = String(formData.get("geslo") || "");

  if (!jeVeljavenEmail(email)) {
    throw new Error("Neveljaven e-poštni naslov.");
  }
  if (geslo.length < 6) {
    throw new Error("Geslo mora imeti vsaj 6 znakov.");
  }

  const zgostitev = await bcrypt.hash(geslo, 10);
  await prisma.adminUporabnik.create({ data: { email, geslo: zgostitev } });
  revalidatePath("/admin/nastavitve");
}

export async function izbrisiAdminUporabnika(id: string) {
  await prisma.adminUporabnik.deleteMany({ where: { id } });
  revalidatePath("/admin/nastavitve");
}
