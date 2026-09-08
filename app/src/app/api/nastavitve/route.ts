import { NextResponse } from "next/server";
import { pridobiNastavitve } from "@/lib/nastavitve";

// Javni endpoint - vrne samo dejavnost (za pogojni prikaz polj v javnem
// obrazcu, npr. registrska številka vozila samo za AVTOSERVIS). Namenoma
// NE vrača celotnega Nastavitve zapisa (imeAplikacije/slogan se dobita
// prek generateMetadata na strani, korakMinutTermina je samo admin
// funkcionalnost).
// Brez tega Next.js ta GET (brez dinamičnih vhodov) statično predpomni ob
// buildu - sprememba dejavnosti prek admina se ne bi pokazala na javnem
// obrazcu do naslednjega redeploya.
export const dynamic = "force-dynamic";

export async function GET() {
  const nastavitve = await pridobiNastavitve();
  return NextResponse.json({ dejavnost: nastavitve.dejavnost });
}
