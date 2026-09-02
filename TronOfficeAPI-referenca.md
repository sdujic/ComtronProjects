# TronOfficeAPI – referenca endpointov (zajeto iz swagger UI, 2.9.2026)

Vir: `https://xerp.comtron.si/tronofficeapi/swagger/` – zaslonski posnetki, ki jih je poslal naročnik iz svojega prijavljenega brskalnika. To je edini vir resnice za natančne sheme (polja/tipi) - v UI dokumentacijskih virih (priročnik, uporabniška navodila) tega ni bilo nikjer.

**Avtorizacija:** vsak endpoint (razen `/login/doLogin`) zahteva glavo `Authorization` s stringom, pridobljenim iz `doLogin` odziva (`Token`). Primer v dokumentaciji: `9cecbd3f-1e75-4ae2-af46-b8d5b6f09e31` (surov GUID token, brez "Bearer " predpone - razen ene nedoslednosti pri `getClassifications`, ki kaže primer "Bearer your_auth_token"; verjetno napaka v dokumentaciji, privzeto uporabi surov token).

---

## Login

### `POST /login/doLogin`
Prijava z uporabniškim imenom/geslom, vrne žeton za nadaljnje klice.

Zahteva (body):
```json
{ "UserName": "JohnDoe@comtron.si", "Password": "H!dd3nP@ss" }
```

Odgovor 200:
```json
{
  "UserID": 1,
  "Token": "9cecbd3f-1e75-4ae2-af46-b8d5b6f09e31",
  "UserName": "JohnDoe@comtron.si",
  "FirmID": 1,
  "FirstName": "John",
  "LastName": "Doe",
  "UserAppExData": { "profilePicture": "picturePath" }
}
```
Drugi statusi: 202, 203, 206, 401 Unauthorized, 500.

**Odprto vprašanje:** ali se za ta klic uporabljajo isti uporabniški podatki kot za spletno prijavo v TRONxERP, ali ločen integracijski račun. Preveriti pri naročniku/COMTRON.

---

## Integration (splošno)

### `POST /integration/importOrder`
"Import order in TRONoffice." — **ključen endpoint za booking aplikacijo.**

Query parametri:
- `BUStoreId` (required) — Bus unit store id
- `splitExKey` — ločilo za razdelitev exKey iz sestavljenega stringa (prvi segment postane exKey)
- `splitExKeyVariantBy` — enako za variant exKey
- `takeArticlePriceFromPriceList` (default false) — če true, cena se vzame iz TRONoffice cenika namesto poslane cene
- `virtualArticleTakeDataAndDontBook` (default false) — **zelo pomembno:** ko true, so "virtualni (storitveni) artikli" vključeni v dokument s svojimi podatki, a se NE knjiži gibanje zaloge. To dokazuje, da TRONxERP že pozna koncept "storitvenega artikla brez zaloge" — natanko to so naše Storitve.
- `OSSEnabled` (default 0) — 0=izklopljeno, 1=OSS obračun DDV, 2=OSS z delitvijo računa po državah
- `useOrderArticleTitle` (default true) — če true, uporabi naziv artikla iz prejetega naročila; false uporabi naziv iz TRONoffice matičnega artikla

Telo zahteve (POLNA shema, PascalCase - drugačna konvencija kot večina ostalih endpointov, verjetno starejši/POS-checkout izvor, zajeto v celoti 2.9.2026):
```json
{
  "DocTypeID": "EPW",
  "BUnitID": "01",
  "ElectronicDeviceID": "300",
  "CashRegisterID": "01",
  "CashRegisterCloseID": "201",
  "DocNumber": "1",
  "DocName": "S1",
  "DocDate": "2023-01-01 10:00:00",
  "RowGuidCustomer": "",
  "CustomerID": "Web_1",
  "CustomerFirstName": "Luka",
  "CustomerLastName": "Comtron",
  "CustomerAddress": "Tržaška cesta 21",
  "CustomerPostalCodeID": "2000",
  "CustomerPostalCodeName": "Maribor",
  "CustomerCountry": "",
  "CustomerISOCode": "",
  "CustomerTaxNumber": "0",
  "CustomerTaxPayer": "0",
  "CustomerEmail": "luka@comtron.si",
  "CustomerPhone1": "",
  "UserName": "tronpos",
  "UserFirstName": "Spletno",
  "UserLastName": "Naročilo",
  "UserTaxNumber": "12345678",
  "PaymentType": "PayPal",
  "PaymentTypeGuid": "",
  "DocNote": "",
  "RowGuidReciever": "",
  "RecieverID": "",
  "RecieverLastName": "",
  "RecieverFirstName": "",
  "RecieverAdress": "",
  "RecieverPostalCodeID": "",
  "RecieverPostalCodeName": "",
  "RecieverCountry": "",
  "RecieverISOCode": "",
  "RecieverTaxNumber": "",
  "RecieverTaxPayer": "",
  "RecieverEmail": "",
  "RecieverPhone1": "",
  "UsedBonusActive": false,
  "COD": "",
  "RowGuidArticleDeliveryCosts": "",
  "DocumentPositions": [
    {
      "PositionID": 1,
      "RowGuidArticle": "",
      "RowGuidArticleVariant": "",
      "ArticleID": "SPLET",
      "ArticleTitle": "Computer",
      "ArticleType": "0",
      "TaxRateID": "A",
      "TaxRate": 22,
      "Quantity": 2,
      "PriceWTax": 10,
      "PriceNoTax": 12.2,
      "DiscountPercent1": 0,
      "exKey": "12312313223",
      "exKeyVariant": "12333212231123"
    }
  ],
  "UsedCoupons": [
    { "CouponNumber": "CPW-2024-0001" }
  ],
  "UsedGiftCards": [
    { "giftCardNumber": "GC-2024-0001", "redeemAmount": 20 }
  ]
}
```

