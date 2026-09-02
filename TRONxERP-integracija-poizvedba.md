# TRONxERP – poizvedba o možnostih integracije (za novo booking aplikacijo)

Raziskovalno delo (samo branje lokalne dokumentacije, brez žive prijave v
TRONxERP). Pregledani viri:

1. `KONTEKST-TRONxERP.md` (trajni spomin o sistemu, stanje 19.8.2026)
2. `Navodila/index.html` in vseh **143 datotek** v `Navodila/` (123 podmenijev
   + 16 »Pregled modula« + 1 »Osnovni pogled« + delovni manifesti)
3. `TRONxERP_navodila.pdf` – celoten uradni priročnik proizvajalca COMTRON
   (183 strani), izvožen v besedilo in preiskan po ključnih besedah ter po
   celotnem kazalu (poglavja 1–15.3)

Cilj: ugotoviti, ali TRONxERP že ponuja dokumentiran API/webhook/uvoz-izvoz
mehanizem za povezavo z zunanjo aplikacijo, ali obstaja že pripravljen
rezervacijski/naročniški koncept, in kaj je treba preveriti v živo.

---

## Povzetek za nestrpne

- **Noben pregledan vir (ne priročnik, ne 143 navodil) ne opisuje javnega,
  dokumentiranega REST/SOAP API-ja, webhookov ali razvijalskega portala.**
  Sistem ima interne backend endpoint-e (Angular SPA jih kliče, npr.
  `saveUserVacation`, `support/reportSupportTicket`), a ti niso namenjeni ali
  dokumentirani za zunanjo rabo.
- **Obstaja pa konceptualni temelj za povezavo z zunanjo spletno trgovino** –
  uradni priročnik (pogl. 11.4) in en podmeni (Veleprodaja → Pregled naročil)
  eksplicitno omenjata »povezano spletno trgovino« kot vir elektronsko
  prejetih naročil, artikli imajo poseben tip kode za primer, ko je
  »TRONxERP v navezavi z zunanjo ERP rešitvijo«, klasifikacije artiklov
  imajo stikalo »Spletna klasifikacija«, šifrant dostave pa stikali B2C/B2B.
  To je **arhitekturni namig**, ne dokazan/testiran API.
- **Ni najdenega rezervacijskega/terminskega modula.** Edini kandidat, ki bi
  po imenu lahko ustrezal (Gostinstvo → Sobe), je **potrjeno NE** hotelska
  rezervacija sob, ampak le šifrant con za razporejanje miz v lokalu.
  Modula za customer-facing naročanje/rezervacijo terminov v TRONxERP ni.
- **»Trgovina z moduli« in »Administrativni modul«** (dve od treh prej
  neraziskanih postavk na dnu menija) sta **še vedno popolnoma
  nedokumentirani** – niti v priročniku (ki teh dveh sploh ne pozna, gre
  verjetno za novejšo SaaS-platformsko funkcionalnost) niti v 143 navodilih.
  To je najbolj obetaven naslednji korak za živo raziskavo, ker imeni
  namigujeta na razširljivost (»Trgovina z moduli« = marketplace vtičnikov?)
  in administrativne/tehnične nastavitve najema.
- **»Podpora & pomoč«** je bila medtem raziskana (glej
  `Navodila/Navodila-helpdesk-podpora/`) – vsebuje prijavo podpornih primerov,
  oddaljeno pomoč, YouTube posnetke, licenco in posodobitve, **ne**
  razvijalske/API dokumentacije. Dva podmenija (»Navodila«, »Posodobitve«)
  nista bila podrobno raziskana in bi teoretično lahko vsebovala tehnično
  dokumentacijo – odprto vprašanje.

---

## A) Ali TRONxERP že ponuja dokumentiran API/webhook/uvoz-izvoz mehanizem?

### Potrjeno iz dokumentacije

