import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lokacijaId = searchParams.get("lokacijaId");

  // Storitev je na lokaciji na voljo, če jo lahko izvede BODISI kak
  // zaposleni na tej lokaciji BODISI kako (aktivno) delovno mesto na tej
  // lokaciji (glej dostopnost.ts - delovno mesto je od dveh PRIMARNI pogoj
  // zasedenosti, zato mora biti tudi tu upoštevano, ne samo izvajalci -
  // sicer lokacije brez posebej usposobljenih zaposlenih, a z ustreznimi
  // delovnimi mesti (npr. avtopralnica), sploh ne ponudijo svojih storitev).
  const storitve = await prisma.storitev.findMany({
    where: {
      vidnaNaSpletu: true,
      aktivna: true,
      ...(lokacijaId
        ? {
            OR: [
              { izvajalci: { some: { zaposleni: { lokacije: { some: { lokacijaId } } } } } },
              { delovnaMesta: { some: { delovnoMesto: { lokacijaId, aktivno: true } } } },
            ],
          }
        : {}),
    },
    include: { kategorija: true },
  });
  return NextResponse.json(storitve);
}