**Opombe k polnemu telesu:**
- `BUnitID` (poslovna enota) je LOČENO polje od query parametra `BUStoreId` (konkretna prodajalna/skladišče znotraj enote) - oba se pošljeta.
- Vsaka vrstica v `DocumentPositions` lahko artikel navede na DVA načina: prek `RowGuidArticle`/`RowGuidArticleVariant` (če že poznamo natančen TRONxERP GUID artikla), ALI prek `exKey`/`exKeyVariant` (naš zunanji ID - TRONxERP artikel razreši sam prek exKey mehanizma). **Za booking aplikacijo je pot prek `exKey` bistveno enostavnejša** - ni treba vnaprej poizvedovati/predpomniti GUID-ov, dovolj je, da so Storitve vnaprej sinhronizirane prek `saveArticle` + `updateArticleExKeys` z našim internim ID-jem kot exKey.
- `ArticleType` na vrstici (primer: `"0"`, string) - še vedno ni jasno, katera vrednost pomeni "virtualni/storitveni artikel" (glej `virtualArticleTakeDataAndDontBook` query parameter) - domneva: to je lastnost MATIČNEGA artikla (nastavljena prek `saveArticle`), ne nujno nekaj, kar je treba ročno določiti na vsaki vrstici naročila; vrednost na vrstici je morda le informativna/echo. Ostaja odprto vprašanje.
- `RowGuidReciever`/`Reciever*` polja - ločen "prejemnik" od "stranke/naročnika" (npr. dostava na drug naslov kot je naročnik) - za booking to ni relevantno, lahko se pustijo prazna.
- `UsedCoupons`/`UsedGiftCards` - podpora za kupone in darilne bone neposredno v naročilu (povezava z `/integration/giftCard/*` endpointi) - ni potrebno za MVP, a na voljo za Fazo 2.
- `DocNumber`/`DocName` v primeru izgledata kot bi jih pošiljal klicatelj (ne generira jih TRONxERP) - treba preveriti, ali gre za obvezno unikatno vrednost, ki si jo mora izmisliti booking aplikacija (npr. lastna zaporedna številka), ali za opcijski namig.
- `DocTypeID` **potrjeno s strani naročnika: `"EPN"`** (primer `"EPW"` v swagger dokumentaciji je bil torej napačen/nadomeščen primer, ne prava vrednost za spletno naročilo).

Odgovor 200: `{ "Success": true, "ErrorMessage": "Error message" }`. 500 Internal Server Error.

### `POST /integration/saveCustomer`
"Create or update customer" (camelCase konvencija).

Telo:
```json
{
  "customerId": "C001",
  "lastName": "Novak",
  "firstName": "Janez",
  "address": "Tržaška cesta 21",
  "postalCodeId": "2000",
  "postalCodeName": "Maribor",
  "countryISOCode": "SI",
  "phone": "123456789",
  "phone2": "321321231",
  "email": "sample@mail.com",
  "currencyName": "EUR",
  "taxNumber": "12345679",
  "taxPayer": false,
  "customerTaxGroupName": "Skupina davkov 1",
  "confidentialCard": "12345666778",
  "maxDiscordPercent": 30,
  "cascontoPercent": 10,
  "isBlocked": false,
  "active": true,
  "paymentDeadline": 10
}
```
Odgovor: `{ "Success": true, "ErrorMessage": "..." }`. 500.