| Mehanizem | Vir | Opis |
|---|---|---|
| **Excel uvoz/izvoz artiklov** | `Navodila-artikli-TRONxERP.md`, razdelek 6 | Gumb »Uvoz/Izvoz« pri Artikli ponudi 7 možnosti: uvoz artiklov iz Excela, posodobitev obstoječih artiklov prek Excela, predloga za uvoz, uvoz/predloga sestavnic, izvoz (izbran prikaz ali vsi artikli). Potrjeno v priročniku (5.1.2.8) in v živem testiranju. |
| **»Uvoz naročila« (datotečni uvoz)** | `Navodila-veleprodaja-pregled-narocil-TRONxERP.md`, razdelek 2 | V Veleprodaja → Pregled naročil obstaja ločen gumb **»Uvoz naročila«** (uvoz iz datoteke), poleg »Ustvari« in »Masovno«. Sam obrazec/format datoteke ni bil preizkušen (v testnem okolju ni bilo naročil). |
| **Koncept »povezane spletne trgovine«** | PDF priročnik, pogl. 11.4 »Pregled naročil« (str. 153); potrjeno tudi v `Navodila-veleprodaja-pregled-narocil-TRONxERP.md` | Dobesedni navedek priročnika: *»Če uporabljamo določen tip dokumenta, na primer prejeta naročila, ali imamo povezano spletno trgovino (npr. elektronsko prejeto naročilo), se v tem podmodulu prikažejo ustrezna naročila, privzeto neobdelana.«* Dokumenti tipa **Naročilo** torej lahko nastanejo **samodejno** iz zunanjega vira, ne le ročno. V testnem okolju te povezave ni bilo mogoče preveriti (seznam je bil prazen). |
| **»ERP šifra artikla«** | PDF priročnik (str. 43–45) + `Navodila-artikli-TRONxERP.md`, razdelek 8 (Kode artiklov) | Pri tipih črtne kode artikla obstaja poseben tip **»ERP šifra artikla«**: *»kot ta koda se zapiše ID artikla, in sicer kadar je TRONxERP v navezavi z zunanjo ERP rešitvijo«*. To je eksplicitno polje za mapiranje ID-jev med TRONxERP in zunanjim sistemom – potencialno neposredno uporabno za mapiranje artiklov/storitev booking aplikacije. |
| **»Spletna klasifikacija«** | `Navodila-podjetje-TRONxERP.md`, razdelek o klasifikacijah artiklov | Stikalo pri klasifikacijah artiklov: *»klasifikacija, ki velja tudi na spletni strani/spletni trgovini«* – podatkovni model torej že predvideva, da se artikli/klasifikacije prikazujejo tudi na povezanem spletnem kanalu. |
| **Šifrant »Dostava« z B2C/B2B** | `Navodila-podjetje-TRONxERP.md`, razdelek 14 | Šifrant načinov dostave (Lastna dostava, DHL, Pošta Slovenije, Osebni prevzem, GLS …) ima stikali **B2C uporaba** / **B2B uporaba** in »Obračun stroška dostave« – infrastruktura, tipično vezana na spletno prodajo/e-trgovino. |
| **»Spletni račun« (domnevni dokument)** | `Navodila-pregled-veleprodaja-TRONxERP.md` (Pregled modula) | Ime dokumenta v seznamu tipov dokumentov nakazuje »Račun, izdan prek povezane spletne trgovine oz. druge zunanje/elektronske prodajne poti« – **NI bilo testirano**, gre za domnevo na podlagi imena. |
| **Navezava POS na profil (API plačilnega prehoda)** | `Navodila-navezava-pos-na-profil-TRONxERP.md` | Polje »Nastavitve omrežja« vsebuje URL/API-ključ **plačilnega prehoda** za kartično plačevanje na blagajni TRONpos (npr. ELLYPOS, SmartPOS) – to je integracija POS-terminala s plačilnim procesorjem, **ne** ERP-do-ERP integracija, a dokazuje, da sistem že ima primere zunanjih API povezav v produkciji. |
| **Splošni šifrantski uvoz** | Priročnik, večkrat (npr. 5.1.2.8, klasifikacije) | Vzorec »gumb Uvoz/Izvoz + Excelova predloga« se ponavlja pri več šifrantih (artikli, klasifikacije artiklov, verjetno tudi ceniki/partnerji, ni v vseh podmodulih eksplicitno preverjeno) – konsistenten, a **paketno/ročen**, ne dogodkovni (near-real-time) mehanizem. |

### Odprto vprašanje / domneva – treba preveriti v živo

