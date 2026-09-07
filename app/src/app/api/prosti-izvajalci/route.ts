import { NextResponse } from "next/server";
import { prostiIzvajalciZaTermin, najdiProstoDelovnoMesto } from "@/lib/dostopnost";

// Vrne dejansko proste izvajalce za točno ta termin (glej dostopnost.ts) -
// uporablja tako javni obrazec kot admin "Nov termin", da se že zaseden
// izvajalec sploh ne ponudi v izbiri. Vrne TUDI `prostoMesto` (fizično
// delovno mesto - rampa/stol ipd., PRIMARNI pogoj), da lahko admin obrazec
// proaktivno onemogoči oddajo, če je mesto zasedeno, čeprav je izvajalec
// prost.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storitevId = searchParams.get("storitevId");
  const lokacijaId = searchParams.get("lokacijaId");
  const datumOd = searchParams.get("datumOd");
  const datumDo = searchParams.get("datumDo");

  if (!storitevId || !lokacijaId || !datumOd || !datumDo) {
    return NextResponse.json({ napaka: "Manjkajo obvezni parametri" }, { status: 400 });
  }

  const [izvajalci, mestoRezultat] = await Promise.all([
    prostiIzvajalciZaTermin({
      storitevId,
      lokacijaId,
      datumOd: new Date(datumOd),
      datumDo: new Date(datumDo),
    }),
    najdiProstoDelovnoMesto({ storitevId, lokacijaId, datumOd: new Date(datumOd), datumDo: new Date(datumDo) }),
  ]);
  const prostoMesto = !mestoRezultat.omejeno || mestoRezultat.mestoId !== null;
  return NextResponse.json({ izvajalci, prostoMesto });
}