### `GET /integration/customer`
Params: `customerId` ALI `taxNumber` (eno od dveh obvezno), `Authorization`.

Odgovor 200 (primer): vsebuje ista polja kot saveCustomer, plus `articlePriceListId`, `articlePriceListName`.

### `POST /integration/getCustomers`
"Seznam strank z neobveznimi filtri - samo podana polja se uporabijo v WHERE." Vsi parametri v telesu neobvezni:
```json
{
  "customerId": "C001", "lastName": "Novak", "firstName": "Janez",
  "address": "Tržaška", "phone": "041123456", "email": "janez@test.si",
  "taxNumber": "12345678", "taxNumberNotEmpty": true, "taxPayer": true,
  "active": true, "isBlocked": false, "postalCodeId": "2000",
  "countryISOCode": "SI", "customerTaxGroupName": "Skupina davkov 1",
  "limit": 1000
}
```

### `GET /integration/getBusUnitsWithStores`
"Seznam poslovnih enot (BusUnit) z njihovimi skladišči/prodajalnami (BusUnitStore). Privzeto samo aktivne." Param: `includeInactive` (default 0).

Odgovor 200:
```json
[{
  "rowGuidBusUnit": "00000000-0000-0000-0000-000000000001",
  "busUnitId": "PE01", "busUnitName": "Poslovna enota 1",
  "busUnitActive": true, "busUnitCity": "Ljubljana", "companyId": "...",
  "stores": [{
    "rowGuidBuStore": "00000000-0000-0000-0000-000000000002",
    "storeId": "S01", "storeName": "Glavno skladišče",
    "storeType": 0, "active": true, "storeExternal": false, "storeOnWay": false
  }]
}]
```
Uporabno za mapiranje naših Lokacij na TRONxERP poslovne enote/prodajalne (BUStoreID, ki ga zahteva `importOrder`).

### `GET /integration/getTaxRates`
Param: `includeInactive`. Vrne davčne stopnje z zgodovino vrednosti (`values[]`: rate, rateFactor, validFromDate/validToDate).

### `GET /integration/getDeliveries`
Vrne šifrant dostave s stroškovnimi pravili (isti šifrant kot je bil viden v UI, razdelek D prejšnjega dokumenta - tu je dostopen prek API-ja z b2c/b2b stikali `itcb2cUse`/`itcb2bUse`).

---

## Integration - Article (Product)

### `GET /integration/getArticles`
Mnogo neobveznih query parametrov: `limit`, `rowChangeId` (za inkrementalno sinhronizacijo), `rowGuidBUStore`, `rowGuidBusUnit`, `returnAllArticles`, `returnOnlyTransferToWebArticles`, `hasPartLists`, `busUnitArticle`, `pictures` (default true), `pictureURL`, `mode`, `allAttributes` (default true), `loadStockSeparately`, `priceList`, `specificPriceList`.

Odgovor (polna shema, zajeto 2.9.2026):
```json
{
  "rowGuidArticle": "00000000-0000-0000-0000-000000000000",
  "articleId": "Test article",
  "articleTitle": "This is test article.",
  "articleTitle2": "This is test article 2.",
  "articleDescription": "This is article description",
  "active": true,
  "webActive": true,
  "priceNoTax": 10,
  "priceWTax": 12.2,
  "htmlDescription": "",
  "articleTypeName": "Blago",
  "exKey": "",
  "stock": 100,
  "rowChID": "100",
  "variants": [
    {
      "rowGuidArticleVariant": "string",
      "articleVariantTitle": "string",
      "active": true,
      "priceFactor": 0,
      "priceFactor2": 0,
      "discountPercent": 0,
      "discountPercent2": 0,
      "stock": 0,
      "priceNoTax": 0,
      "priceWTax": 0,
      "exKey": "string",
      "attributes": [{ "name": "string", "value": "string", "exKey": "string" }]
    }
  ],
  "picture": "string",
  "classification1": "string",
  "classification2": "string",
  "classification3": "string",
  "tradeMark": "string",
  "tradeMarkDescription": "string",
  "barcode": "string",
  "articleUnit": "string",
  "sourceContry": "string",
  "checkOnlineStock": "string",
  "nettoWeight": "string",
  "bruttoWeight": "string",
  "taxRateId": "A",
  "transferToWeb": true,
  "salePriceNoTax": 9.76,
  "salePriceWTax": 12.2,
  "salePriceDateFrom": "2024-06-01T00:00:00.000Z",
  "salePriceDateTo": "2024-06-30T23:59:59.000Z",
  "maxDiscountPercent": 20,
  "articleExKeys": ["EK001", "EK002"],
  "articleClassIDs": ["CLASS01", "CLASS02"],
  "pictures": ["string"],
  "pictureURL": "string",
  "picturesURL": ["string"],
  "articleSerials": [
    {
      "serialNumber": "string",
      "quantity": 0,
      "dateProduction": "2026-09-02T16:39:35.312Z",
      "dateExpired": "2026-09-02T16:39:35.312Z",
      "rowGuidBuStore": "string",
      "storeId": "string",
      "storeName": "string"
    }
  ]
}
```

