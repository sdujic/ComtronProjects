import { prisma } from "@/lib/prisma";
import { najdiDejavnost } from "@/lib/dejavnosti";

export async function pridobiNastavitve() {
  // upsert (ne findUnique+create) je namerno - več strani lahko med
  // gradnjo/prvim nalaganjem hkrati pokliče to funkcijo, findUnique+create
  // bi povzročil "unique constraint failed" pri vzporednih klicih.
  return prisma.nastavitve.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function pridobiDejavnost() {
  const nastavitve = await pridobiNastavitve();
  return najdiDejavnost(nastavitve.dejavnost);
}