- **Kako je tehnično realizirana »povezava s spletno trgovino«** iz poglavja
  11.4 – ali gre za generičen, dokumentiran vmesnik (REST endpoint, uvozna
  mapa, middleware), ki ga lahko uporabi katerakoli zunanja aplikacija, ali
  za individualno, po meri izdelano povezavo (COMTRON razvije integracijo za
  vsakega naročnika posebej)? Noben pregledan vir tega ne pojasni.
- **Ali obstaja ločen, (ne)dokumentiran razvijalski REST/SOAP API** za
  TRONxERP/TRONpos zunaj uporabniškega vmesnika? Znano je, da SPA interno
  kliče backend endpoint-e (npr. `saveUserVacation` – glej
  `KONTEKST-TRONxERP.md`, razdelek 4, znan hrošček s HTTP 200/`Success:false`)
  – to dokazuje obstoj REST API sloja **znotraj** aplikacije, ne pomeni pa,
  da je ta API namenjen/odprt za zunanjo integracijo. **To vprašanje je
  najbolje nasloviti neposredno na COMTRON** (prodaja/tehnična podpora), ker
  noben od naših virov (uporabniški priročnik, navodila iz živega
  testiranja) ni bil pisan za razvijalce.
- **Natančen format datoteke za gumb »Uvoz naročila«** (Veleprodaja →
  Pregled naročil) – ni bilo mogoče preveriti, ker v testnem okolju ni bilo
  primera. Vredno je v naslednji seji odpreti ta gumb in preveriti, ali
  ponuja predlogo (podobno kot pri artiklih).
- **Podmenija »Navodila« in »Posodobitve«** znotraj »Podpora & pomoč« nista
  bila raziskana (glej `Navodila-helpdesk-podpora-TRONxERP.md`, razdelek 2:
  »v tej seji ni bilo podrobno raziskanih«) – teoretično bi lahko vsebovala
  tehnično/razvijalsko dokumentacijo, čeprav glede na kontekst (uporabniška
  pomoč, licenca, posodobitve) to ni verjetno.
- **Vsebina »Trgovina z moduli«** – ime namiguje na nekakšen marketplace
  razširitev/vtičnikov (morda tudi plačljivih integracijskih modulov, kar bi
  lahko vključeval prav webshop/booking konektor) – popolnoma neraziskano.
- **Vsebina »Administrativni modul«** – ime namiguje na sistemske/najemniške
  (tenant-level) nastavitve, morda vključno z API ključi/dostopnimi žetoni za
  najem – popolnoma neraziskano.

---

## B) Ali obstaja modul, ki je konceptno že »rezervacijski/naročniški«?

### Potrjeno iz dokumentacije – NE obstaja pravi booking/rezervacijski modul

- **Gostinstvo → Sobe** (najbolj očiten kandidat po imenu) je bil **v celoti
  raziskan v živo** (`Navodila-sobe-TRONxERP.md`) in **eksplicitno
  ovržen** kot koncept nastanitvene rezervacije: *»V modulu Gostinstvo
  'Sobe' niso hotelske sobe za nastanitev gostov. Dejansko gre za
  poimenovane prostore/cone znotraj gostinskega lokala …, ki se uporabljajo
  za razvrščanje miz po lokalu.«* Potrjeno tudi v priročniku (13.1) – brez
  datumov, brez gostov, brez cen, samo šifrant imen prostorov.
- **Gostinstvo → Mize / Odprte mize / Pregled boniranja** so prav tako le
  šifranti/analitični pregledi za restavracijsko poslovanje na blagajni
  TRONpos (odpiranje/zapiranje mize, tisk naročil v kuhinjo), **brez**
  koncepta vnaprejšnje rezervacije mize s strani gosta/stranke.
- **Sistematičen iskalni pregled celotne dokumentacije** (143 datotek + PDF
  priročnik) po ključnih besedah rezervacij/terminov/urnikov ni našel
  **nobenega** modula, ki bi upravljal z vnaprej rezerviranimi termini
  storitev za zunanje stranke. Edini zadetki za »urnik« se nanašajo na
  **interni delovni urnik zaposlenih** (modul Delovni čas – »Aktiven na
  urniku«/»Aktiven na delovniku«), kar je HR-koncept, ne booking-koncept.
- **Nabava → Sistem naročanja** je samodejno naročanje pri **dobavitelju**
  glede na idealno/minimalno zalogo (interni proces oskrbe), ne
  customer-facing naročanje storitev.