**`articleType` šifrant - dokončno potrjeno s strani naročnika (2.9.2026):**

| articleType | articleTypeName |
|---|---|
| 0 | Blago |
| **1** | **Storitve** |
| 2 | Nad artikel za tekstil |
| 3 | Sestavnica |
| 4 | Plačilni (darilni) boni |
| 5 | Okoljska dajatev |
| 6 | Proizvodni artikel |
| 100 | Navidezni artikel |
| 101 | Artikel dostave |
| 102 | Variabilni stroški |

**Odprta nianса:** query parameter pri `importOrder` se imenuje `virtualArticleTakeDataAndDontBook` in njegov opis izrecno pravi "virtual (service) articles" - kar bi lahko pomenilo bodisi `articleType=1` (Storitve) BODISI `articleType=100` (Navidezni artikel, dobesedni prevod "virtual article"). Za naše booking Storitve (delo na servisu, diagnostika ipd.) je semantično pravilna vrednost **`articleType=1` (Storitve)** - to je zdaj privzeto uporabljeno v `saveArticle` klicu. Če bi se v živem testu izkazalo, da `importOrder` s tem tipom vseeno poskuša knjižiti gibanje zaloge (napaka), je `articleType=100` (Navidezni artikel) rezervna možnost za preizkus.

### `POST /integration/getArticlesV2`
Napreden fetch s kriterijskim objektom, podpira selektivno nalaganje polj (`select` mapa po tabeli) in `ChangeTableNames` za spremljanje sprememb. Vrne `maxRowChID` za naslednji inkrementalni klic.

### `GET /integration/getArticlesV3`
Paginiran seznam (offset/limit, max 2000/stran) brez cen/zaloge/slik, za zelo velike kataloge (1M+). Vsak artikel ima `exKey`, `articleExKeys[]` (seznam vseh eksternih ključev - torej podpira VEČ exKeyjev na artikel), `taxRateId`, `articleUnit`, `variants[]` s svojim `exKey`.

### `POST /integration/saveArticle`
"Create or update article" — **ključen za sinhronizacijo Storitev → TRONxERP artikel.**

Telo (primer):
```json
{
  "articleId": "ART123456",
  "articleErpCode": "INFO123",
  "articleBarcode": "1234567890123",
  "articleTitle": "Sample Article",
  "articleTitle2": "Alternative Title",
  "titleDescription": "Detailed description of the title",
  "articleType": 1,
  "priceWTax": 19.99,
  "articleUnitId": "UNIT123",
  "articleUnitName": "Kilogram",
  "taxRateId": "TAX123",
  "provisionUnit": "...",
  "incomeTaxRateId": "ITR123",
  "notForSale": false,
  "requestQuantityOrPrice": 5,
  "maxDiscountPercent": 15,
  "minPcPrice": 5,
  "nettoWeight": 1.2,
  "articleInfoCode2": "INFO0456",
  "active": true,
  "activeWeb": true,
  "htmlDescription": "<p>Article Description</p>",
  "supplierId": "SUP123",
  "articleClassification": "Electronics"
}
```
**Odprto vprašanje:** katera vrednost `articleType` označuje "virtualni/storitveni artikel" (glej `virtualArticleTakeDataAndDontBook` pri importOrder) - to je treba preveriti (verjetno majhen nabor celoštevilskih vrednosti, npr. 1=blago, 2=storitev ali podobno - ni razvidno iz swagger primera).

### ExKey upravljanje (mapiranje zunanjih ID-jev - "exKey" = external key)
Cel sklop endpointov namenjen izključno mapiranju naših ID-jev na TRONxERP zapise - to je **pravi, namenski mehanizem** za povezavo Storitev ↔ Artikel (boljši od prostega besedilnega polja "ERP šifra artikla", ki je bilo najdeno v UI):

