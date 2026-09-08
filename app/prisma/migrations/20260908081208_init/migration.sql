-- CreateTable
CREATE TABLE "Nastavitve" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "imeAplikacije" TEXT NOT NULL DEFAULT 'Naročanje na termin',
    "dejavnost" TEXT NOT NULL DEFAULT 'AVTOSERVIS',
    "slogan" TEXT,
    "korakMinutTermina" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nastavitve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUporabnik" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "geslo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUporabnik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lokacija" (
    "id" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "naslov" TEXT,
    "delovniCas" TEXT,
    "casPas" TEXT NOT NULL DEFAULT 'Europe/Ljubljana',
    "valuta" TEXT NOT NULL DEFAULT 'EUR',
    "drzava" TEXT NOT NULL DEFAULT 'SI',
    "odprtoSobota" BOOLEAN NOT NULL DEFAULT true,
    "odprtoNedelja" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "aktivna" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lokacija_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelovnoMesto" (
    "id" TEXT NOT NULL,
    "lokacijaId" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "aktivno" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DelovnoMesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelovnoMestoStoritev" (
    "delovnoMestoId" TEXT NOT NULL,
    "storitevId" TEXT NOT NULL,

    CONSTRAINT "DelovnoMestoStoritev_pkey" PRIMARY KEY ("delovnoMestoId","storitevId")
);

