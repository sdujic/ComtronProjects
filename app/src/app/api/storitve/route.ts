import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lokacijaId = searchParams.get("lokacijaId");

  const storitve = await prisma.storitev.findMany({
    where: {
      vidnaNaSpletu: true,
      aktivna: true,
      ...(lokacijaId ? { izvajalci: { some: { zaposleni: { lokacije: { some: { lokacijaId } } } } } } : {}),
    },
    include: { kategorija: true },
  });
  return NextResponse.json(storitve);
}
