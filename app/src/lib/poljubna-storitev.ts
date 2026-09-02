import { prisma } from "@/lib/prisma";

export { POLJUBNA_STORITEV_SENTINEL, POLJUBNA_TRAJANJE_MIN } from "@/lib/poljubna-konstante";
import { POLJUBNA_TRAJANJE_MIN } from "@/lib/poljubna-konstante";

// Privzeto ponujena možnost "poljubna storitev" na javnem obrazcu - stranka
// opiše željo/težavo namesto izbire iz šifranta. Sidrana na pravi Storitev
// zapis (jePoljubna=true, fiksen id), ki se ustvari ob prvi rabi - s tem ni
// potrebna posebna obravnava v podatkovnem modelu Termina/TerminStoritve.
// upsert po fiksnem id-ju (ne findFirst+create) je namerno - varno pri
// vzporednih klicih (npr. dve stranki hkrati oddata poljubno rezervacijo).
const POLJUBNA_STORITEV_ID = "poljubna-storitev-singleton";

export async function zagotoviPoljubnoStoritev() {
  return prisma.storitev.upsert({
    where: { id: POLJUBNA_STORITEV_ID },
    update: {},
    create: {
      id: POLJUBNA_STORITEV_ID,
      naziv: "Druga želja / opis težave",
      opis: "Ni na seznamu, kar potrebujete? Opišite svojo željo ali težavo, mi pa se javimo s podrobnostmi termina.",
      trajanjeMin: POLJUBNA_TRAJANJE_MIN,
      cena: 0,
      vidnaNaSpletu: false, // ne prikazuje se v /api/storitve - obravnavana posebej na klientu
      jePoljubna: true,
    },
  });
}
