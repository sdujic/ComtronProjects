import { NextResponse } from "next/server";
import { pregledDneva } from "@/lib/dostopnost";

// Javno-varen dnevni pregled - vrne TUDI zasedene termine (prost=false), a
// brez kakršnihkoli podatkov o stranki (glej Slot v dostopnost.ts).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storitevId = searchParams.get("storitevId");
  const lokacijaId = searchParams.get("lokacijaId");
  const datum = searchParams.get("datum");
  const zaposleniId = searchParams.get("zaposleniId") ?? undefined;

  if (!storitevId || !lokacijaId || !datum) {
    return NextResponse.json({ napaka: "Manjkajo obvezni parametri" }, { status: 400 });
  }

  const pregled = await pregledDneva({ storitevId, lokacijaId, zaposleniId, datum: new Date(datum) });
  return NextResponse.json(pregled);
}
