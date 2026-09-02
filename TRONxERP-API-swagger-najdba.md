# Najdba: TronOfficeAPI (dokumentiran REST API TRONxERP)

Naročnik je 2.9.2026 posredoval povezavo: `https://xerp.comtron.si/tronofficeapi/swagger/#/`

Ta najdba **razveljavi prejšnji sklep** iz `TRONxERP-integracija-poizvedba.md` ("noben vir ne opisuje dokumentiranega API-ja") — API namreč obstaja, le ni bil omenjen v uporabniškem priročniku ali v uporabniških navodilih (kar je logično, ker je namenjen razvijalcem, ne končnim uporabnikom).

## Kaj je bilo preverjeno (brez prijave, samo curl/WebFetch)

- `GET https://xerp.comtron.si/tronofficeapi/swagger/` → vrne standardno Swagger UI HTML ogrodje ("TronOfficeAPI" je torej ime API-ja/servisa).
- `GET .../tronofficeapi/swagger/swagger-initializer.js` → vsebuje **privzeto/nekonfigurirano** nastavitev (`url: "https://petstore.swagger.io/v2/swagger.json"`) - to je nenavadno, ker to pomeni, da statični swagger-ui vmesnik na tej poti kaže na napačen (demo) spec. Možno je pravi URL specifikacije drugje, ali pa ga UI dinamično prepiše po prijavi/JS routing (hash `#/` v naslovu, ki ga je poslal naročnik, ni bil viden strežniku prek curl, ker se fragmenti ne pošljejo).
- `GET .../tronofficeapi/swagger/v1/swagger.json` → HTTP 400, telo: `{"Success":false,"ErrorCode":403,"ErrorMessage":"Seja vam je potekla"}` — **to je ključen dokaz**: API zahteva avtenticirano sejo (enak vzorec odziva `{"Success":false,...}`, kot je bil opažen pri internih SPA klicih, npr. `saveUserVacation`). Torej je API zaščiten (ni prosto dostopen), a **dejansko obstaja in je živ**.
- Poskusi na internem testnem strežniku `10.0.1.47` (kjer teče vzporedna živa raziskava z uporabnikom `sasa`/`123`) na poteh `/tronofficeapi/swagger/` in `/TRONxERP/tronofficeapi/swagger/` → oba 404. Torej je TronOfficeAPI verjetno na voljo samo na produkcijskem/cloud strežniku `xerp.comtron.si`, ne na internem testnem okolju - **ni bilo mogoče preveriti z že razpoložljivimi poverilnicami** (uporabnik `sasa`/`123` velja za drug strežnik).

## Kaj je potrebno za nadaljevanje

Za dostop do dejanske specifikacije (seznam endpointov, modelov, avtentikacijske metode) je potrebna ena od:
1. **Delujoča prijava na `xerp.comtron.si`** - prejšnji poskus (18.8.2026, `sasa.dujic@comtron.si`) je vrnil napako "Presegli ste zakupljeno število uporabnikov". Če je to zdaj razrešeno (nov licenčni slot), lahko poskusimo znova - potreben je uporabnik + geslo za ta konkreten (produkcijski/cloud) strežnik.
2. **API ključ/token**, če TronOfficeAPI podpira ločeno avtentikacijo (npr. API key namesto uporabniške seje) - to bi bilo treba preveriti pri COMTRON ali v nastavitvah TRONxERP (morda ravno v neraziskanem "Administrativni modul", ki ga trenutno preverja vzporedni agent).
3. Če naročnik že ima dostop v svojem brskalniku (verjetno, glede na to, da je povezavo posredoval), lahko **sam odpre povezavo, klikne "Export"/prenese `swagger.json`** ali preprosto pošlje seznam vidnih skupin endpointov (tagov) - to bi takoj razjasnilo obseg API-ja brez nadaljnjega ugibanja poverilnic.

## Posodobitev 2.9.2026: naročnik je delil zaslonske posnetke iz lastnega prijavljenega brskalnika

Naročnik je v svojem brskalniku (kjer je očitno že prijavljen na `xerp.comtron.si`) odprl swagger stran in poslal zaslonske posnetke dejanskega seznama endpointov. **To dokončno potrjuje: TronOfficeAPI ima namenski, samopostrežni "Integration" API sklop**, ne le splošen interni API. Vsak endpoint ima ključavnico (zahteva avtorizacijo - verjetno bearer token, pridobljen prek `/login/doLogin`).

### Seznam ugotovljenih endpointov (iz swagger UI, brez odprtih shem zahtev/odgovorov - te je treba še pridobiti)

**Login**
- `POST /login/doLogin` - najverjetneje vstopna točka za pridobitev avtorizacijskega žetona za vse ostale klice.

**Integration** (splošno - "Integracijski API-ji")
- `POST /integration/importOrder` - **ključen za booking aplikacijo**: neposreden uvoz naročila v TRONxERP. Skoraj zagotovo je TO mehanizem, ki polni modal "Pregled spletnih naročil" (Veleprodaja → Pregled naročil), odkrit v živi raziskavi 2.9.2026 (glej `TRONxERP-integracija-poizvedba.md`, razdelek D).
- `POST /integration/saveCustomer`, `GET /integration/customer`, `POST /integration/getCustomers` - CRUD nad strankami/poslovnimi partnerji.
- `GET /integration/getBusUnitsWithStores` - seznam poslovnih enot/prodajaln (relevantno za mapiranje naših "Lokacij").
- `GET /integration/getTaxRates` - davčne stopnje (potrebne pri sestavljanju naročila/računa).
- `GET /integration/getDeliveries` - šifrant dostave (isti šifrant kot je bil pregledan v živo, glej razdelek D, točka 5).

