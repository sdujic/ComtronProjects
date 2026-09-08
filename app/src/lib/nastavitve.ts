import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { najdiDejavnost } from "@/lib/dejavnosti";

export async function pridobiNastavitve() {
  // upsert (ne findUnique+create) je namerno - več strani lahko med
  // gradnjo/prvim nalaganjem hkrati pokliče to funkcijo. Na PostgreSQL upsert
  // ni nujno atomičen med vzporednimi klici (Prisma ga lahko izvede kot
  // ločena create+update), zato ob "unique constraint" (P2002) preprosto
  // preberemo vrstico, ki jo je medtem ustvaril drug vzporeden klic.
  try {
    return await prisma.nastavitve.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
  } catch (napaka) {
    if (napaka instanceof Prisma.PrismaClientKnownRequestError && napaka.code === "P2002") {
      return prisma.nastavitve.findUniqueOrThrow({ where: { id: "singleton" } });
    }
    throw napaka;
  }
}

export async function pridobiDejavnost() {
  const nastavitve = await pridobiNastavitve();
  return najdiDejavnost(nastavitve.dejavnost);
}
