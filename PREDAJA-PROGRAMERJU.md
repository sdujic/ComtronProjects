# Predaja programerju - Naročanje na termin

Ta dokument je namenjen programerju, ki prevzema dokončanje/nadaljevanje projekta. Ne podvaja podrobne dokumentacije (ta obstaja in je sproti vzdrževana - glej spodaj), ampak daje **orientacijo, kje kaj najti, in "zakaj" za odločitve, ki jih iz same kode ni razvidno**.

## 1. Kaj je to

Spletna aplikacija za naročanje strank na termin (booking/rezervacijski sistem), narejena po zgledu SaaS aplikacije Lime Booking, z namenom integracije z ERP sistemom **TRONxERP** (Comtron). Naročnik je privzeto konfiguriral aplikacijo za dejavnost avtoservisa/vulkanizerja, arhitektura pa podpira tudi druge dejavnosti (frizerstvo, inštalacije/servis klim, dimnikarstvo, spa/masaže).

Zgrajena je bila iterativno v enem daljšem AI-asistiranem razvojnem procesu (Claude Code) - vsaka funkcionalnost je bila sproti preizkušena v živo (Playwright) in dokumentirana. Koda je produkcijsko berljiva, a **projekt ni bil pregledan s strani človeškega programerja** - priporočljiv je splošen code review, preden gre v produkcijo.

## 2. Kje je kaj (vsa dokumentacija)

Vse v `NarocanjeAplikacija/` (ta mapa):

| Datoteka | Vsebina |
|---|---|
| `app/README.md` | **Glavni tehnični dokument.** Popoln seznam zgrajenih funkcionalnosti, VSE nastavitve (kaj, kje, privzete vrednosti), znane omejitve, popravljeni hrošči s koreninskim vzrokom, past pri pretvorbi datumov. Posodabljan po vsaki spremembi - to je vir resnice za "kaj aplikacija dejansko počne". |
| `Specifikacija-in-arhitektura.md` | Prvotna funkcionalna specifikacija in predlog arhitekture (nastal PRED kodiranjem) - podatkovni model, faze (MVP/Faza2/Faza3), odprta poslovna vprašanja. Ni bil ažuriran za vsako kasnejšo podrobnost implementacije (README je za to natančnejši), a daje širši kontekst "zakaj tak pristop". |
| `Lime-Booking-analiza.md` | Popoln popis funkcionalnosti referenčne aplikacije Lime Booking, narejen z živim pregledom pravega računa naročnika. Osnova za funkcionalno specifikacijo. |
| `TRONxERP-integracija-poizvedba.md` | Prvi krog raziskave TRONxERP integracijskih možnosti (pred odkritjem pravega API-ja). |
| `TRONxERP-API-swagger-najdba.md` | Odkritje, da TRONxERP ima namenski REST API ("TronOfficeAPI") - seznam endpointov. |
| **`TronOfficeAPI-referenca.md`** | **Polna referenca TronOfficeAPI** (edini vir resnice za natančne sheme zahtev/odgovorov, zajeto iz swagger UI naročnika) - `doLogin`, `importOrder`, `saveCustomer`, `saveArticle`, exKey mehanizem itd. Glej razdelek 8 spodaj za pomembno vrzel. |
| `app/.env.example` | Predloga za `.env` - vse spremenljivke okolja z razlago. |
| `PRIPRAVA-ZA-GOSTOVANJE.md` | Kaj je pripravljeno za javno objavo, varnostni checklist, korak-za-korakom pot za Vercel + PostgreSQL. |
| `Navodila-NarocanjeNaTermin.html` | Interaktivna uporabniška navodila (odpri v brskalniku, ali klikni "Navodila za uporabo" na dnu admin stranske navigacije v delujoči aplikaciji) - oba dela (stranke/osebje) sta VEDNO oba vidna na strani (drug pod drugim, z jasnim naslovom vsakega), gumba zgoraj samo premakneta pogled. Slike v `Navodila-slike/`. **Datoteka je kopirana tudi v `app/public/`** (enako ime, enaka podmapa slik), da jo aplikacija lahko servira neposredno na `/Navodila-NarocanjeNaTermin.html` - če urejaš izvirnik (ta datoteka v korenu), ROČNO kopiraj spremembo tudi v `app/public/` (ni samodejnega build koraka, ki bi to naredil) in ponovno zaženi `next start` (novo dodane datoteke v `public/` se ne postrežejo brez restarta strežnika). |

