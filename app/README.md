# Naročanje na servis – ogrodje aplikacije

MVP ogrodje rezervacijske aplikacije, zgrajeno po `../Specifikacija-in-arhitektura.md`.

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
- `/admin` – admin del (koledar, storitve, zaposleni, stranke, lokacije) – **brez prave prijave**, glej spodaj

Razvojno okolje uporablja SQLite (`dev.db`, samodejno ustvarjena datoteka). Za produkcijo glej `.env.example` za prehod na PostgreSQL.

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

- **Ni prave avtentikacije** za `/admin` – kdorkoli pozna URL, ima dostop. Pred produkcijo nujno dodati prijavo (npr. NextAuth) in zaščititi vse `/admin` poti.
- Koledar je seznam po dnevih, ne vizualna tedenska mreža po zaposlenih (Lime Booking stil) – funkcionalno enakovredno za MVP, vizualno enostavnejše.
- Ni plačil, SMS obvestil, e-poštnih opomnikov, poročil/analitike, ponavljajočih terminov, dodatkov k storitvam, vlog/pravic (vsi imajo enak dostop) – vse Faza 2/3 po specifikaciji.
- TRONxERP integracija dela za sinhronizacijo strank, storitev (kot artiklov tipa "Storitve") in uvoz naročila s postavkami. Manjka le mapiranje Lokacij na `BUStoreID`/`BUnitID` po posamezni lokaciji (trenutno ena skupna vrednost v `.env`). Ena skupna davčna stopnja za vse storitve (`TRONXERP_API_DEFAULT_TAX_RATE_ID`) je namerna odločitev, ne poenostavitev, ki čaka na dodelavo.
- Ni testov.
- Javni API-ji (`/api/storitve`, `/api/storitve/[id]/izvajalci`, `/api/lokacije`, `/api/prosti-termini`) namenoma vračajo samo polja, potrebna za rezervacijski obrazec (npr. `izvajalci` vrača samo ime/priimek, ne e-pošte/telefona zaposlenega) - pazi na to pri dodajanju novih polj v ta modela, da se osebni podatki ne razkrijejo javno.

### Znana težava razvojnega okolja (Windows)
- `next dev` je v tej seji enkrat nezanesljivo razrešil lastne (ne-privzete) Tailwind barve znotraj `@apply` v `globals.css` (deloval je `next build`, `next dev` je vrgel 500 "class does not exist"), zato so TRONxERP barve v `globals.css` zapisane kot navadne CSS spremenljivke, ne prek `@apply`. Če se podobna napaka pojavi spet, se ji izogni na enak način.
- `TaskStop`/Ctrl+C na `npm run dev` na tem Windows okolju ne ubije zanesljivo pripadajočega `node.exe` procesa - lahko ostane osamljen proces, ki še vedno posluša na vratih (Next nato samodejno preklopi na naslednja prosta vrata, npr. 3001/3002/3003). Če se zdi, da spremembe "ne učinkujejo", preveri `netstat -ano | grep LISTENING` za več procesov na več vratih in po potrebi ročno `taskkill //F //PID <pid>`.

### Popravljen hrošč: termin brez izvajalca je bil neviden za preverjanje zasedenosti (dvostopenjski popravek)
Ko je bil termin ustvarjen brez konkretnega `zaposleniId` (admin izbere "-- samodejno --", ali neposreden API klic brez izbire izvajalca), ga preverjanje zasedenosti ni zaznalo NIKOMUR, ker `pregledDneva` išče prekrivanje po `zaposleniId` posameznega izvajalca - termin brez njega ni bil primerjan z ničimer. Posledica: tak termin se je na javnem obrazcu spet prikazal kot prost.

- **1. popravek**: `najdiProstegaZaposlenega()` v `src/lib/dostopnost.ts`, klicano iz `ustvariTerminAdmin` (actions.ts) in `/api/rezervacije`, samodejno dodeli prvega prostega upravičenega izvajalca ob manjkajočem `zaposleniId`.
- **2. popravek (najdeno pri naročnikovem testiranju 2.9.2026)**: če NIHČE ni prost, se je termin prej vseeno tiho ustvaril z `zaposleniId=null` (isti neviden-za-zasedenost hrošč, samo v drugi obliki) - admin je tako lahko na isti termin dodal poljubno število rezervacij kljub vidnemu opozorilu "trenutno ni prostega izvajalca". Zdaj: `ustvariTerminAdmin` v tem primeru vrže napako (termina ne ustvari), `/api/rezervacije` vrne HTTP 409, `NovTerminObrazec.tsx` pa onemogoči gumb "Dodaj termin", dokler `/api/prosti-izvajalci` ne vrne vsaj enega prostega izvajalca. **Nauk: opozorilno besedilo v UI ni dovolj - vedno je treba tudi dejansko onemogočiti/zavrniti oddajo, sicer uporabnik opozorilo prezre.**

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