- **Veleprodaja** je edini modul, ki že ima delujoč koncept »naročila,
  prejetega od zunaj« (glej razdelek A zgoraj) – konceptno je najbližje
  temu, kar potrebuje booking aplikacija (zunanje naročilo → dokument v
  ERP-ju → obdelava/dobava/račun), vendar je to **B2B veleprodajni tok**
  (dokumenti Naročilo → Dobavnica → Račun, brez datumsko/urno vezanih
  terminov ali razpoložljivosti virov/osebja).

### Domneva / odprto vprašanje

- Booking aplikacija bo skoraj zagotovo morala biti **samostojna nova
  aplikacija** (kot je naročnik že predvidel), ki v TRONxERP zapisuje
  **rezultat** rezervacije (npr. kot dokument tipa Naročilo/Veleprodajni
  dokument prek mehanizma iz poglavja 11.4, ali prek Excel/datotečnega
  uvoza), ne pa da bi TRONxERP sam upravljal termine/urnik razpoložljivosti.
  To ni bilo mogoče dokončno potrditi brez žive preizkušnje dejanske
  povezave s spletno trgovino.
- Ni jasno, ali »Trgovina z moduli« ali »Administrativni modul« morda
  vsebujeta dodaten, doslej neznan modul za termine/vire/osebje – oba sta
  neraziskana (glej razdelek A).

---

## C) Katere module raziskati naprej v živo (prioritetni seznam)

1. **»Trgovina z moduli«** (dno levega menija) – najvišja prioriteta.
   Preveriti, ali gre za marketplace naročniških dodatkov/vtičnikov in ali
   kateri od ponujenih modulov omenja webshop/API/booking/rezervacijski
   konektor.
2. **»Administrativni modul«** (dno levega menija) – preveriti, ali vsebuje
   API ključe, webhooke, nastavitve najema ali razvijalske možnosti.
3. **Veleprodaja → Pregled naročil → gumb »Uvoz naročila«** – odpreti in
   preveriti pričakovan format datoteke (morda obstaja Excel/CSV/XML
   predloga, analogno artiklom).
4. **Osnovni podatki → Artikli → Kode artiklov → tip »ERP šifra artikla«** –
   v živo preveriti dejansko obnašanje polja (ali je le shranjena vrednost
   ali sproži kakšno dodatno logiko/validacijo), ker je to najbolj
   neposredno omenjeno mapirno polje za zunanjo ERP povezavo.
5. **Podpora & pomoč → Navodila** in **→ Posodobitve** – preveriti, ali
   vsebujeta razvijalsko/tehnično/API dokumentacijo (nizka verjetnost, a
   poceni preveriti, ker je meni že odkrit in dostopen).
6. **Neposreden razgovor s COMTRON** (izven Playwright raziskovanja) – edini
   zanesljiv način, da se ugotovi, ali obstaja (nedokumentiran) REST/SOAP
   API za zunanje integracije, kakšni so pogoji dostopa in ali je bila taka
   integracija za druge naročnike že narejena. Noben pregledan vir (uporabniški
   priročnik, 143 navodil iz uporabniškega testiranja) ni bil pisan za
   razvijalce, zato to vprašanje presega, kar je mogoče ugotoviti zgolj z
   branjem obstoječe dokumentacije.
7. **Podjetje → Dostava** – v živo preveriti, ali obstoječi zapisi B2C/B2B
   načinov dostave morda že kažejo na aktivno povezano spletno trgovino
   (npr. ime/URL v opisu), podobno kot je bilo pri »Navezava POS na profil«
   najdeno vidno ime/API-žeton plačilnega prehoda.

---

## Viri (za sledljivost)

- `KONTEKST-TRONxERP.md` – razdelka 3a (zemljevid modulov) in 4 (znane
  napake/posebnosti, vnos 18.8.2026 o treh neraziskanih menijskih postavkah)
- `Navodila/Navodila-helpdesk-podpora/Navodila-helpdesk-podpora-TRONxERP.md`
- `Navodila/Navodila-pregled-narocnina-podpora/Navodila-pregled-narocnina-podpora-TRONxERP.md`
- `Navodila/Navodila-sobe/Navodila-sobe-TRONxERP.md`
- `Navodila/Navodila-pregled-gostinstvo/Navodila-pregled-gostinstvo-TRONxERP.md`
- `Navodila/Navodila-artikli/Navodila-artikli-TRONxERP.md` (razdelka 6 in 8)
- `Navodila/Navodila-poslovni-partnerji/Navodila-poslovni-partnerji-TRONxERP.md`
- `Navodila/Navodila-podjetje/Navodila-podjetje-TRONxERP.md` (razdelka o
  klasifikacijah in Dostavi)
