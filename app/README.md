# Naročanje na servis – ogrodje aplikacije

MVP ogrodje rezervacijske aplikacije, zgrajeno po `../Specifikacija-in-arhitektura.md`.

**Uporabniška navodila** (za stranke IN za osebje, z zaslonskimi posnetki): odpri `../Navodila-NarocanjeNaTermin.html` v brskalniku, ALI klikni »Navodila za uporabo« na dnu admin stranske navigacije (`AdminNav.tsx`) - stran je kopirana tudi v `public/` (glej spodaj), da je dosegljiva neposredno iz delujoče aplikacije na `/Navodila-NarocanjeNaTermin.html`. **Priprava za javno objavo/gostovanje**: `../PRIPRAVA-ZA-GOSTOVANJE.md`. **Predaja/orientacija za programerja**: `../PREDAJA-PROGRAMERJU.md`.

## Zagon (razvojno okolje)

```
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Aplikacija teče na http://localhost:3000

- `/` – vstopna stran
- `/rezervacija` – javni rezervacijski obrazec (storitev → termin → izvajalec (če relevanten) → podatki; korak "poslovalnica" se doda pred "storitev", če je aktivnih lokacij več kot ena)
- `/admin` – admin del (koledar, storitve, zaposleni, stranke, lokacije) – **zaščiten s prijavo** (`/prijava`), glej razdelek "Prijava v admin" spodaj

Razvojno okolje uporablja SQLite (`dev.db`, samodejno ustvarjena datoteka). Za produkcijo glej `.env.example` za prehod na PostgreSQL.

### `npm run dev` proti `npm run build && npm start` - POMEMBNO za občuteno hitrost

`npm run dev` (razvojni način) prevaja vsako stran/API pot NA PRVI OBISK (on-demand) - izmerjeno 7.9.2026: prvi obisk `/rezervacija` po zagonu strežnika je vzel **~6 sekund**, prehodi med koraki obrazca prvič ~350-400ms. To NI počasna koda/poizvedbe (te so bile posebej optimizirane, glej spodaj) - to je NAMENOMA tako v `next dev`, da se ne prevaja vse vnaprej. Isti test v produkcijskem načinu (`npm run build && npm start`): prvi obisk ~780ms, prehodi med koraki ~120-140ms - BREZ hladnega začetka na noben endpoint, ker je vse prevedeno vnaprej ob `build`. **Za testiranje/predstavitev (kolegu, naročniku) vedno uporabi produkcijski način** - razvojni način je namenjen SAMO aktivnemu spreminjanju kode (hitro osveževanje sprememb), ne končni hitrosti.

## Prijava v admin

`/admin/*` je zaščiten s prijavo na `/prijava` - vsi neprijavljeni obiski se samodejno preusmerijo tja (`src/middleware.ts`). Privzeti TESTNI podatki (nastavljivi prek `.env`, glej `.env.example`):

- E-pošta: `admin@admin.si`
- Geslo: `123`

Obrazec za prijavo ju ima že samodejno izpolnjena, za hitro testiranje. Odjava: gumb z ikono uporabnika zgoraj desno v adminu.

**Dodajanje novih admin uporabnikov** (7.9.2026): na `/admin/nastavitve`, razdelek "Admin uporabniki" - vnesi e-pošto in geslo (vsaj 6 znakov), takoj lahko uporabljata za prijavo. Izbriši jih z gumbom "Izbriši" na seznamu.

**Kako deluje (za razumevanje, ne samo za rabo):** prijava preveri DVA vira, v tem vrstnem redu:
1. "Korenski" admin iz `ADMIN_EMAIL`/`ADMIN_PASSWORD` v `.env` (geslo v čistem besedilu - namerna MVP poenostavitev, glej opozorilo v `.env.example`) - deluje VEDNO, tudi na povsem sveži bazi, da se admin ne more sam "zakleniti ven".
2. Dodatni admini v tabeli `AdminUporabnik` (dodani na `/admin/nastavitve`) - gesla so PRAVILNO HASHIRANA (`bcryptjs`, 10 rund), za razliko od korenskega admina, ker gre za uporabnikovo lastno izbrano geslo.

Ob uspešni prijavi se (ne glede na to, kateri vir je bil uporabljen) nastavi podpisan (HMAC-SHA256, `ADMIN_SESSION_SECRET`), httpOnly piškotek (`src/lib/admin-seja.ts`) - middleware ga preveri BREZ dostopa do baze (Next.js middleware teče v Edge runtimu, kjer Prisma/SQLite ne delujeta niti `bcryptjs` primerjava gesel ne bi delovala zanesljivo - zato je preverjanje piškotka brezstanjsko/kriptografsko podpisano, samo prijava sama gre v Node.js runtime prek server akcije).

## Kaj je zgrajeno

- Prisma podatkovni model (Lokacija, Storitev, Zaposleni, Urnik, Stranka, Termin + relacije) po razdelku 4 specifikacije
- Javni rezervacijski tok, ki dejansko preverja proste termine glede na urnik zaposlenega in obstoječe termine (`src/lib/dostopnost.ts`)
- Admin CRUD za storitve, zaposlene, lokacije; kartica stranke z zgodovino terminov in zapiski; koledar po dnevih, barvno kodiran po statusu termina, s spremembo statusa
- **Potek potrjevanja termina**: spletna rezervacija (vir=SPLET) dobi status "V potrjevanju"; osebje jo v adminu potrdi ("Potrjen") ali zavrne ("Zavrnjen/odpovedan" - termin se s tem samodejno sprosti za novo naročanje, glej `dostopnost.ts`). Ročno ustvarjeni termini (vir=ADMIN) so takoj "Potrjen".
- TRONxERP adapter (`src/lib/tronxerp-adapter.ts` + `src/lib/tronxerp-client.ts`) – kliče **pravi TronOfficeAPI** (`doLogin`, `saveArticle`+`updateArticleExKeys`, `getCustomers` + `importOrder` s polnimi postavkami naročila), če je v `.env` nastavljen `TRONXERP_API_USERNAME`/`PASSWORD`/`BUSTORE_ID`/`BUNIT_ID`/`DEFAULT_TAX_RATE_ID` (glej `.env.example`); sicer samodejno pade nazaj na mock (samo logira). **Delovni nalog (`importOrder`) se pošlje šele ob POTRDITVI termina** (prehod v status "Potrjen") - naročnikova izrecna odločitev (2.9.2026): za ročno v adminu ustvarjene termine to pomeni takoj (že so "Potrjen"), za spletne rezervacije šele ko jih osebje potrdi v `/admin/koledar` (`spremeniStatusTermina` v `actions.ts` preveri prejšnji status, da se nalog ne pošlje dvakrat). Pred pošiljanjem adapter v TRONxERP poišče obstoječo stranko po telefonu/e-pošti/imenu (`getCustomers`); če je ne najde, uporabi privzeto stranko (`TRONXERP_API_DEFAULT_CUSTOMER_ID`, privzeto "0") in dejanske podatke stranke zapiše v opombo dokumenta. `saveArticle` se kliče ob ustvarjanju storitve (to ostaja nespremenjeno - artikel mora obstajati v TRONxERP še pred kakršnokoli rezervacijo). Napake pri sinhronizaciji ne prekinejo lokalnega delovanja (ujete in logirane).
- Vizualni slog usklajen s preostalim TRONxERP ekosistemom (barvna paleta, tipografija Roboto, postavitev stranske navigacije z ikonami) - glej `src/app/globals.css`, `src/components/AdminNav.tsx`, `src/components/icons.tsx`.
- **Dela prosti dnevi** (`src/lib/prazniki.ts`) - javni obrazec ne ponudi prostih terminov na državne praznike (izračunano za poljubno leto, ne statičen seznam), po državi lokacije (`Lokacija.drzava`, ISO 3166-1 alpha-2, privzeto "SI", podprto tudi "HR"). Vikend: nedelja je privzeto zaprta, sobota odprta - oboje nastavljivo po lokaciji (`Lokacija.odprtoSobota`/`odprtoNedelja`, preklopni gumbi na `/admin/lokacije`).
- **Dnevni/tedenski/mesečni pogled koledarja**, na javnem IN admin delu:
  - Javni del (`/rezervacija`, korak "Termin", `src/components/IzbiraTermina.tsx`) prikaže TUDI zasedene termine - zaseden slot je zasivljen in onemogočen, brez kakršnihkoli podatkov o stranki (samo ura). To velja za vse tri poglede.
  - Admin del (`/admin/koledar?pogled=dan|teden|mesec`) prikaže polne podatke (stranka, storitev, status) v vseh treh pogledih; klik na dan v tedenskem/mesečnem pogledu odpre dnevni pogled za ta dan.
  - **Odpovedani/zavrnjeni termini (status `ODPOVEDAN`) se v tedenskem in mesečnem pogledu NE štejejo/prikazujejo kot zasedenost** (`status: { not: "ODPOVEDAN" }` v `TedenskiPogled`/`MesecniPogled`, `admin/koledar/page.tsx`) - naročnikova zahteva (2.9.2026): "št. terminov" v mesečnem pogledu in kartice v tedenskem naj kažejo samo dejansko zasedenost. Dnevni pogled ostane nespremenjen - tam se odpovedan termin še vedno vidi (z značko "Zavrnjen/odpovedan"), ker prikazuje poln seznam, ne le štetje/zasedenost.
  - Podprto prek treh novih javnih API-jev: `/api/pregled-dneva`, `/api/pregled-tedna`, `/api/pregled-meseca` (glej `src/lib/dostopnost.ts`, funkcije `pregledDneva`/`pregledTedna`/`pregledMeseca`).
- **"Poljubna storitev"** - na koraku izbire storitve je privzeto vedno na voljo dodatna kartica "Druga želja / opis težave" (ni v šifrantu, ne da se izbrisati), ki preskoči korak "Izvajalec" in v koraku "Podatki" zahteva prosto-besedilni opis želje/težave (shranjen v `Termin.zapisek`). Sidrana na poseben `Storitev` zapis (`jePoljubna=true`, fiksen id), ustvarjen samodejno ob prvi rabi (`src/lib/poljubna-storitev.ts`) - namenoma skrit v vseh admin seznamih storitev (ni prava storitev za upravljanje).
- **Nastavljiva dejavnost** (`/admin/nastavitve`, `src/lib/dejavnosti.ts`) - aplikacija ni trdo kodirana za avtoservis. Podprte dejavnosti: Avtoservis (privzeto), Frizerski salon, Inštalacije in servis (klime ipd.), Dimnikarstvo, Spa in masaže, Drugo. Izbira dejavnosti spremeni ime aplikacije in slogan na vstopni strani (oboje tudi ročno nastavljivo), poleg tega ponudi enkraten uvoz predloge tipičnih storitev za izbrano dejavnost (gumb "Uvozi predlogo storitev") - obstoječih storitev ne podvaja. Jedro podatkovnega modela (Storitev/Zaposleni/Termin) je bilo že od začetka generično in ne zahteva sprememb kode za novo dejavnost - dodajanje popolnoma nove dejavnosti (izven ponujenega seznama) zahteva le nov vnos v `DEJAVNOSTI` v `src/lib/dejavnosti.ts`.
- **TRONxERP/Comtron znamčenje** (`src/components/TronXerpLogotip.tsx`) - besedilni logotip "TRONxERP · by Comtron" (enak vzorec kot na `Landing-TRONxERP/index.html`: `.brand`/`.brand-x`, tu kot `.tronxerp-logotip` v `globals.css`), prikazan v nogi vstopne strani (`/`), pod obrazcem za rezervacijo (`/rezervacija`, oba stanja - obrazec in "oddano") ter v nogi stranske navigacije v adminu (`src/app/admin/layout.tsx`). Samo vizualna oznaka porekla/povezave, ne vpliva na `Nastavitve.imeAplikacije` (ime aplikacije ostaja samostojno nastavljivo).
- **Registrska številka vozila + zgodovina servisov** (`Termin.registracija`, `/admin/zgodovina`) - vozilo je na `Terminu` (obisku), ne na `Stranki`, ker ima lahko ena stranka več vozil. Polje je neobvezno; na javnem obrazcu (`/rezervacija`, korak "Podatki") se prikaže samo, ko je `Nastavitve.dejavnost === "AVTOSERVIS"` (prek novega javnega `GET /api/nastavitve`, ki vrne samo dejavnost - nič osebnih/poslovnih podatkov); v adminu (`NovTerminObrazec.tsx`) je vedno na voljo, ne glede na dejavnost. Nova admin stran `/admin/zgodovina` omogoča iskanje po imenu/priimku/telefonu stranke ALI po registrski številki (`OR` poizvedba čez `Stranka`/`Termin.registracija`, `contains`, SQLite je za ASCII privzeto neobčutljiv na velike/male črke) - prikaže vse ujemajoče termine (datum SAMO dan, prek `lokalniDatumString`, ne ura) z opravljenimi storitvami in statusom. **Pomembna omejitev, dokumentirana namesto prikrita:** podatek "kaj je bilo dejansko delano" prikazuje samo naše lastne zapisane Storitve (`TerminStoritev`) - podrobnosti iz PRAVIH delovnih nalogov v TRONxERP (npr. dodani deli/postavke, ki jih je mehanik dodal naknadno na servisu) NISO vključene, ker `TronOfficeAPI-referenca.md` ne vsebuje potrjenega endpointa za BRANJE/poizvedovanje po že ustvarjenih dokumentih nazaj - samo `POST /integration/importOrder` za USTVARJANJE. Če TRONxERP tak endpoint ima (npr. `getDocuments`/`getOrders`, morda v delu swagger UI, ki še ni bil zajet), ga je treba najprej potrditi z naročnikom/COMTRON, preden se doda v `tronxerp-adapter.ts`.
- **Izbira poslovalnice + zemljevid** (`Lokacija.lat`/`lng`, `src/components/ZemljevidLokacij.tsx`) - naročnikova zahteva (2.9.2026): gumb "Pokaži v zemljevidih" pri izbiri poslovalnice, ki odpre okno z označenimi vsemi poslovalnicami, klik na oznako izbere lokacijo. Nov korak "Poslovalnica" na javnem obrazcu (`/rezervacija`) se prikaže SAMO, če je aktivnih lokacij več kot ena - pri eni sami ostane obnašanje nespremenjeno (samodejna izbira, brez dodatnega koraka). Zemljevid uporablja **Leaflet + OpenStreetMap (brezplačno, brez Google Maps API ključa in brez Google Cloud računa)** - naročnikova izrecna odločitev, ko je bila predstavljena alternativa (Google Maps JS API zahteva plačilno kartico). Koordinate (`Lokacija.lat`/`lng`, oba neobvezna Float) se vnašajo ROČNO na `/admin/lokacije` (kopirano iz Google Maps/OpenStreetMap z desnim klikom na lokacijo) - ni samodejnega geokodiranja iz naslova. Lokacija brez koordinat se na zemljevidu preprosto ne prikaže (ostane le v navadnem seznamu poslovalnic). Preizkušeno v živo prek Playwright z realnima lokacijama (Maribor/Ljubljana) - zemljevid pravilno prikaže OpenStreetMap ploščice, obe oznaki na pravem mestu, klik na oznako odpre pojavno okno z gumbom "Izberi to poslovalnico", ki pravilno izbere lokacijo in nadaljuje na korak "Storitev" (tudi klik iz navadnega seznama, brez zemljevida, deluje enako).
- **Zvonec z obvestili v adminu** (`src/components/ObvestilaZvonec.tsx`, glava `admin/layout.tsx`) - naročnikova zahteva (2.9.2026), po zgledu TRONxERP: ikona zvonca zgoraj desno, rdeča značka s TOČNIM številom nepotrjenih spletnih rezervacij (status `V_POTRJEVANJU`, prek `/api/admin/nepotrjeni`, `prisma.termin.count`), značka ima kratko animacijo "tresenja" levo-desno vsake 4 sekunde (`@keyframes zvonec-tresenje`, `globals.css`). Klik na zvonec odpre spustni meni z do 8 najbližjimi nepotrjenimi rezervacijami (datum, ura, stranka, storitev); klik na posamezno ODPRE dnevni pogled koledarja za ta termin (`/admin/koledar?pogled=dan&datum=...`), kjer ga osebje lahko takoj potrdi/zavrne. Podatki se osvežijo ob nalaganju strani in nato vsakih 30s (`setInterval`), da se novo prispele spletne rezervacije prikažejo brez ročnega osveževanja strani. Klik izven menija ga zapre.
- **Fizična delovna mesta (rampe/stoli) kot PRIMARNI pogoj zasedenosti, PER-STORITEV** (`DelovnoMesto`/`DelovnoMestoStoritev` v schema.prisma, `src/lib/dostopnost.ts`) - naročnikova zahteva (7.9.2026), konkretiziran primer: avtoservis ima 2 rampi - "Rampa 1" zna samo menjavo gum, "Rampa 2" zna menjavo gum IN redni servis. Brez rezervacij je torej na voljo 2 mesti za menjavo gum, a samo 1 za redni servis; če stranka rezervira redni servis, naslednja stranka ne more več izbrati rednega servisa (edina ustrezna rampa zasedena), medtem ko menjava gum ostane na voljo (druga rampa). To je bistveno natančnejši model od prejšnjega poskusa (en sam skupen `Lokacija.steviloDelovnihMest`, **odstranjen in nadomeščen** s tem - posamezno mesto ne obstaja več kot golo število, ampak kot pravi zapis s svojim naborom podprtih storitev):
  - `/admin/lokacije` - vsaka lokacija ima svojo sekcijo "Delovna mesta" (naziv prilagojen dejavnosti - `Dejavnost.oznakaMesta` v `dejavnosti.ts`): seznam obstoječih mest z urejanjem NAZIVA (uredljivo polje, ne le prikaz - dodano 7.9.2026 na naročnikovo zahtevo) IN podprtih storitev (checkboxi) v EN sam obrazec/gumb "Shrani" (`posodobiDelovnoMesto`, en `$transaction`) + obrazec za dodajanje novega mesta (naziv + izbira storitev, `ustvariDelovnoMesto`). **Lokacija BREZ ijednega definiranega mesta ostane BREZ omejitve** (obstoječe obnašanje, samo po zaposlenih) - admin mora eksplicitno dodati vsaj eno mesto, da omejitev sploh začne veljati za to lokacijo.
  - `dostopnost.ts`: `pregledDneva` (in s tem tedenski/mesečni pogled ter javni obrazec) izračuna `prostihMest` kot `min(prostih izvajalcev, prostih UPRAVIČENIH mest za TO storitev)` - če za storitev na tej lokaciji ni NOBENEGA upravičenega mesta (admin je pozabil dodati storitev na katerokoli rampo), je `prostihMest` vedno 0 (storitev tam ni izvedljiva - namerno, ne tiho prezrto).
  - Nova `najdiProstoDelovnoMesto()` PREPREČI ustvarjanje termina (ne le prikaz), če ni prostega upravičenega mesta - klicana v `ustvariTerminAdmin` in `/api/rezervacije` (HTTP 409), PRED preverjanjem izvajalca, in dejansko DODELI konkretno mesto (`Termin.mestoId`) - potrebno, da se zasedenost lahko preverja PO POSAMEZNEM mestu, ne le agregatno.
  - **Pomembna podrobnost pravilne dodelitve:** ko je za storitev upravičenih VEČ mest, se prednostno dodeli tisto z NAJMANJ podprtimi storitvami (najbolj "ekskluzivno") - v zgornjem primeru rezervacija za menjavo gum prednostno zasede "Rampo 1" (zna samo gume), NE "Rampe 2" (zna tudi servis) - s tem redni servis ostane dosegljiv dlje. Brez te prednosti bi lahko naključni vrstni red po nepotrebnem zaklenil bolj vsestransko mesto in po nepotrebnem blokiral storitev, ki bi sicer imela drugo, ozko namensko mesto na voljo.
  - "Poljubna storitev" (glej spodaj) ni vezana na specifično mesto - upravičeno je vsako aktivno mesto na lokaciji (ista poenostavitev kot pri izvajalcih).
  - `/api/prosti-izvajalci` vrača `{izvajalci, prostoMesto}` - admin "Nov termin" (`NovTerminObrazec.tsx`) proaktivno onemogoči gumb "Dodaj termin", če ni prostega mesta.
  - Preizkušeno v živo na točno naročnikovem primeru (Rampa 1 = menjava gum, Rampa 2 = menjava gum + redni servis): začetno stanje pravilno pokazalo 2 prosti mesti za gume, 1 za servis; po rezervaciji rednega servisa je servis pravilno padel na 0 (Rampa 2 zasedena), menjava gum pa ostala na 1 (Rampa 1 prosta); v obratnem vrstnem redu (najprej gume) je sistem pravilno dodelil Rampo 1 (ne Rampe 2), s čimer je redni servis ostal dosegljiv za naslednjo stranko - točno po naročnikovem opisu.
- **Prijava v `/admin`** (`src/middleware.ts`, `src/lib/admin-seja.ts`, `src/lib/admin-auth-actions.ts`, `/prijava`) - glej razdelek "Prijava v admin" zgoraj za podrobnosti in testne podatke. "Admin vstop" na vstopni strani je zdaj pravi viden gumb (`.btn-secondary`), prej komaj vidna majhna podčrtana povezava - naročnikova zahteva (7.9.2026), da se ne da zgrešiti.
- **Preverjanje veljavnosti e-pošte in telefona na javnem obrazcu** (`src/lib/validacija.ts`, `src/lib/drzave.ts`) - naročnikova natančna specifikacija (7.9.2026): e-pošta mora imeti vsaj 2 znaka pred `@`, vsaj 2 med `@` in (zadnjo) piko, vsaj 2 za piko (`jeVeljavenEmail`, regex `/^[^\s@]{2,}@[^\s@]{2,}\.[^\s@]{2,}$/` - e-pošta ostaja NEOBVEZNA, a če je vnesena, mora biti veljavna). Telefon: nova izbira klicne kode države (`IzbiraDrzave.tsx`, zastava + koda + iskalni spustni seznam ~150 držav, po zgledu priloženega zaslonskega posnetka) - **privzeta država sledi `Lokacija.drzava`** (SI ali HR, katerakoli je nastavljena na aktivni lokaciji), ne trdo kodirano. Validacija dolžine številke je natančna za SI (8 števk) in HR (8-9), splošna [6,12] za vse ostale države (polna po-državna validacija bi zahtevala pravo knjižnico kot libphonenumber - izven obsega MVP). **Zastavice prikazuje paket `flag-icons` (SVG, uvožen v `globals.css`)** - PRVI poskus je uporabljal Unicode "regional indicator" znake (izračunane, brez potrebe po shranjevanju), a naročnikovo dejansko testiranje na Windows je pokazalo, da se v Windows brskalnikih (Segoe UI Emoji privzeto NE vsebuje zastavic) namesto zastavice izriše samo dvočrkovna koda države - popravljeno na `flag-icons` (razred `fi fi-<iso2>`), ki dela na vseh platformah enako. Strežniška stran (`/api/rezervacije`) preveri obe polji neodvisno od klienta (defense-in-depth vzorec, dosledno uporabljen v tem projektu) - e-pošta z istim regexom, telefon s splošnim vzorcem `/^\+\d{7,15}$/` (natančna po-državna dolžina se preveri samo na klientu, kjer je znano, katera država je bila izbrana).
- **Dodatni admin uporabniki** (`AdminUporabnik` model, `/admin/nastavitve`) - glej razdelek "Prijava v admin" zgoraj.
- **Hitrostna optimizacija odpiranja prostih terminov** (`src/lib/dostopnost.ts`, 7.9.2026) - naročnik je poročal, da je oddaja rezervacije in odpiranje prostih terminov (posebej tedenski/mesečni pogled) opazno počasno. Vzrok: `pregledDneva()` je za VSAKEGA zaposlenega posebej poizvedovala urnik + termine (N+1 vzorec, zaporedno, brez `Promise.all`), `pregledTedna`/`pregledMeseca` pa sta klicala `pregledDneva` 7x/do 31x ZAPOREDOMA namesto vzporedno - pri tedenskem/mesečnem pogledu se je to množilo. Popravljeno:
  - `pregledDneva`: vse poizvedbe za urnike/termine VSEH zaposlenih/mest naenkrat (`{in: [...]}`), obdelava v pomnilniku - namesto 2×N zaporednih poizvedb zdaj konstantno število (~4) NE GLEDE na število zaposlenih/mest.
  - `pregledTedna`/`pregledMeseca`: `Promise.all()` namesto zaporedne `for` zanke - vsi dnevi se preverjajo vzporedno.
  - Nova skupna `zasedeniIzMnozice()` - isti paketni vzorec uporabljen tudi v `najdiProstegaZaposlenega`, `najdiProstoDelovnoMesto`, `prostiIzvajalciZaTermin` (prej po ena poizvedba na kandidata, zdaj ena skupna).
  - `/api/rezervacije`: neodvisne poizvedbe (storitev, obstoječa stranka, prosto delovno mesto) zdaj tečejo vzporedno (`Promise.all`) namesto zaporedno.
  - **Diagnostična ugotovitev, vredna zapisa:** primerjava z `next start` (produkcijski način) proti `next dev` na isti kodi je pokazala, da je precejšen del absolutne latence v tem razvojnem okolju posledica `next dev` samega (tudi trivialen endpoint z eno poizvedbo, `/api/lokacije`, je vzel ~100-300ms) - po optimizaciji je razlika med enim dnem in celim tednom/mesecem skoraj izginila (prej 2-5x počasneje). Za najboljšo občuteno hitrost (npr. pri kazanju kolegu) je `npm run build && npm start` (produkcijski način) opazno hitrejši in bolj stabilen od `npm run dev` - normalno in pričakovano, dev način ni optimiziran za hitrost.
  - Preizkušeno v živo - vsi obstoječi scenariji zasedenosti (rampe/stoli, izvajalci, zavrnitev pri polni kapaciteti) dajejo IDENTIČNE rezultate kot pred optimizacijo, samo hitreje.

## Nastavitve / spremenljivke

Popoln seznam vsega, kar je mogoče nastaviti, in KJE se nastavi.

### V admin vmesniku (brez spreminjanja kode) - `/admin/nastavitve` in `/admin/lokacije`

| Nastavitev | Polje | Privzeto | Kje |
|---|---|---|---|
| **Ime aplikacije** (prikazano v glavi vseh strani) | `Nastavitve.imeAplikacije` | `Naročanje na termin` | `/admin/nastavitve` |
| **Dejavnost** (avtoservis/frizerstvo/inštalacije/dimnikarstvo/spa/drugo - glej spodaj) | `Nastavitve.dejavnost` | `AVTOSERVIS` | spustni seznam na `/admin/nastavitve` |
| **Slogan** na vstopni strani | `Nastavitve.slogan` | privzet glede na dejavnost | `/admin/nastavitve` (prazno = uporabi privzetega za izbrano dejavnost) |
| Predloga storitev za izbrano dejavnost | - | - | gumb "Uvozi predlogo storitev" na `/admin/nastavitve` |
| **Korak minut pri ročni izbiri ure termina** (admin "Nov termin") | `Nastavitve.korakMinutTermina` | `5` (min 1, max 30) | številsko polje na `/admin/nastavitve`. Ne vpliva na javni obrazec (tam so termini vedno vezani na 30-minutne sklope). |

Nastavitve lokacije - vsaka lokacija ima svoje neodvisne nastavitve (podjetje z več lokacijami, npr. ena v Sloveniji, ena na Hrvaškem, jih lahko nastavi različno):

| Nastavitev | Polje | Privzeto | Kje |
|---|---|---|---|
| Naziv, naslov, delovni čas | `naziv`, `naslov`, `delovniCas` | - | obrazec "Nova lokacija" |
| **Država** (določa dela proste dneve, glej spodaj) | `drzava` | `SI` (Slovenija) | spustni seznam v obrazcu ("Slovenija"/"Hrvaška") |
| **Odprto ob sobotah** | `odprtoSobota` | vklopljeno | kljukica v obrazcu; za obstoječo lokacijo klik na značko "Sobota: odprto/zaprto" v seznamu |
| **Odprto ob nedeljah** | `odprtoNedelja` | izklopljeno | kljukica v obrazcu; za obstoječo lokacijo klik na značko "Nedelja: odprto/zaprto" v seznamu |
| **Koordinate** (za oznako na zemljevidu izbire poslovalnice, glej "Kaj je zgrajeno") | `lat`, `lng` | prazno (brez koordinat ni na zemljevidu) | polji v obrazcu "Nova lokacija"; za obstoječo lokacijo polji + gumb "Shrani koordinate" v seznamu - ROČEN vnos, ni samodejnega geokodiranja |
| **Delovna mesta** (rampe/stoli - PRIMARNI pogoj zasedenosti PER-STORITEV, glej "Kaj je zgrajeno") | `DelovnoMesto` + `DelovnoMestoStoritev` | brez definiranih mest (ni omejitve, samo po zaposlenih) | sekcija "Delovna mesta" pri vsaki lokaciji na `/admin/lokacije` - dodajanje mesta (naziv + katere storitve zna) in urejanje obstoječih |

Ostale admin nastavitve brez posebne .env/kode: storitve (cena, trajanje, vidnost na spletu, ERP šifra artikla), zaposleni (katere storitve izvaja, na kateri lokaciji dela), **urniki** (`/admin/urniki` - delovni čas/čas za rezervacije po dnevu, po zaposlenem in lokaciji; zaposleni je za rezervacije na voljo SAMO na dneve, za katere ima tu vnesen urnik - manjkajoč dan, npr. sobota, pomeni brez terminov tisti dan, tudi če je `Lokacija.odprtoSobota=true`).

**Pošteno opozorilo - polja v podatkovnem modelu BREZ dejanskega učinka (obstajajo v shemi, a jih ne moreš spremeniti prek UI IN trenutno nikjer ne vplivajo na delovanje aplikacije):**
- `Lokacija.casPas` (časovni pas, privzeto `Europe/Ljubljana`) - shranjen, a nikjer v kodi prebran; vsi datumi/ure se obravnavajo kot lokalni čas strežnika.
- `Lokacija.valuta` (privzeto `EUR`) - shranjen, a znak `€` je trdo kodiran na treh mestih (`rezervacija/page.tsx`, `admin/storitve/page.tsx`), ne bere se iz tega polja.
- `Zaposleni.jezik` in `Stranka.jezik` (privzeto `sl`) - shranjena, a aplikacija nima večjezičnosti; vedno prikazuje slovensko besedilo.

Če boš to aplikacijo uporabljal v drugi valuti/jeziku, je to prva stvar, ki jo je treba dejansko povezati s kodo, ne samo s podatkovnim modelom.

### V `.env` datoteki (zahteva ponoven zagon strežnika po spremembi)

Vse spodnje so neobvezne - če manjkajo, ustrezna funkcionalnost preprosto ne deluje (TRONxERP adapter pade nazaj na mock, ki samo logira). Poln primer v `.env.example`.

| Spremenljivka | Privzeto | Pomen |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` (SQLite) | povezava na bazo - za produkcijo zamenjaj za PostgreSQL |
| `TRONXERP_API_BASE_URL` | `https://xerp.comtron.si/tronofficeapi` | naslov TronOfficeAPI |
| `TRONXERP_API_USERNAME` / `PASSWORD` | - | prijavni podatki za TronOfficeAPI (`doLogin`) - če manjkata, se uporabi mock adapter |
| `TRONXERP_API_BUSTORE_ID` | - | ID prodajalne/skladišča v TRONxERP (query parameter pri `importOrder`) |
| `TRONXERP_API_BUNIT_ID` | - | ID poslovne enote v TRONxERP (telo `importOrder`) |
| `TRONXERP_API_DOC_TYPE_ID` | `EPN` | tip dokumenta za delovni nalog (potrjeno s strani naročnika) |
| `TRONXERP_API_DEFAULT_TAX_RATE_ID` | - | davčna stopnja, uporabljena za VSE storitve (namerna odločitev - eno samo, ne po storitvi) |
| `TRONXERP_API_DEFAULT_CUSTOMER_ID` | `0` | privzeta TRONxERP stranka, uporabljena kadar iskanje po telefonu/e-pošti/imenu ne najde ujemanja |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@admin.si` / `123` (testno) | prijavni podatki za `/admin` (glej razdelek "Prijava v admin") - TA DVA NISTA neobvezna, brez njiju se v admin ni mogoče prijaviti |
| `ADMIN_SESSION_SECRET` | razvojni privzeti niz (NI varen za produkcijo) | skrivnost za podpisovanje prijavnega piškotka - v produkciji nastavi na dolg naključen niz |

### V izvorni kodi (zahteva urejanje/dodajanje kode)

| Kaj | Kje | Opomba |
|---|---|---|
| **Seznam podprtih držav za dela proste dneve** | `src/lib/prazniki.ts`, `PRAZNIKI_PO_DRZAVI` | trenutno `SI` (Slovenija) in `HR` (Hrvaška). Dodajanje nove države = dodaj nov ključ s seznamom praznikov (fiksni datum ali odmik od velike noči) - po dodajanju je nova država takoj na voljo tudi v spustnem seznamu na `/admin/lokacije`, če jo dodaš tudi tam. |
| `articleType` vrednost za storitve v TRONxERP | `src/lib/tronxerp-adapter.ts`, `ARTICLE_TYPE_STORITEV` | trenutno `1` (Storitve), potrjeno s strani naročnika |
| **Seznam podprtih dejavnosti** | `src/lib/dejavnosti.ts`, `DEJAVNOSTI` | dodajanje popolnoma nove dejavnosti (izven ponujenega seznama Avtoservis/Frizerstvo/Inštalacije/Dimnikarstvo/Spa/Drugo) = dodaj nov vnos (id, naziv, slogan, kategorija, predloge storitev) - takoj na voljo v spustnem seznamu na `/admin/nastavitve`. |
| **Korak med ponujenimi termini** (npr. 08:00, 08:30, 09:00 ...) | `src/lib/dostopnost.ts`, `KORAK_MIN` | trenutno `30` (minut), enotno za vse storitve/dejavnosti - ni nastavljivo po storitvi. |
| **Privzeto trajanje "poljubne storitve"** (glej razdelek zgoraj) | `src/lib/poljubna-konstante.ts`, `POLJUBNA_TRAJANJE_MIN` | trenutno `30` (minut) |

## Obnašanje pri več izvajalcih (pomembno za razumevanje testiranja)

Če je za storitev upravičenih VEČ izvajalcev (npr. oba zaposlena v demo podatkih znata "Menjava pnevmatik"), velja: termin je na javnem obrazcu prikazan kot **zaseden šele, ko so zasedeni VSI upravičeni izvajalci** za ta termin - dokler je vsaj eden prost, se ura ponudi naprej (samodejno dodeljena temu prostemu izvajalcu). To je namerno in **potrjeno s strani naročnika (2.9.2026) kot želeno obnašanje** - podpira dejansko večresorno razporejanje (dva frizerja, dva mehanika ...).

Da je to od zdaj naprej pregledno (naročnikova zahteva, 2.9.2026):
- **Javni obrazec** - vsak ponujen termin (`src/components/IzbiraTermina.tsx`) ima ob prehodu z miško (`title` atribut, prikazan kot brskalnikov oblaček) število še prostih mest, s pravilno slovensko gramatiko (`src/lib/besedila.ts`, `besedilaProstaMesta`): `1` → "Le še eno prosto mesto!" (ednina), `2` → "Še 2 prosti mesti" (dvojina), `3`/`4` → "Še N prosta mesta" (množina), `5+` → "Še N prostih mest" (rodilnik množine).
- **Admin koledar** (dan IN teden) - na vsaki terminski kartici je pod podatki o stranki izpisan seznam VSEH izvajalcev, ki delajo na tej lokaciji, pri čemer je tisti, ki je za ta termin zaseden (`Termin.zaposleniId`, tudi če je bil dodeljen samodejno - glej razdelek o popravljenem hrošču spodaj), prikazan **prečrtano**.
- **Zaprti/prazniki dnevi na javnem obrazcu** (tedenski in mesečni pogled) - "Zaprto" celica ima ob prehodu z miško oblaček z natančnim razlogom (ime praznika iz `src/lib/prazniki.ts`, npr. "Prešernov dan, slovenski kulturni praznik", ali "Sobota"/"Nedelja" za vikend) - isti `razlogZaprtja` podatek, ki ga že vrača `/api/pregled-tedna`/`/api/pregled-meseca`. Imena praznikov so povzeta po viru iz razdelka "Dela prosti dnevi" zgoraj (uporabi.net/prazniki), z uradnim polnim zapisom.

### Izbira izvajalca je PO izbiri termina, ne prej (naročnikova zahteva, 2.9.2026)
Prej je javni obrazec vprašal "kdo naj izvede storitev" PRED izbiro termina, kar je pomenilo, da je bilo mogoče (navidezno) izbrati izvajalca, ki je za marsikateri termin že zaseden. Prenovljeno:
- **Javni obrazec**: nov vrstni red korakov - Storitev → **Termin** → **Izvajalec** (samo če je za izbrani termin dejansko prostih VEČ izvajalcev - sicer se ta korak samodejno preskoči) → Podatki. Korak "Izvajalec" ponudi SAMO tiste, ki so za ta točen termin resnično prosti (nov endpoint `/api/prosti-izvajalci`, glej `src/lib/dostopnost.ts`, `prostiIzvajalciZaTermin`).
- **Admin "Nov termin"** (`src/components/NovTerminObrazec.tsx`, zdaj client komponenta): spustni seznam "Izvajalec" se samodejno osveži glede na izbrano storitev/lokacijo/datum-uro in ponuja SAMO dejansko proste izvajalce (isti `/api/prosti-izvajalci` endpoint).

## Kaj je namenoma poenostavljeno / manjka (glej Specifikacija-in-arhitektura.md, Faza 2/3)

- **Prijava v `/admin` je ENOSTAVNA, EN sam uporabnik iz `.env`** (glej "Prijava v admin" zgoraj) - geslo v čistem besedilu, ne hashirano, ni baze uporabnikov/vlog. Pred produkcijo nujno zamenjati s pravim uporabniškim sistemom (hashirana gesla, več uporabnikov/vlog - "Vloge in pravice" je Faza 2/3 v specifikaciji).
- Koledar je seznam po dnevih, ne vizualna tedenska mreža po zaposlenih (Lime Booking stil) – funkcionalno enakovredno za MVP, vizualno enostavnejše.
- Ni plačil, SMS obvestil, e-poštnih opomnikov, poročil/analitike, ponavljajočih terminov, dodatkov k storitvam, vlog/pravic (vsi imajo enak dostop) – vse Faza 2/3 po specifikaciji.
- TRONxERP integracija dela za sinhronizacijo strank, storitev (kot artiklov tipa "Storitve") in uvoz naročila s postavkami. Manjka le mapiranje Lokacij na `BUStoreID`/`BUnitID` po posamezni lokaciji (trenutno ena skupna vrednost v `.env`). Ena skupna davčna stopnja za vse storitve (`TRONXERP_API_DEFAULT_TAX_RATE_ID`) je namerna odločitev, ne poenostavitev, ki čaka na dodelavo.
- Ni testov.
- Javni API-ji (`/api/storitve`, `/api/storitve/[id]/izvajalci`, `/api/lokacije`, `/api/prosti-termini`) namenoma vračajo samo polja, potrebna za rezervacijski obrazec (npr. `izvajalci` vrača samo ime/priimek, ne e-pošte/telefona zaposlenega) - pazi na to pri dodajanju novih polj v ta modela, da se osebni podatki ne razkrijejo javno.

### Znana težava razvojnega okolja (Windows)
- `next dev` je v tej seji enkrat nezanesljivo razrešil lastne (ne-privzete) Tailwind barve znotraj `@apply` v `globals.css` (deloval je `next build`, `next dev` je vrgel 500 "class does not exist"), zato so TRONxERP barve v `globals.css` zapisane kot navadne CSS spremenljivke, ne prek `@apply`. Če se podobna napaka pojavi spet, se ji izogni na enak način.
- `TaskStop`/Ctrl+C na `npm run dev` na tem Windows okolju ne ubije zanesljivo pripadajočega `node.exe` procesa - lahko ostane osamljen proces, ki še vedno posluša na vratih (Next nato samodejno preklopi na naslednja prosta vrata, npr. 3001/3002/3003). Če se zdi, da spremembe "ne učinkujejo", preveri `netstat -ano | grep LISTENING` za več procesov na več vratih in po potrebi ročno `taskkill //F //PID <pid>`.

### Popravljen hrošč: čas za rezervacije je lahko presegel delovni čas (npr. delo 8-12, rezervacije do 15.30)
`delovniCas*` in `casRezervacij*` na `Urnik` sta bila DVA neodvisna vnosna polja z ločenimi, TRDO KODIRANIMI privzetimi vrednostmi (delo 08:00-16:00, rezervacije 08:00-15:30) - če je admin spremenil samo delovni čas (npr. skrajšal na 08:00-12:00 za novega zaposlenega s krajšim urnikom), je "čas za rezervacije" ostal pri stari privzeti vrednosti (15:30), ki je zdaj presegala nov, krajši delovni čas - sistem je zato termine ponujal do 15:30, čeprav zaposleni dela samo do 12:00 (najdeno pri Jožetu Novaku).

Popravljeno v `src/components/UrnikObrazec.tsx` (obrazec spremenjen v client komponento):
- Ob spremembi delovnega časa se "čas za rezervacije" SAMODEJNO uskladi (do-ura z običajnim 30-min zamikom pred koncem) - admin ga lahko po tem še vedno ročno zoži.
- Gumb "Dodaj urnik" je `disabled`, dokler ni `casRezervacijOd >= delovniCasOd && casRezervacijDo <= delovniCasDo && casRezervacijOd < casRezervacijDo`.
- `ustvariUrnik` (actions.ts) isto pravilo preveri tudi na strežniku (vrže napako) - varovalka, če bi kdo obšel klientsko validacijo.
- Obstoječi neveljaven zapis (Jože Novak, ponedeljek) ročno popravljen na 08:00-11:30 (delo do 12:00, 30-min zamik - konsistentno z ostalimi urniki v bazi).

### Popravljen hrošč: termin brez izvajalca je bil neviden za preverjanje zasedenosti (dvostopenjski popravek)
Ko je bil termin ustvarjen brez konkretnega `zaposleniId` (admin izbere "-- samodejno --", ali neposreden API klic brez izbire izvajalca), ga preverjanje zasedenosti ni zaznalo NIKOMUR, ker `pregledDneva` išče prekrivanje po `zaposleniId` posameznega izvajalca - termin brez njega ni bil primerjan z ničimer. Posledica: tak termin se je na javnem obrazcu spet prikazal kot prost.

- **1. popravek**: `najdiProstegaZaposlenega()` v `src/lib/dostopnost.ts`, klicano iz `ustvariTerminAdmin` (actions.ts) in `/api/rezervacije`, samodejno dodeli prvega prostega upravičenega izvajalca ob manjkajočem `zaposleniId`.
- **2. popravek (najdeno pri naročnikovem testiranju 2.9.2026)**: če NIHČE ni prost, se je termin prej vseeno tiho ustvaril z `zaposleniId=null` (isti neviden-za-zasedenost hrošč, samo v drugi obliki) - admin je tako lahko na isti termin dodal poljubno število rezervacij kljub vidnemu opozorilu "trenutno ni prostega izvajalca". Zdaj: `ustvariTerminAdmin` v tem primeru vrže napako (termina ne ustvari), `/api/rezervacije` vrne HTTP 409, `NovTerminObrazec.tsx` pa onemogoči gumb "Dodaj termin", dokler `/api/prosti-izvajalci` ne vrne vsaj enega prostega izvajalca. **Nauk: opozorilno besedilo v UI ni dovolj - vedno je treba tudi dejansko onemogočiti/zavrniti oddajo, sicer uporabnik opozorilo prezre.**

### Popravljen hrošč: nov zaposleni/nova lokacija se ni pojavila v spustnem seznamu na /admin/urniki
`/admin/urniki` prikazuje in ureja urnike, a spustna seznama v obrazcu ("Zaposleni", "Lokacija") vlečeta podatke iz DRUGIH entitet (`Zaposleni`, `Lokacija`), ki jih ustvarjata svoji lastni akciji (`ustvariZaposlenega`, `ustvariLokacijo`) - ti pa (pravilno) osvežujeta samo SVOJO stran (`revalidatePath("/admin/zaposleni")`/`("/admin/lokacije")`), ne `/admin/urniki`. Ker Next.js to stran (brez `searchParams`/`cookies()` branja) privzeto statično predpomni ob `next build`, je novo dodan zaposleni (npr. "Jože Novak") ostal neviden v spustnem seznamu, dokler se aplikacija ni ponovno zgradila - v praksi videti kot "ne morem mu dodati urnika".

Popravljeno z `export const dynamic = "force-dynamic";` na vrhu `src/app/admin/urniki/page.tsx` - stran zdaj vedno bere sveže podatke, namesto da bi se zanašala na to, da vsaka akcija, ki ustvari zaposlenega/lokacijo, pozna in osveži TO stran. **Nauk za nadaljnji razvoj: katerakoli admin stran, ki prikazuje/ureja podatke IZ VEČ kot ene lastne entitete (tu: urniki potrebuje sveže zaposlene IN lokacije), je tvegana za to vrsto tihega zastarelega predpomnjenja - bodisi dosledno dodaj `revalidatePath` za to stran v VSE akcije, ki vplivajo nanjo, bodisi (enostavneje in bolj zanesljivo) označi stran kot `force-dynamic`.**

### Popravljen hrošč: dodajanje urnika za isti dan je USTVARILO podvojen zapis namesto da bi ga prepisalo
"Dodaj urnik" na `/admin/urniki` je vedno klical `prisma.urnik.create()` - če je zaposleni na isti lokaciji za isti dan že imel urnik, je nov vnos samo DODAL drugega poleg obstoječega (naročnik je to opazil pri Marku Novaku: dva urnika za ponedeljek z različnimi urami), namesto da bi obstoječega prepisal z novimi urami. Popravljeno:
- V shemi dodan `@@unique([zaposleniId, lokacijaId, dan])` na `Urnik` (baza zdaj sama prepreči podvojitev za isto kombinacijo).
- `ustvariUrnik` (actions.ts) spremenjen iz `create` v `upsert` na tem istem ključu - za obstoječo kombinacijo zaposleni+lokacija+dan urnik PREPIŠE ure, za novo kombinacijo (drug dan, DRUGA lokacija istega zaposlenega - npr. dopoldne v eni poslovalnici, popoldne v drugi) ustvari nov zapis, kot doslej.
- Obstoječi podvojen zapis (Marko Novak, ponedeljek) je bil ročno počiščen (obdržane najnovejše, dejansko nazadnje vnesene ure) pred uveljavitvijo omejitve.

### Past pri pretvorbi Date -> "YYYY-MM-DD" (pomembno za nadaljnji razvoj)
NIKOLI ne uporabljaj `datum.toISOString().slice(0, 10)` za prikaz/grupiranje po LOKALNEM koledarskem dnevu - `toISOString()` pretvarja v UTC, kar pri časovnih pasovih pred UTC (npr. Europe/Ljubljana, poleti UTC+2) povzroči, da lokalna polnoč "pade" na prejšnji dan (npr. 1.9. ob 00:00 CEST postane "2026-08-31"). To je povzročilo pravi, konkretno najden bug v mesečnem/tedenskem pogledu (prvi dan meseca se je prikazal kot zadnji dan prejšnjega). Uporabi `lokalniDatumString()` iz `src/lib/datum.ts` povsod, kjer pretvarjaš Date v datumski niz.

## Struktura

```
src/
  app/            Next.js strani (App Router) - javni del + /admin
  app/api/        API route handlerji (storitve, prosti termini, rezervacije)
  components/     Manjši client komponenti (izbira datuma, sprememba statusa)
  lib/            prisma klient, poslovna logika (dostopnost.ts), server actions (actions.ts), TRONxERP adapter
prisma/
  schema.prisma   podatkovni model
  seed.ts         testni podatki (1 lokacija, 3 storitve, 2 zaposlena, 2 stranki)
```