**Integration - Article (Product)** ("Integracijski API-ji za artikle - osnovni podatki, atributi, klasifikacije, exKey")
- `GET /integration/getArticles`, `getArticlesV2` (POST), `getArticlesV3` (GET) - branje artiklov.
- `POST /integration/saveArticle` - ustvarjanje/urejanje artikla (potencialno: sinhronizacija Storitev → TRONxERP artikel).
- `POST /integration/updateArticlesExKeys`, `updateArticlesExKeysV2`, `updateArticleVariantsExKeys`, `updateArticleVariantsExKeysByExKey`, `updateArticleExKeys` - **"ExKey" = eksterni ključ** - to je verjetno pravi, namenski mehanizem za mapiranje ID-jev med zunanjim sistemom (booking aplikacijo) in TRONxERP artikli, natančnejši od prosto urejljivega polja "ERP šifra artikla", ki je bilo pregledano v UI (razdelek D, točka 4).
- `GET /integration/getArticleAttributes`, `getArticleAttributesValues`, `updateArticleAttributesExKeys` (POST), `updateArticleAttributeValuesExKeys` (POST) - atributi artiklov.
- `GET /integration/getClassifications`, `POST /integration/updateClassifications` - klasifikacije (ujema se z najdbo "Spletna klasifikacija" stikala iz prvotne dokumentacijske poizvedbe).

**Integration - Stock** ("Integracijski API-ji za zalogo")
- `GET /integration/getArticlesStock`, `getArticleVariantsStock`, `getArticleVariantsStockV2`, `getArticleStock/{rowGuidArticle}`, `POST /integration/getArticleStockForCheckout` - zaloga (verjetno manj relevantno za booking storitve, bolj za fizične artikle/dele).

**Integration - Pricing** ("Integracijski API-ji za cene in popuste")
- `GET /integration/articlePriceLists`, `articlePrices/{priceListId}`, `articlePricesV2/{priceListId}`, `getDiscounts` - ceniki in popusti.

**Integration - GiftCard** ("Integracijski API-ji za darilne bone")
- `GET /integration/giftCard/{giftCardNumber}`, `POST /integration/giftCard`, `POST /integration/giftCard/redeem` - darilni boni (verjetno ni relevantno za booking, a dobro vedeti da obstaja).

### Kaj to pomeni za integracijo booking aplikacije

Ta najdba **razveljavi prejšnji previdnejši sklep** ("integracija bo verjetno zahtevala individualno delo COMTRON, po zgledu 'TIC'"). Namesto tega obstaja jasna, dokumentirana, samopostrežna pot:

1. **Stranke**: `saveCustomer`/`getCustomers` za sinhronizacijo Stranka ↔ Poslovni partner (namesto ročnega ujemanja, ki ga izvaja "Pregled spletnih naročil" modal).
2. **Storitve (kot artikli)**: `saveArticle` + `updateArticlesExKeys`/`updateArticleExKeys` za pravilno, namensko mapiranje ID-jev (namesto prosto urejljivega polja "ERP šifra artikla").
3. **Termin → Naročilo**: `importOrder` ob zaključku termina - to je verjetno neposredna zamenjava za sedanji mock klic `tronXerpAdapter.sinhronizirajTermin()` v `NarocanjeAplikacija/app/src/lib/tronxerp-adapter.ts`.
4. **Podporni podatki**: `getBusUnitsWithStores` (mapiranje Lokacij), `getTaxRates`, `getDeliveries`.

### Kar še manjka, preden je mogoče adapter dejansko implementirati

- **Natančna shema zahteve/odgovora** za `doLogin`, `importOrder`, `saveCustomer`, `getBusUnitsWithStores` (polja, tipi, obvezna/neobvezna) - v swagger UI je treba razširiti (klik na posamezen endpoint) in razkriti "Request body"/"Responses" shemo. Trenutni zaslonski posnetki so pokazali le seznam poti, ne notranjih shem.
- **Način avtorizacije** - ali `doLogin` vrne bearer token, ki se pošilja v `Authorization` glavi pri vseh nadaljnjih klicih (najverjetnejši vzorec glede na ključavnice na vsakem endpointu), ali gre za nekaj drugega (API-ključ, seja/cookie).
- **Poverilnice za API** - ali se za `doLogin` uporabljajo isti uporabniški podatki kot za spletno prijavo (`sasa.dujic@comtron.si` ipd.), ali gre za ločen "integracijski" uporabniški račun/API-ključ, ki ga je treba pridobiti pri COMTRON.

## Vpliv na Specifikacija-in-arhitektura.md

Razdelek 6 je bil posodobljen: integracija zdaj velja za **"Pot A" (TronOfficeAPI) kot primarno in izvedljivo že v zgodnji fazi**, ne šele Fazo 3. Glej tudi posodobljen mock adapter v `NarocanjeAplikacija/app/src/lib/tronxerp-adapter.ts`.