- `Navodila/Navodila-veleprodaja-pregled-narocil/Navodila-veleprodaja-pregled-narocil-TRONxERP.md`
- `Navodila/Navodila-pregled-veleprodaja/Navodila-pregled-veleprodaja-TRONxERP.md`
- `Navodila/Navodila-navezava-pos-na-profil/Navodila-navezava-pos-na-profil-TRONxERP.md`
- `TRONxERP_navodila.pdf` – kazalo (str. 2–7, poglavja 1–15.3), pogl. 5.1.2.8
  (Uvoz/Izvoz), pogl. 5.1.7/Kode artiklov (str. 43–45, ERP šifra artikla),
  pogl. 11.4 Pregled naročil (str. 153), pogl. 13.1 Sobe (str. 164)

---

## D) Živa preverba (2.9.2026)

Izvedena z Playwright/webapp-testing skill, prijava kot `sasa` na
`10.0.1.47/TRONxERP/login`, vmesnik v slovenščini. Prijava je uspela brez
težav (preusmeritev na `/TRONxERP/home`, PE Maribor). Raziskava je bila
samo bralna – edini test, ki je spremenil polje v obrazcu (glej točko 4),
je bil eksplicitno preklican (»Prekliči« → »Ne« na vprašanje »Ali želite
shraniti spremembe?«) in preverjeno, da je izvirna vrednost ostala
nespremenjena.

### Najpomembnejša nova ugotovitev (za integracijo booking aplikacije)

**Veleprodaja → Pregled naročil → »Uvoz naročila« ne odpre nobenega
nalagalnika datotek (ni gumba »Browse«/»Choose file«, ni input
type="file").** Namesto tega odpre modalno okno **»Pregled spletnih
naročil«** – namensko mrežo za naročila, ki so prispela iz **povezane
spletne trgovine** (natanko koncept iz priročnika, pogl. 11.4, zdaj
potrjen tudi v uporabniškem vmesniku, ne le v besedilu priročnika).
Stolpci te mreže so: *Št. dokumenta, Št. naročila, Datum dokumenta,
Poslovni partner, Prodajna cena brez DDV, Način plačila, Opomba, Št.
ustreznih partnerjev, Št. ustreznih naslovnikov*. Znotraj modala je še en
gumb »Uvoz naročila«, ki pa deluje samo na že označeni vrstici (ob kliku
brez izbire javi napako »Za to operacijo morate označiti naročilo!«) –
torej pretvori/potrdi že obstoječ »spletni red« v pravi veleprodajni
dokument, ne uvaža datoteke iz računalnika uporabnika.

**Posledica za booking aplikacijo:** ker v celotnem UI-ju (na tej strani
niti kjerkoli drugje v raziskavi) ni nobenega mehanizma za ročni
upload/uvoz datoteke naročila, morajo »spletna naročila« v to mrežo
prispeti prek **ozadenjskega mehanizma, ki v uporabniškem vmesniku ni
viden** (najverjetneje backend endpoint/integracija, ki jo COMTRON
namesti/konfigurira posebej za vsakega naročnika – hipoteza iz razdelka A
je s tem posredno potrjena, čeprav natančnega mehanizma vseeno nismo
mogli videti, ker v testnem okolju ni bilo nobenega čakajočega spletnega
naročila). Stolpca »Št. ustreznih partnerjev« in »Št. ustreznih
naslovnikov« nakazujeta, da sistem ob uvozu poskuša samodejno ujemati
prispelo naročilo z obstoječimi poslovnimi partnerji/naslovi dostave v
TRONxERP – to je pomembno za načrt podatkovnega modela booking aplikacije
(stranka/naslov morata biti razpoznavna oz. ujemljiva s partnerji v ERP).

### 1. »Trgovina z moduli«

Odprto na `/TRONxERP/shop`. Vsebuje **samo 3 postavke** (»Vsi moduli«,
0 v »Kupljeni moduli«):

