import { NextResponse } from "next/server";
import { prostiIzvajalciZaTermin } from "@/lib/dostopnost";

// Vrne samo dejansko proste izvajalce za točno ta termin (glej
// dostopnost.ts) - uporablja tako javni obrazec kot admin "Nov termin",
// da se že zaseden izvajalec sploh ne ponudi v izbiri.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storitevId = searchParams.get("storitevId");
  const lokacijaId = searchParams.get("lokacijaId");
  const datumOd = searchParams.get("datumOd");
  const datumDo = searchParams.get("datumDo");

  if (!storitevId || !lokacijaId || !datumOd || !datumDo) {
    return NextResponse.json({ napaka: "Manjkajo obvezni parametri" }, { status: 400 });
  }

  const izvajalci = await prostiIzvajalciZaTermin({
    storitevId,
    lokacijaId,
    datumOd: new Date(datumOd),
    datumDo: new Date(datumDo),
  });
  return NextResponse.json(izvajalci);
}
