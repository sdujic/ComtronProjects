import type { Stranka, Storitev, Termin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tronXerpConfigured, tronXerpRequest } from "@/lib/tronxerp-client";

// Prava povezava s TRONxERP gre prek TronOfficeAPI (samopostrežni REST API,
// https://xerp.comtron.si/tronofficeapi/swagger/) - sheme v
// ../../../TronOfficeAPI-referenca.md. Ko TRONXERP_API_USERNAME/PASSWORD
// nista nastavljena (.env), se uporabi mock, ki samo logira - to omogoča
// razvoj brez dostopa do pravega TRONxERP okolja.

// articleType šifrant (potrjeno s strani naročnika, glej TronOfficeAPI-referenca.md):
// 0=Blago, 1=Storitve, 2=Nad artikel za tekstil, 3=Sestavnica, 4=Plačilni boni,
// 5=Okoljska dajatev, 6=Proizvodni artikel, 100=Navidezni artikel, 101=Artikel dostave, 102=Variabilni stroški
const ARTICLE_TYPE_STORITEV = 1;

export interface TronXerpAdapter {
  sinhronizirajStranko(stranka: Stranka): Promise<{ ercPartnerId: string } | null>;
  sinhronizirajStoritev(storitev: Storitev): Promise<void>;
  sinhronizirajTermin(termin: Termin): Promise<void>;
}

interface TronXerpStranka {
  customerId: string;
}

class MockTronXerpAdapter implements TronXerpAdapter {
  async sinhronizirajStranko(stranka: Stranka) {
    console.log(`[TRONxERP mock] POST /integration/saveCustomer - stranka ${stranka.ime} ${stranka.priimek} (${stranka.id})`);
    return null;
  }

  async sinhronizirajStoritev(storitev: Storitev) {
    console.log(`[TRONxERP mock] POST /integration/saveArticle - storitev ${storitev.naziv} (${storitev.id})`);
  }

  async sinhronizirajTermin(termin: Termin) {
    console.log(`[TRONxERP mock] POST /integration/importOrder - termin ${termin.id}, status=${termin.status}`);
  }
}

// Realni klici - implementirano po TronOfficeAPI-referenca.md (polna shema
// importOrder zajeta 2.9.2026, vključno z DocumentPositions). Odprte
// predpostavke, ki jih je treba še potrditi z živim testom/COMTRON:
// - DocTypeID: potrjeno s strani naročnika "EPN" (privzeto spodaj), a še
//   vedno konfigurabilno prek TRONXERP_API_DOC_TYPE_ID za drug primer rabe.
// - TaxRateID na vrstici: naročnik je potrdil, da se za vse storitve
//   uporablja ena skupna davčna stopnja (TRONXERP_API_DEFAULT_TAX_RATE_ID) -
//   namerna odločitev, Storitev zato nima lastnega polja za davčno stopnjo.
// - DocNumber: uporabljamo Termin.id (zagotovo unikaten), ni preverjeno, ali
//   TRONxERP pričakuje numerično zaporedno vrednost.
// Poišče obstoječo stranko v TRONxERP po telefonu, nato e-pošti, nato
// imenu+priimku (v tem vrstnem redu, prvi zadetek šteje) - naročnik je
// zahteval, da booking aplikacija NE ustvarja samodejno novih strank v
// TRONxERP, ampak poišče ujemajočo obstoječo. Če ni najdena, kličoča koda
// uporabi privzeto stranko (TRONXERP_API_DEFAULT_CUSTOMER_ID) in dejanske
// podatke zapiše v opombo dokumenta.
async function poisciTronXerpStranko(stranka: Stranka): Promise<TronXerpStranka | null> {
  const filtri: Record<string, unknown>[] = [];
  if (stranka.telefon) filtri.push({ phone: stranka.telefon, limit: 1 });
  if (stranka.email) filtri.push({ email: stranka.email, limit: 1 });
  filtri.push({ firstName: stranka.ime, lastName: stranka.priimek, limit: 1 });

  for (const filter of filtri) {
    const rezultati = await tronXerpRequest<TronXerpStranka[]>("/integration/getCustomers", {
      method: "POST",
      body: filter,
    });
    if (rezultati?.length) return rezultati[0];
  }
  return null;
}

