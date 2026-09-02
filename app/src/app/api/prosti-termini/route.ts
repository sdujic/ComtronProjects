import { NextResponse } from "next/server";
import { najdiProsteTermine } from "@/lib/dostopnost";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storitevId = searchParams.get("storitevId");
  const lokacijaId = searchParams.get("lokacijaId");
  const datum = searchParams.get("datum");
  const zaposleniId = searchParams.get("zaposleniId") ?? undefined;

  if (!storitevId || !lokacijaId || !datum) {
    return NextResponse.json({ napaka: "Manjkajo obvezni parametri" }, { status: 400 });
  }

  const prosti = await najdiProsteTermine({
    storitevId,
    lokacijaId,
    zaposleniId,
    datum: new Date(datum),
  });

  return NextResponse.json(prosti);
}