- `POST /integration/updateArticlesExKeys` — telo: `{ rowGuidArticle, exKey, variants: [{ rowGuidArticleVariant, exKey }] }`
- `POST /integration/updateArticlesExKeysV2` — enako, a array in "upsert" v ločeno ArticleExKey tabelo (torej podpira VEČ exKeyjev na en artikel hkrati, ne le zamenjavo enega)
- `POST /integration/updateArticleVariantsExKeys` — telo: `[{ rowGuidArticleVariant, exKey }]`
- `POST /integration/updateArticleVariantsExKeysByExKey` — ujemanje po OBSTOJEČEM exKey namesto GUID-a: `[{ newExKey, exKey }]`
- `POST /integration/updateArticleExKeys` — ujemanje po SKU/articleId (ne GUID): telo `[{ sku, exKey }]`, query param `useArticleCode` (default 0, če 1 ujema po articleCode namesto SKU), `fillArticleExKeyTable` (default 1)
- `GET /integration/getArticleAttributes`, `getArticleAttributesValues` + ustrezna `updateArticleAttributesExKeys`/`updateArticleAttributeValuesExKeys` — enak exKey mehanizem za atribute/vrednosti atributov artiklov (verjetno manj relevantno za booking, artikli nimajo variantnih atributov v našem primeru)
- `GET /integration/getClassifications`, `POST /integration/updateClassifications` — klasifikacije artiklov (telo: `[{ articleClassId, articleClassificationName, articleClassParentId }]`, param `updateOnly`)

---

## Integration - Stock

Verjetno manj relevantno za booking storitve (te nimajo fizične zaloge), a za popolnost:
- `GET /integration/getArticlesStock`, `getArticleVariantsStock`, `getArticleVariantsStockV2` (paginirano, do 700000+ variant), `getArticleStock/{rowGuidArticle}` — vsi podpirajo `rowChangeId` za inkrementalno sinhronizacijo
- `POST /integration/getArticleStockForCheckout` — hitro paketno preverjanje zaloge za "web shop checkout" (telo: `[{ rowGuidArticle, rowGuidArticleVariant, quantity }]`, odgovor: `{ allAvailable, items: [{ stock, quantity, enough }] }`) — imenovanje ("checkout") potrjuje, da je ta API dejansko namenjen webshop/e-commerce integracijam.

## Integration - Pricing

- `GET /integration/articlePriceLists` — ceniki z veljavnostjo (datum od/do, dnevi v tednu, ure od/do)
- `GET /integration/articlePrices/{priceListId}`, `articlePricesV2/{priceListId}` (paginirano) — cene za določen cenik
- `GET /integration/getDiscounts` — popusti (Discount + DiscountGroup + DiscountItem + DiscountKey struktura), paginirano

## Integration - GiftCard

- `GET /integration/giftCard/{giftCardNumber}`, `POST /integration/giftCard` (ustvari), `POST /integration/giftCard/redeem` (unovči) — verjetno ni neposredno relevantno za booking, a dokazuje širino API-ja (darilni boni bi lahko bili zanimivi za Fazo 2 - "darilni bon za storitev").

---

## Sklep: kaj to pomeni za booking aplikacijo

To je **dokončno, samopostrežno, dokumentirano REST API**, namenjeno prav integracijam kot je naša (imenovanje "checkout", "web shop" v opisih endpointov to eksplicitno potrjuje). Predlagan tok:

1. **Ob zagonu/priklopu adapterja**: `POST /login/doLogin` → shrani `Token` (verjetno časovno omejen - trajanje ni navedeno, treba testirati/predvideti osvežitev).
2. **Ob prvi sinhronizaciji**: `GET /integration/getBusUnitsWithStores` → mapiraj naše Lokacije na `BUStoreID`.
3. **Ob ustvarjanju/urejanju Storitve v adminu**: `POST /integration/saveArticle` (z `articleType` za storitev, ko bo znan) + `POST /integration/updateArticleExKeys` za zapis našega internega ID-ja kot exKey.
4. **Ob novi Stranki**: `POST /integration/saveCustomer`.
5. **Ob zaključku Termina**: `POST /integration/importOrder` z `virtualArticleTakeDataAndDontBook=true` (ker so naše storitve "virtualni artikli" brez zaloge) in `BUStoreId` iz koraka 2.

**Preostale odprte podrobnosti** pred polno implementacijo: vrednost `articleType`, ki v TRONxERP označuje "virtualni/storitveni artikel" (za pravilno `saveArticle` sinhronizacijo), trajanje/osvežitev `Token`-a, in ali je `DocNumber` obvezno unikaten (glej opombe pri `importOrder` zgoraj). Oblika vrstic/postavk naročila (`DocumentPositions`) je zdaj v celoti znana (zajeto 2.9.2026, glej razdelek zgoraj) in implementirana v `NarocanjeAplikacija/app/src/lib/tronxerp-adapter.ts`.
