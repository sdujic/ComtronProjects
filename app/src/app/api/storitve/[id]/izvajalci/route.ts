import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const lokacijaId = searchParams.get("lokacijaId");

  // Javni (nezaščiten) endpoint - vrni samo polja, potrebna za izbiro
  // izvajalca, nikakor ne e-pošte/telefona zaposlenega.
  const izvajalci = await prisma.zaposleni.findMany({
    where: {
      aktiven: true,
      storitve: { some: { storitevId: params.id } },
      ...(lokacijaId ? { lokacije: { some: { lokacijaId } } } : {}),
    },
    select: { id: true, ime: true, priimek: true },
  });
  return NextResponse.json(izvajalci);
}