| Naziv | Opis | Cena |
|---|---|---|
| **Poštna GLS spremnica** | »Modul omogoča enostavno generiranje, tiskanje in upravljanje GLS poštnih spremnic neposredno iz ERP sistema. Integracija zmanjšuje ročno delo, saj se podatki o naročilih in naslovih samodejno prenesejo v GLS obrazce.« | 0,00 € / enkratno plačilo |
| **a** (opis »aa«) | testni/prazen zapis drugega uporabnika testnega okolja – ob odprtju »Več informacij« se v modalu iz neznanega razloga vedno prikaže naslov »Poštna GLS spremnica« (očiten UI-hrošček), slika in opisno besedilo (»123«) pa ustrezata pravemu zapisu | 0,00 € / enkratno plačilo |
| **fdg** (opis »dfg«) | prav tako testni zapis, isti hrošček z naslovom, opisno besedilo »asd« | 0,00 € / mesečno plačilo |

**Ugotovitev:** to NI kurirana ponudba COMTRON-ovih vtičnikov, ampak
**generičen, prodajni/marketplace mehanizem za module**, ki ga upravlja
Administrativni modul → **»Moduli za prodajo»** (`/TRONxERP/adminpanel/modulesForSale`)
– identičen seznam treh zapisov (GLS + dva testna) se tam ureja/ustvarja.
Torej je »Trgovina z moduli« le izložba za zapise, ki jih nekdo (COMTRON
ali stranka sama, glede na pravice) vnese v »Moduli za prodajo«. Trenutno
je edini resnično funkcionalen modul GLS poštna spremnica (kurirska
integracija, ne webshop/booking). **Noben od treh zapisov ne omenja
webshopa, API-ja, booking/rezervacijskega konektorja ali podobnega** – a
arhitekturno gledano je to mehanizem, prek katerega bi COMTRON v
prihodnje LAHKO ponudil in prodal poseben »booking konektor« modul, če bi
ga razvil (trenutno ga ni).

### 2. »Administrativni modul«

Podmeni ima **18 postavk** (preverjeno v celoti): Anketa, Firme,
**Logiranje**, Mobilne analize, **Moduli za prodajo**, Opravila,
Posodobitve, Povratne informacije, Prehod na DDV (ne)zavezanca,
**Sistemske nastavitve**, Skupine uporabnikov, Sporočila uporabnikom,
Sync uporabniki, Ustvari novo bazo, Zamenjava podjetja, Multi-firm
uporabniki, Omejevanja funkcij na modulih, Predloga uporabnikov. **Ni
postavke, poimenovane »API ključi«, »Webhooks« ali podobno.**

Preverjeni sta bili dve najbolj obetavni:

- **Logiranje** (`/TRONxERP/adminpanel/logging`) – zgolj graf prijav
  uporabnikov v izbranem časovnem oknu (v testnem obdobju »No data
  available«). Ni to dnevnik API klicev/integracij.
- **Sistemske nastavitve** (`/TRONxERP/adminpanel/systemSettings`) –
  **generična tabela nastavitev tipa ključ/vrednost, vezana na firmo**
  (stolpci: Id firme, Naziv firme, Enum nastavitve, Vrednost nastavitve).
  14 zapisov za firmo »DEVELOPMENT« in 1 za firmo »Gastro Test«. Med
  vrednostmi, ki so **neposredno relevantne** za integracije:
  - `TICtoken` – vrednost je JWT žeton (`eyJhbGci...`), shranjen v čistem
    besedilu.
  - `MailSettings` – SMTP poverilnice v čistem besedilu:
    `Gmail;smtp.gmail.com;465;true;tplicenca@gmail.com;ktlgkzryiiermurt`.
  - `B2BSupplier` = `TIC` (za firmo »Gastro Test«) – ime nastavitve
    eksplicitno omenja »B2B dobavitelja«, kar je konceptualno najbližje
    mehanizmu za povezavo z zunanjim virom naročil/dobaviteljem.
  - Preostalih ~10 zapisov so predloge e-poštnih sporočil
    (`MailDocumentTemplate...`, `MailSubjectDocumentTemplate...`) in
    `createUserPasswordRegex`, `GetArticlesDataSplitted` – nepovezano z
    zunanjimi integracijami.

  **Ugotovitev:** to ni namenska »API key management« stran, ampak
  splošen mehanizem za shranjevanje poljubnih sistemskih
  nastavitev/žetonov na nivoju firme – dokazuje, da TRONxERP interno že
  uporablja tak mehanizem za shranjevanje dostopnih žetonov (`TICtoken`)
  in celo B2B-dobaviteljsko nastavitev, kar podpira domnevo, da COMTRON
  tovrstne povezave nastavlja/vklaplja ročno prek te tabele za posamezno
  stranko/firmo – ne prek samopostrežnega API-portala.

