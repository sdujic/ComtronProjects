import { NextResponse } from "next/server";
import { pregledMeseca } from "@/lib/dostopnost";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storitevId = searchParams.get("storitevId");
  const lokacijaId = searchParams.get("lokacijaId");
  const leto = Number(searchParams.get("leto"));
  const mesec = Number(searchParams.get("mesec"));
  const zaposleniId = searchParams.get("zaposleniId") ?? undefined;

  if (!storitevId || !lokacijaId || !leto || !mesec) {
    return NextResponse.json({ napaka: "Manjkajo obvezni parametri" }, { status: 400 });
  }

  const dnevi = await pregledMeseca({ storitevId, lokacijaId, zaposleniId, leto, mesec });
  return NextResponse.json(dnevi);
}