class ZivTronXerpAdapter implements TronXerpAdapter {
  async sinhronizirajStranko(stranka: Stranka) {
    await tronXerpRequest("/integration/saveCustomer", {
      method: "POST",
      body: {
        customerId: stranka.id,
        firstName: stranka.ime,
        lastName: stranka.priimek,
        phone: stranka.telefon,
        email: stranka.email ?? undefined,
        active: true,
      },
    });
    return { ercPartnerId: stranka.id };
  }

  async sinhronizirajStoritev(storitev: Storitev) {
    const taxRateId = process.env.TRONXERP_API_DEFAULT_TAX_RATE_ID;
    if (!taxRateId) {
      console.warn("[TRONxERP] TRONXERP_API_DEFAULT_TAX_RATE_ID ni nastavljen - preskačem saveArticle");
      return;
    }

    await tronXerpRequest("/integration/saveArticle", {
      method: "POST",
      body: {
        articleId: storitev.id,
        articleErpCode: storitev.ercSifraArtikla ?? undefined,
        articleTitle: storitev.naziv,
        titleDescription: storitev.opis ?? undefined,
        articleType: ARTICLE_TYPE_STORITEV,
        priceWTax: storitev.cena,
        taxRateId,
        active: storitev.aktivna,
        activeWeb: storitev.vidnaNaSpletu,
      },
    });

    await tronXerpRequest("/integration/updateArticleExKeys", {
      method: "POST",
      body: [{ sku: storitev.id, exKey: storitev.id }],
    });
  }

  async sinhronizirajTermin(termin: Termin) {
    const buStoreId = process.env.TRONXERP_API_BUSTORE_ID;
    const buUnitId = process.env.TRONXERP_API_BUNIT_ID;
    const docTypeId = process.env.TRONXERP_API_DOC_TYPE_ID ?? "EPN";
    const taxRateId = process.env.TRONXERP_API_DEFAULT_TAX_RATE_ID;

    if (!buStoreId || !buUnitId || !taxRateId) {
      console.warn(
        "[TRONxERP] TRONXERP_API_BUSTORE_ID/BUNIT_ID/DEFAULT_TAX_RATE_ID ni nastavljenih - preskačem importOrder"
      );
      return;
    }

    const [stranka, postavke] = await Promise.all([
      prisma.stranka.findUniqueOrThrow({ where: { id: termin.strankaId } }),
      prisma.terminStoritev.findMany({ where: { terminId: termin.id }, include: { storitev: true } }),
    ]);

    const najdenaStranka = await poisciTronXerpStranko(stranka);
    const privzetaStrankaId = process.env.TRONXERP_API_DEFAULT_CUSTOMER_ID ?? "0";
    const customerId = najdenaStranka?.customerId ?? privzetaStrankaId;
    const opombaStranke = najdenaStranka
      ? ""
      : `Stranka ni najdena v TRONxERP - ${stranka.ime} ${stranka.priimek}, tel: ${stranka.telefon}` +
        (stranka.email ? `, email: ${stranka.email}` : "") +
        ". ";

    await tronXerpRequest("/integration/importOrder", {
      method: "POST",
      query: {
        BUStoreId: buStoreId,
        virtualArticleTakeDataAndDontBook: true,
      },
      body: {
        DocTypeID: docTypeId,
        BUnitID: buUnitId,
        DocNumber: termin.id,
        DocDate: termin.datumOd.toISOString(),
        CustomerID: customerId,
        CustomerFirstName: stranka.ime,
        CustomerLastName: stranka.priimek,
        CustomerEmail: stranka.email ?? "",
        CustomerPhone1: stranka.telefon,
        UserName: "narocanje-app",
        DocNote: `${opombaStranke}${termin.zapisek ?? ""}`.trim(),
        DocumentPositions: postavke.map((p, i) => ({
          PositionID: i + 1,
          ArticleID: p.storitev.ercSifraArtikla || p.storitev.id,
          ArticleTitle: p.storitev.naziv,
          TaxRateID: taxRateId,
          Quantity: 1,
          PriceWTax: p.cena,
          DiscountPercent1: 0,
          exKey: p.storitev.id,
        })),
      },
    });
  }
}

export const tronXerpAdapter: TronXerpAdapter = tronXerpConfigured()
  ? new ZivTronXerpAdapter()
  : new MockTronXerpAdapter();