-- CreateTable
CREATE TABLE "KategorijaStoritve" (
    "id" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "vrstniRed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KategorijaStoritve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Storitev" (
    "id" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "opis" TEXT,
    "trajanjeMin" INTEGER NOT NULL,
    "cena" DOUBLE PRECISION NOT NULL,
    "kategorijaId" TEXT,
    "erp_sifra_artikla" TEXT,
    "vidnaNaSpletu" BOOLEAN NOT NULL DEFAULT true,
    "jePoljubna" BOOLEAN NOT NULL DEFAULT false,
    "aktivna" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Storitev_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zaposleni" (
    "id" TEXT NOT NULL,
    "ime" TEXT NOT NULL,
    "priimek" TEXT NOT NULL,
    "email" TEXT,
    "telefon" TEXT,
    "jezik" TEXT NOT NULL DEFAULT 'sl',
    "vloga" TEXT NOT NULL DEFAULT 'IZVAJALEC',
    "aktiven" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zaposleni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZaposleniLokacija" (
    "zaposleniId" TEXT NOT NULL,
    "lokacijaId" TEXT NOT NULL,

    CONSTRAINT "ZaposleniLokacija_pkey" PRIMARY KEY ("zaposleniId","lokacijaId")
);

-- CreateTable
CREATE TABLE "ZaposleniStoritev" (
    "zaposleniId" TEXT NOT NULL,
    "storitevId" TEXT NOT NULL,

    CONSTRAINT "ZaposleniStoritev_pkey" PRIMARY KEY ("zaposleniId","storitevId")
);

-- CreateTable
CREATE TABLE "Urnik" (
    "id" TEXT NOT NULL,
    "zaposleniId" TEXT NOT NULL,
    "lokacijaId" TEXT NOT NULL,
    "dan" INTEGER NOT NULL,
    "delovniCasOd" TEXT NOT NULL,
    "delovniCasDo" TEXT NOT NULL,
    "casRezervacijOd" TEXT NOT NULL,
    "casRezervacijDo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Urnik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stranka" (
    "id" TEXT NOT NULL,
    "ime" TEXT NOT NULL,
    "priimek" TEXT NOT NULL,
    "email" TEXT,
    "telefon" TEXT NOT NULL,
    "jezik" TEXT NOT NULL DEFAULT 'sl',
    "erp_partner_id" TEXT,
    "soglasjeObvestila" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stranka_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Termin" (
    "id" TEXT NOT NULL,
    "datumOd" TIMESTAMP(3) NOT NULL,
    "datumDo" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REZERVIRAN',
    "vir" TEXT NOT NULL DEFAULT 'ADMIN',
    "lokacijaId" TEXT NOT NULL,
    "strankaId" TEXT NOT NULL,
    "zaposleniId" TEXT,
    "mestoId" TEXT,
    "cenaSkupaj" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zapisek" TEXT,
    "registracija" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Termin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminStoritev" (
    "id" TEXT NOT NULL,
    "terminId" TEXT NOT NULL,
    "storitevId" TEXT NOT NULL,
    "cena" DOUBLE PRECISION NOT NULL,
    "popust" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trajanjeMin" INTEGER NOT NULL,

    CONSTRAINT "TerminStoritev_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zapisek" (
    "id" TEXT NOT NULL,
    "strankaId" TEXT NOT NULL,
    "besedilo" TEXT NOT NULL,
    "oznaka" TEXT,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zapisek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUporabnik_email_key" ON "AdminUporabnik"("email");

-- CreateIndex
CREATE INDEX "DelovnoMesto_lokacijaId_idx" ON "DelovnoMesto"("lokacijaId");

-- CreateIndex
CREATE INDEX "Urnik_zaposleniId_idx" ON "Urnik"("zaposleniId");

-- CreateIndex
CREATE INDEX "Urnik_lokacijaId_idx" ON "Urnik"("lokacijaId");

-- CreateIndex
CREATE UNIQUE INDEX "Urnik_zaposleniId_lokacijaId_dan_key" ON "Urnik"("zaposleniId", "lokacijaId", "dan");

-- CreateIndex
CREATE INDEX "Termin_zaposleniId_datumOd_idx" ON "Termin"("zaposleniId", "datumOd");

-- CreateIndex
CREATE INDEX "Termin_lokacijaId_datumOd_idx" ON "Termin"("lokacijaId", "datumOd");

-- CreateIndex
CREATE INDEX "Termin_mestoId_datumOd_idx" ON "Termin"("mestoId", "datumOd");

-- CreateIndex
CREATE INDEX "Termin_strankaId_idx" ON "Termin"("strankaId");

-- CreateIndex
CREATE INDEX "TerminStoritev_terminId_idx" ON "TerminStoritev"("terminId");

-- CreateIndex
CREATE INDEX "TerminStoritev_storitevId_idx" ON "TerminStoritev"("storitevId");

-- CreateIndex
CREATE INDEX "Zapisek_strankaId_idx" ON "Zapisek"("strankaId");

-- AddForeignKey
ALTER TABLE "DelovnoMesto" ADD CONSTRAINT "DelovnoMesto_lokacijaId_fkey" FOREIGN KEY ("lokacijaId") REFERENCES "Lokacija"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelovnoMestoStoritev" ADD CONSTRAINT "DelovnoMestoStoritev_delovnoMestoId_fkey" FOREIGN KEY ("delovnoMestoId") REFERENCES "DelovnoMesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelovnoMestoStoritev" ADD CONSTRAINT "DelovnoMestoStoritev_storitevId_fkey" FOREIGN KEY ("storitevId") REFERENCES "Storitev"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Storitev" ADD CONSTRAINT "Storitev_kategorijaId_fkey" FOREIGN KEY ("kategorijaId") REFERENCES "KategorijaStoritve"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZaposleniLokacija" ADD CONSTRAINT "ZaposleniLokacija_zaposleniId_fkey" FOREIGN KEY ("zaposleniId") REFERENCES "Zaposleni"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZaposleniLokacija" ADD CONSTRAINT "ZaposleniLokacija_lokacijaId_fkey" FOREIGN KEY ("lokacijaId") REFERENCES "Lokacija"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZaposleniStoritev" ADD CONSTRAINT "ZaposleniStoritev_zaposleniId_fkey" FOREIGN KEY ("zaposleniId") REFERENCES "Zaposleni"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZaposleniStoritev" ADD CONSTRAINT "ZaposleniStoritev_storitevId_fkey" FOREIGN KEY ("storitevId") REFERENCES "Storitev"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Urnik" ADD CONSTRAINT "Urnik_zaposleniId_fkey" FOREIGN KEY ("zaposleniId") REFERENCES "Zaposleni"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Urnik" ADD CONSTRAINT "Urnik_lokacijaId_fkey" FOREIGN KEY ("lokacijaId") REFERENCES "Lokacija"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_lokacijaId_fkey" FOREIGN KEY ("lokacijaId") REFERENCES "Lokacija"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_strankaId_fkey" FOREIGN KEY ("strankaId") REFERENCES "Stranka"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_zaposleniId_fkey" FOREIGN KEY ("zaposleniId") REFERENCES "Zaposleni"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_mestoId_fkey" FOREIGN KEY ("mestoId") REFERENCES "DelovnoMesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminStoritev" ADD CONSTRAINT "TerminStoritev_terminId_fkey" FOREIGN KEY ("terminId") REFERENCES "Termin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminStoritev" ADD CONSTRAINT "TerminStoritev_storitevId_fkey" FOREIGN KEY ("storitevId") REFERENCES "Storitev"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zapisek" ADD CONSTRAINT "Zapisek_strankaId_fkey" FOREIGN KEY ("strankaId") REFERENCES "Stranka"("id") ON DELETE CASCADE ON UPDATE CASCADE;