### 3. Veleprodaja → Pregled naročil → »Uvoz naročila«

Glej razdelek »Najpomembnejša nova ugotovitev« zgoraj – v celoti
preverjeno v živo. Ključne dodatne podrobnosti:

- Gumb odpre modal **»Pregled spletnih naročil«** (ne obrazca za nalaganje
  datoteke).
- Modal ima svoj filter (Od/Do datum, stikalo »Prikaži obdelana
  naročila«) in gumb »Prikaži«.
- V testnem okolju je bila mreža prazna (»Ni razpoložljivih podatkov«,
  »Prikaz 0 - 0 od 0«) v celotnem razponu 01.09.2026–30.09.2026, zato
  dejanskega uvoza ni bilo mogoče preizkusiti do konca.
- **Ni bilo mogoče najti nobenega mehanizma v UI-ju za ROČNI uvoz
  datoteke naročila** (ne Excel, ne CSV, ne XML) – ne na zunanjem, ne na
  notranjem gumbu »Uvoz naročila«. To ovrže prvotno domnevo, da bi šlo za
  datotečni uvoz po zgledu Artiklov – gre za povsem drugačen mehanizem
  (potrjevanje/pretvorba že prispelih zapisov, verjetno prek
  ozadenjske/backend integracije).

### 4. Osnovni podatki → Artikli → Kode artiklov → »ERP šifra artikla«

Popravek glede na prejšnjo domnevo: **»Kode artiklov« ni zavihek znotraj
obrazca posameznega artikla**, ampak **samostojna postavka v podmeniju
Artikli** (`/TRONxERP/commondata/articleCodes`) – globalen, ploski seznam
VSEH kod vseh artiklov (v testni bazi cca. **1000 zapisov**), s stolpcem
»Artikel«, ki pove, kateremu artiklu koda pripada. (Odpiranje
posameznega artikla prek »Vnos in urejanje artikla« ni ponudilo
neposredne navigacije do te tabele znotraj obrazca artikla – dvoklik na
vrstico v seznamu artiklov je vrstico le označil, ni odprl urejevalnega
obrazca artikla; to ni bilo nadalje preiskovano, ker cilj – obnašanje
polja »ERP šifra artikla« – je bil dosegljiv prek »Kode artiklov«.)

**Potrjena dejstva o obnašanju polja:**

- Velika večina od ~1000 obstoječih kod je tipa »ERP šifra artikla«, in
  njihova vrednost (»Koda«) **ustreza numerični notranji ID številki
  artikla** (npr. artikel »67-Free delivery charges43« ima kodo tipa
  »ERP šifra artikla« z vrednostjo `67`, kar je njegov ID) – to potrjuje
  opis iz priročnika, da se kot ta koda privzeto zapiše ID artikla.
- Obrazec za urejanje (»Uredi kodo artikla«) ima polja: Artikel
  (spustni seznam + gumb »+« za nov artikel), **Tip črtne kode**
  (spustni seznam, izbrano »ERP šifra artikla«), **Koda** (prosto
  urejljivo besedilno polje, označeno kot obvezno), Količina, Enota
  mere, Aktiven, Primarna črtna koda.
- **Živ test polja »Koda«:** v polje z obstoječo vrednostjo `67` sem
  vnesel `TEST-ABC-999xyz!!`. Polje je **samodejno odstranilo posebne
  znake med tipkanjem** – končna prikazana vrednost je bila
  `TESTABC999xyz` (brez vezajev in klicajev). To dokazuje **client-side
  filtriranje na alfanumerične znake**, a nobene druge validacije
  (ni bilo opaziti klica na strežnik za preverjanje/ujemanje z zunanjim
  ERP-jem, ni bilo opozorilnega sporočila, ni bilo samodejnega
  izpolnjevanja/lookup-a na podlagi vnesene vrednosti).