Koda: `app/` - Next.js 14 (App Router) + TypeScript + Prisma + Tailwind. Struktura opisana na dnu `app/README.md`.

## 3. Zagon v 5 minutah

```bash
cd app
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Teče na `http://localhost:3000` (javni del) in `http://localhost:3000/admin` (admin, **zaščiten s prijavo** - privzeti testni podatki `admin@admin.si`/`123`, glej `app/README.md` razdelek "Prijava v admin"). Razvojno okolje uporablja SQLite (`dev.db`, samodejno ustvarjena). Za produkcijo glej `PRIPRAVA-ZA-GOSTOVANJE.md` za preklop na PostgreSQL in celoten postopek objave.

**Pomembno za nadaljnji razvoj:** `npm run dev` ima v tem projektu opazno večjo latenco na PRVI obisk vsake strani/poti po zagonu strežnika (on-demand kompajliranje, izmerjeno tudi ~6s) - to NI počasna koda. Za testiranje občutene hitrosti vedno uporabi `npm run build && npm start` (glej README, razdelek "npm run dev proti npm run build && npm start").

**Windows razvojna opomba:** `npm run dev` na Windows ne umre vedno zanesljivo ob prekinitvi - če se zdi, da spremembe "ne delujejo", preveri `netstat -ano | findstr LISTENING` na portu 3000 in po potrebi `taskkill /F /PID <pid>` pred ponovnim zagonom.

## 4. Ključne arhitekturne/poslovne odločitve, ki NISO očitne iz kode

Te odločitve so bile sprejete izrecno z naročnikom - če se komu zdijo "nenavadne" ali "narobe" pri branju kode, **NISO bug, ampak namerna odločitev**:

