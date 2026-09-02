import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const lokacija = await prisma.lokacija.create({
    data: {
      naziv: "Servis Center Maribor",
      naslov: "Cesta na Brdo 1, 2000 Maribor",
      delovniCas: "08:00-18:00",
    },
  });

  const kategorija = await prisma.kategorijaStoritve.create({
    data: { naziv: "Redno vzdrževanje", vrstniRed: 1 },
  });

  const storitve = await Promise.all([
    prisma.storitev.create({
      data: {
        naziv: "Redni servis",
        opis: "Zamenjava olja in filtrov, splošen pregled vozila.",
        trajanjeMin: 60,
        cena: 89,
        kategorijaId: kategorija.id,
      },
    }),
    prisma.storitev.create({
      data: {
        naziv: "Menjava pnevmatik",
        opis: "Menjava in uravnoteženje 4 pnevmatik.",
        trajanjeMin: 30,
        cena: 25,
        kategorijaId: kategorija.id,
      },
    }),
    prisma.storitev.create({
      data: {
        naziv: "Diagnostika napak",
        opis: "Računalniška diagnostika in odčitavanje napak.",
        trajanjeMin: 45,
        cena: 35,
        kategorijaId: kategorija.id,
      },
    }),
  ]);

  const zaposleni1 = await prisma.zaposleni.create({
    data: {
      ime: "Marko",
      priimek: "Novak",
      email: "marko.novak@servis.si",
      telefon: "+386 41 111 222",
      vloga: "IZVAJALEC",
      lokacije: { create: [{ lokacijaId: lokacija.id }] },
      storitve: { create: storitve.map((s) => ({ storitevId: s.id })) },
    },
  });

  const zaposleni2 = await prisma.zaposleni.create({
    data: {
      ime: "Ana",
      priimek: "Kovač",
      email: "ana.kovac@servis.si",
      telefon: "+386 41 333 444",
      vloga: "IZVAJALEC",
      lokacije: { create: [{ lokacijaId: lokacija.id }] },
      storitve: { create: [{ storitevId: storitve[0].id }, { storitevId: storitve[1].id }] },
    },
  });

  const delovniDnevi = [1, 2, 3, 4, 5];
  for (const zaposleni of [zaposleni1, zaposleni2]) {
    for (const dan of delovniDnevi) {
      await prisma.urnik.create({
        data: {
          zaposleniId: zaposleni.id,
          lokacijaId: lokacija.id,
          dan,
          delovniCasOd: "08:00",
          delovniCasDo: "16:00",
          casRezervacijOd: "08:00",
          casRezervacijDo: "15:30",
        },
      });
    }
  }

  const stranke = await Promise.all([
    prisma.stranka.create({
      data: { ime: "Janez", priimek: "Kranjc", telefon: "+386 31 555 666", email: "janez.kranjc@example.com" },
    }),
    prisma.stranka.create({
      data: { ime: "Petra", priimek: "Zupan", telefon: "+386 40 777 888" },
    }),
  ]);

  console.log("Testni podatki ustvarjeni:", {
    lokacija: lokacija.naziv,
    storitve: storitve.length,
    zaposleni: 2,
    stranke: stranke.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