- Sprememba je bila **preklicana** (»Prekliči« → potrditveno okno »Ali
  želite shraniti spremembe?« → »Ne«) in preverjeno s ponovnim odpiranjem
  zapisa, da je vrednost ostala `67` – ni bilo shranjenih testnih
  podatkov.

**Zaključek:** polje »ERP šifra artikla« / »Koda« je torej **le shranjena
vrednost s client-side alfanumeričnim filtrom** – ni polje z zunanjo
validacijo, ujemanjem ali sprožilcem dodatne logike. Za booking
aplikacijo to pomeni, da bi lahko vanj zapisali poljuben (alfanumeričen)
ID artikla iz booking sistema brez skrbi za skrite stranske učinke, a
tudi brez pričakovanja kakršnekoli samodejne sinhronizacije.

### 5. Podjetje → Dostava

Odprto na `/TRONxERP/commondata/delivery`. Obstaja **6 zapisov**: LD
(Lastna dostava), DHL (DHL dostava, opis »DHL«), PSZ (Pošta slovenija -
zastonj, opis »Pošta XX«), OP (Osebni prevzem), GLS (GLS pošta, opis
»Pošta XX«), PS (Pošta Slovenije) – vsi imajo stikalo »B2C uporaba«
vklopljeno.

Odprti so bili obrazci za urejanje treh zapisov (DHL, PSZ, GLS). Polja v
obrazcu: ID dostave, Ime dostave, Opis dostave, Poslovni partner (prazen
spustni seznam), **B2C uporaba**, **B2B uporaba**, Obračun stroška
dostave, Lasten prevzem, Pošta.

**Ugotovitev – negativna, v nasprotju z upanjem iz prejšnje analize:**
**noben od pregledanih zapisov ne vsebuje imena, URL-ja ali API-žetona
kakšne povezane spletne trgovine.** Polje »Opis dostave« vsebuje le
kratko opisno besedilo (»DHL«, »Pošta XX« – slednje je očitno testni
placeholder, ne resnično ime trgovine). Za razliko od najdbe pri
»Navezava POS na profil« (kjer je bilo vidno ime/API-žeton plačilnega
prehoda), šifrant Dostava **ne razkriva nobene povezave z zunanjo
spletno trgovino** – edina polja so B2C/B2B stikali in stroškovna
nastavitev, brez integracijskih podatkov.

### 6. Podpora & pomoč → Navodila in → Posodobitve

- **Navodila** – podmeni ima 3 postavke: **TRONxERP**, TRONpos Windows
  blagajna, TRONpos Android blagajna. Klik na »TRONxERP« sproži prenos
  datoteke (nova, prazna zavihek/download brez vidne strani) – gre
  očitno za isti uradni PDF priročnik, ki je bil že v celoti pregledan
  lokalno (viri zgoraj). Ni bilo mogoče (niti smiselno) prenesti in
  ponovno pregledati identične datoteke – ni dodatne razvijalske
  dokumentacije za drugi dve postavki (TRONpos blagajni), ki po imenu
  očitno ciljata na blagajniško strojno opremo, ne na integracije.
- **Posodobitve** (`/TRONxERP/support/updates`) – navaden, paginiran
  seznam sprememb/popravkov (datumi od 10.07.2024 do 19.03.2026, slednji
  je testni vnos drugega uporabnika »kr nekaj« / »kr nekaj nekaj«, kar
  dokazuje, da je seznam živ/urejevalen). V celoti je bil prebran vnos
  25.03.2025 (»OBVESTILO O VMESNI NADGRADNJI IN POPRAVKIH«) – vsebuje
  izključno uporabniške novosti (npr. prikaz črtne kode v grafični
  obliki na kartici artikla, predloga za masovni uvoz uporabnikov,
  popravek drag&drop stolpcev) in popravke hroščev. **Nobenega
  omenjanja API-ja, webhookov ali razvijalskih integracij** v tem ali
  drugih vidnih naslovih seznama.

**Zaključek za točko 6:** obe podmeniju sta, kot pričakovano (nizka
verjetnost), brez razvijalske/API dokumentacije – to vprašanje ostaja
nerešeno, priporočilo iz razdelka C (točka 6, neposreden razgovor s
COMTRON) ostaja edina pot naprej.