- **Več izvajalcev na isto storitev = več kapacitete na isti termin.** Termin je "zaseden" šele, ko so zasedeni VSI upravičeni izvajalci za to storitev na tej lokaciji - dokler je vsaj eden prost, se termin ponudi naprej (izvajalec se dodeli samodejno ali izbere v ločenem koraku). Javni obrazec ne pove vnaprej, kateremu izvajalcu bo dodeljeno. Glej README, "Obnašanje pri več izvajalcih".
- **Delovni nalog v TRONxERP (`importOrder`) se pošlje ŠELE ob potrditvi termina** (prehod status → `REZERVIRAN`), NE ob nastanku spletne rezervacije. Za ročno v adminu ustvarjene termine (že takoj `REZERVIRAN`) se pošlje takoj. To je bilo v projektu enkrat obrnjeno (najprej "takoj", nato eksplicitno spremenjeno na "šele ob potrditvi") - ne vračaj na prejšnje brez potrditve naročnika.
- **Ena skupna davčna stopnja za vse storitve** (`TRONXERP_API_DEFAULT_TAX_RATE_ID` v `.env`) - namerna poenostavitev, ne pozabljena funkcionalnost. Storitev nima lastnega polja za davčno stopnjo.
- **TRONxERP stranka se NE ustvarja samodejno.** Adapter poišče obstoječo stranko (telefon → e-pošta → ime+priimek), če je ne najde, uporabi privzeto stranko (`TRONXERP_API_DEFAULT_CUSTOMER_ID`) in dejanske podatke zapiše v opombo dokumenta.
- **Odpovedani/zavrnjeni termini (`ODPOVEDAN`) se ne štejejo/prikazujejo kot zasedenost** v tedenskem/mesečnem admin pogledu (a so vidni v dnevnem pogledu s polnim statusom) in samodejno sprostijo termin za novo rezervacijo.
- **Registrska številka vozila je na `Terminu`, ne na `Stranki`** - stranka ima lahko več vozil. Prikaže se na javnem obrazcu samo za dejavnost `AVTOSERVIS`.
- **Zemljevid izbire poslovalnice uporablja Leaflet + OpenStreetMap, NE Google Maps** - naročnikova izrecna odločitev, da se izogne Google Cloud računu/API ključu. Koordinate lokacij se vnašajo ROČNO v adminu (ni geokodiranja iz naslova).
- **Fizična delovna mesta (`DelovnoMesto`) so PRIMARNI pogoj zasedenosti, PER-STORITEV** - vsako delovno mesto (rampa/stol) ima svoj nabor storitev, ki jih zna izvesti; eno mesto streže en termin naenkrat, ne glede na izvajalca. Lokacija BREZ definiranih mest ostane brez te omejitve (samo po zaposlenih - obstoječe/privzeto obnašanje). Glej README, razdelek o delovnih mestih, za natančen primer in razlog dodelitve "najbolj ekskluzivnemu" mestu.
- **Zastavice pri izbiri klicne kode telefona uporabljajo paket `flag-icons` (SVG), NE Unicode emoji** - Windows privzeto ne izriše regional-indicator emoji kot zastavice (pokaže dve črki), kar je bilo dejansko opaženo pri naročnikovem testiranju - ne vračaj na emoji pristop.
- **Prijava v `/admin` ima DVA vira**: "korenski" admin iz `.env` (`ADMIN_EMAIL`/`PASSWORD`, geslo v čistem besedilu - namerna MVP poenostavitev) IN dodatni admini v tabeli `AdminUporabnik` (gesla hashirana z bcrypt, dodajajo se prek `/admin/nastavitve`). Middleware preverja SAMO podpisan piškotek (Edge runtime, brez dostopa do baze) - ne poskušaj dodati poizvedbe v bazo v `middleware.ts`, ne bo delovalo (Prisma/SQLite ne delujeta v Edge runtimu).
- **Urejanje z dvoklikom je dosleden UI vzorec na VSEH admin seznamih** (zaposleni, storitve, lokacije, delovna mesta, urniki, stranke) - dvoklik na vrstico/kartico (ali gumb "Uredi") jo zamenja z urejevalnim obrazcem, "Prekliči" ali uspešno "Shrani" jo vrne nazaj. Če dodajaš nov seznam v adminu, sledi istemu vzorcu (glej `src/components/ZaposleniVrstica.tsx` kot referenčni primer) - naročnik je to eksplicitno zahteval kot dosleden vzorec, ne le enkratno funkcionalnost.
- **Urnik: "čas za rezervacije" MORA biti znotraj "delovnega časa"** - to sta dve ločeni polji (delovni čas je informativen, čas za rezervacije dejansko šteje za razpoložljivost), ki ju je naročnik prvotno lahko nastavil neusklajeno (glej razdelek 5, past #5). Vsaka bodoča sprememba urnikovega obrazca mora ohraniti to validacijo (klient + strežnik).
- **`Urnik` ima `@@unique([zaposleniId, lokacijaId, dan])`** - dodajanje urnika za isto kombinacijo PREPIŠE obstoječega (`upsert`), ne podvoji ga. Če širiš podatkovni model urnika, ohrani to omejitev ali eksplicitno premisli, ali (in zakaj) jo je treba spremeniti.

## 5. Vzorci in pasti, ki jih velja poznati pred nadaljnjim razvojem

- **Nikoli `datum.toISOString().slice(0,10)` za lokalni datumski niz** - povzroči napačen dan pri UTC+1/+2 časovnih pasovih. Vedno `lokalniDatumString()` iz `src/lib/datum.ts`.
- **Za katerikoli "singleton" ali "ensure exists" DB zapis vedno uporabi `upsert()` po fiksnem ključu**, nikoli `findFirst()` + `create()` - slednje je med `next build` (vzporedno generiranje statičnih strani) povzročilo "unique constraint failed".
- **Opozorilno besedilo v UI brez dejanske server-side blokade ni dovolj** - uporabnik/skripta ga lahko obide. Glej vzorec v `ustvariTerminAdmin`/`api/rezervacije` (zavrnitev, ne le opozorilo, če ni prostega izvajalca).
- Polja `Lokacija.casPas`, `Lokacija.valuta`, `Zaposleni.jezik`, `Stranka.jezik` obstajajo v shemi, **a nimajo nobenega učinka v kodi** (dokumentirano pošteno v README, ne skrito) - € je trdo kodiran, ni večjezičnosti.
- **Vse `izbrisi*` akcije uporabljajo `updateMany`/`deleteMany`, NIKOLI `update`/`delete`** z golim `where:{id}` - slednje vrže napako "Record not found" (P2025), če je zapis medtem že izginil (dva zavihka, race condition) - `updateMany`/`deleteMany` na 0 zadetkih tiho ne naredita nič. Ohrani ta vzorec pri vsaki novi "izbriši" akciji.
- **Admin strani, ki agregirajo podatke IZ VEČ kot ene entitete (npr. `/admin/urniki` potrebuje sveže zaposlene IN lokacije), so tvegane za tiho zastarelo predpomnjenje** - Next.js jih privzeto statično predpomni (`○` v `next build` izpisu), akcije, ki ustvarijo/spremenijo TISTE druge entitete, pa navadno revalidirajo samo SVOJO stran. Rešitev, uporabljena za `/admin/urniki`: `export const dynamic = "force-dynamic"` na strani, namesto da bi vsaka prihodnja akcija na katerokoli entiteto vedela, da mora revalidirati tudi to stran. Pred dodajanjem nove take strani preveri `next build` izpis (○ proti ƒ) in razmisli o istem pristopu.
- **Pri verifikaciji/testiranju te aplikacije v tem razvojnem okolju**: ker so admin strani pogosto statične (glej zgoraj), MORA biti testni zapis ustvarjen/spremenjen PREK prave UI akcije (obrazec, gumb), NIKOLI prek direktnega zapisa v bazo mimo aplikacije - drugače se sprememba na statični strani sploh ne prikaže in test lažno pokaže "ni najdeno". Prav tako `public/` mapa v tem projektu zahteva ponoven zagon `next start`, da postrežejo NOVO dodane datoteke (ne le nove build, `next build` sam po sebi ne pomaga, če se strežnik ne restarta).

## 6. Kaj (namerno) manjka pred produkcijo

- **Prijava v `/admin` je ENOSTAVNA, ne "prava" v smislu produkcijskega uporabniškega sistema** - deluje (glej razdelek 4), a brez vlog/pravic, brez omejevanja poskusov prijave (rate limiting), gesla korenskega admina v čistem besedilu v `.env`. Za pravo produkcijsko rabo (ne samo test) je vredno dodati vsaj rate limiting na `/prijava`.
- `npm audit` javlja 1 kritično + 1 visoko ranljivost, obe v `next@14.2.5` samem (ne v dodanih paketih) - popravek zahteva nadgradnjo na `next@14.2.35+`.
- E-poštna/SMS obvestila, spletno plačevanje, poročila/analitika, vloge in pravice (izvajalec vidi samo svoj urnik) - vse eksplicitno v Fazi 2/3 specifikacije, ni bilo del MVP obsega.
- Mapiranje lokacij na TRONxERP `BUStoreID`/`BUnitID` je trenutno ENA vrednost prek `.env`, ne po posamezni lokaciji (relevantno šele pri več fizičnih poslovalnicah, ki dejansko ustrezajo različnim TRONxERP poslovnim enotam).

## 7. Odprta vrzel pri TRONxERP integraciji - NE ugibaj, vprašaj naročnika/COMTRON

`TronOfficeAPI-referenca.md` (edini vir resnice, zajet iz swagger UI naročnika) vsebuje endpoint za **USTVARJANJE** dokumentov/naročil (`POST /integration/importOrder`), ni pa v njem najden noben endpoint za **BRANJE/poizvedovanje** po že ustvarjenih dokumentih/delovnih nalogih nazaj. Zato stran `/admin/zgodovina` prikazuje samo lastne podatke aplikacije (katere storitve so bile rezervirane), ne pa dejanskih podrobnosti opravljenega dela iz TRONxERP (npr. dodatni deli/postavke, ki jih mehanik doda naknadno na delovnem nalogu).

**Pred kakršnokoli implementacijo branja iz TRONxERP nazaj:** preveri z naročnikom/COMTRON, ali tak endpoint sploh obstaja (morda del swaggerja, ki še ni bil zajet na zaslonskih posnetkih) - ne ugibaj imena endpointa.

## 8. Dostop do TRONxERP testnega okolja

Za testiranje žive integracije je naročnik uporabljal interno testno okolje TRONxERP (`http://10.0.1.47/TRONxERP/login`, uporabniško ime `sasa`). **Geslo namenoma ni zapisano nikjer v tem projektu** (dogovor z naročnikom) - programer naj ga pridobi neposredno od naročnika, ko bo dejansko testiral pravo TronOfficeAPI integracijo (trenutno aplikacija privzeto uporablja mock adapter, ki samo logira - deluje brez pravih poverilnic, glej `TRONXERP_API_USERNAME`/`PASSWORD` v `.env.example`).

## 9. Priporočeni naslednji koraki

1. Code review celotne kodne baze (noben človeški programer je še ni pregledal).
2. `npm audit fix` / nadgradnja Next.js.
3. Gostovanje - glej `PRIPRAVA-ZA-GOSTOVANJE.md` za pripravljen korak-za-korakom postopek (Vercel + PostgreSQL) in varnostni checklist pred javno objavo.
4. Rate limiting na `/prijava`, po možnosti nadgradnja admin uporabniškega sistema (vloge/pravice - Faza 2/3).
5. Če se integracija z TRONxERP nadaljuje: pridobiti prave TronOfficeAPI poverilnice in preveriti razdelek 7 zgoraj.
