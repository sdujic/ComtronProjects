# Specifikacija in arhitektura: lastna rezervacijska aplikacija (povezana na TRONxERP)

Ta dokument združuje ugotovitve iz [Lime-Booking-analiza.md](Lime-Booking-analiza.md) (popis obstoječe referenčne aplikacije) in [TRONxERP-integracija-poizvedba.md](TRONxERP-integracija-poizvedba.md) (možnosti povezave z obstoječim ERP-jem) v predlog funkcionalnosti, podatkovnega modela in arhitekture nove aplikacije, s katero se bodo stranke naročale na servis.

**Status: predlog v potrditev.** Preden se začne kodiranje, je treba potrditi razdelka 6 (integracija s TRONxERP) in 8 (odprta vprašanja) — oba vsebujeta točke, ki jih ni mogoče razrešiti brez dodatnih informacij od naročnika oz. od COMTRON.

---

## 1. Namen in obseg

Nova, samostojna spletna aplikacija ("BookingApp"), s katero končne stranke same rezervirajo termin servisa (izbira storitve → izvajalca/vira → termina → potrditev), lastnik/osebje pa termine upravlja prek admin vmesnika. Aplikacija ob dokončanju/potrditvi termina zapiše rezultat v TRONxERP (kot poslovni dokument in/ali kot posodobitev kartoteke stranke), da servisu ni treba podvajati vnosa.

Ključna razlika glede na "kupi Lime Booking in poveži": Lime Booking (razdelek 10 analize) **nima uporabniku vidnega API/webhook centra**, zato bi bila povezava obstoječega SaaS orodja na TRONxERP negotova in odvisna od dobre volje ponudnika. Lastna aplikacija to težavo reši **s tem, da je integracijski sloj proti TRONxERP zasnovan kot temeljni gradnik od začetka**, ne kot naknaden dodatek.

**Multi-vertikalna zasnova (dodano 2.9.2026):** aplikacija ni omejena na avtoservis. Podatkovni model (Storitev/Zaposleni/Termin) je bil od začetka industrijsko-agnostičen; naročnik je zahteval še eksplicitno nastavitev dejavnosti (`/admin/nastavitve`) s podporo za avtoservis (privzeto), frizerski salon, inštalacije/servis klim, dimnikarstvo, spa/masaže in generično "drugo" - vsaka z lastnim sloganom in predlogo tipičnih storitev za hiter začetek. Glej `NarocanjeAplikacija/app/README.md`, razdelek "Nastavitve / spremenljivke".

## 2. Obseg po fazah (predlog)

| Faza | Vsebina |
|---|---|
| **MVP** | Javni rezervacijski obrazec (1 lokacija), admin koledar, šifrant storitev, šifrant osebja/urnikov, kartoteka strank, e-poštna obvestila (potrditev + opomnik), izvoz/uvoz podatkov proti TRONxERP prek datotečnega mehanizma (glej razdelek 6) |
| **Faza 2** | Več lokacij, SMS obvestila, spletno plačevanje/depoziti (Stripe ali slovenski ponudnik), poročila/analitika, vloge in pravice (izvajalec vidi samo svoj urnik) |
| **Faza 3** | Neposredna/API integracija s TRONxERP (če COMTRON to omogoči), ponavljajoči termini, dodatki (add-oni) k storitvam, buffer-pravila po storitvi, kuponi/paketi |

MVP namenoma izpušča plačila in SMS, ker oboje uvaja stroške na transakcijo/sporočilo (glej razdelek 8) — smiselno je to vklopiti, ko je znan realen obseg prometa.

## 3. Funkcionalna specifikacija

Osnova je popis Lime Booking (razdelki 1–9 tam), s štirimi eksplicitnimi izboljšavami, kjer je referenčna aplikacija bila skromna ali nedelujoča (glej ugotovitve 6, 9 in 11 v zaključku te analize):

### 3.1 Termini / koledar
- Pogledi dan/teden/mesec, vrstica na zaposlenega/vir, vizualno ločen delovni čas od "časa za rezervacije" (koristen koncept iz Lime Booking, razdelek 3 in ugotovitev 1).
- En termin lahko vsebuje **več storitev hkrati** s skupnim seštevkom časa/cene (ugotovitev 2).
- Statusi termina: **V potrjevanju** (privzeto za spletne rezervacije, dokler jih osebje ne potrdi/zavrne - glej 6.3), Rezerviran (potrjen), Neprihod, Odpovedan (tudi zavrnjen s strani osebja), Zaključen.
- **Kanal-atribucija**: vsak termin ima polje `vir` (splet / ročno-admin), od začetka v podatkovnem modelu (ugotovitev 3) — ne dodajati naknadno.
- Eksplicitna, vidna nastavitev (izboljšava glede na Lime Booking, ugotovitev 6): min. ur vnaprej za rezervacijo, maks. dni vnaprej, buffer čas med termini — globalno in po storitvi.
- **Implementirano (2.9.2026):** pogledi dan/teden/mesec na JAVNEM IN admin delu. Na javnem delu so zasedeni termini vidni (ne skriti), a prikazani zgolj kot zasivljena/onemogočena ura brez kakršnihkoli podatkov o stranki - namerna odločitev naročnika, drugačna od tipičnega vzorca "pokaži samo proste termine".

### 3.2 Storitve (šifrant)
- Ime, opis, kategorija, barva, trajanje, cena, "vidna na spletu" stikalo, izvajalec(-i) (multi-select) ali brez izvajalca (npr. najem opreme).
- Eksplicitno predvideni **dodatki/add-oni** k storitvi (npr. "dodatna barva") in **vezava na vire/opremo** ločeno od osebja — v Lime Booking ta del ni bil dostopen/deloval (ugotovitev 11), zato ga načrtujemo na novo.
- Polje `erp_sifra_artikla` — neposredna vezava na TRONxERP artikel (glej 6.3).

### 3.3 Zaposleni / viri
- Kartoteka, jezik, kontaktni podatki, storitve ki jih izvaja, lokacije na katerih dela.
- Urniki: ločen "delovni čas" in "čas za rezervacije" po tednu, dopusti/bolniške/pavze kot ločene kategorije (po zgledu Lime Booking, razdelek 3).

### 3.4 Lokacije
- Naslov, delovni čas, časovni pas, vsaka lokacija ima svoj javni rezervacijski URL/kodo.
- **Dela prosti dnevi**: država (ISO 3166-1 alpha-2, privzeto Slovenija) določa, kateri koledarski prazniki veljajo za dela proste - izračunano za poljubno leto (vključno s premakljivimi prazniki, npr. velika noč), ne statičen seznam vezan na eno leto. Podprti Slovenija (SI) in Hrvaška (HR, ker je najpomembnejša sosednja država za morebitno širitev), arhitektura je pripravljena za dodajanje drugih držav. Na dela proste dneve se javno ne ponudi noben termin.
- **Vikend**: nedelja je privzeto zaprta (ni mogoče rezervirati), sobota odprta - oboje nastavljivo po posamezni lokaciji, ne trdo kodirano.

### 3.5 Stranke
- Kartica stranke kot mini-CRM: zgodovina terminov (filtri vsi/prihodnji/pretekli/odpovedani), prosti zapiski z oznakami, unikaten "link za prenaročanje" (ugotovitev 10).
- Polje `erp_partner_id` za vezavo na TRONxERP poslovnega partnerja (glej 6.3).
- GDPR: eksplicitno soglasje ob rezervaciji za prejemanje obvestil (checkbox) — Lime Booking tega ni imel (razdelek 4), a je za slovenski/EU trg priporočljivo od začetka.

### 3.6 Javni rezervacijski obrazec
- 4-koračni tok: storitev(-e) → izvajalec (če relevanten) → termin → podatki stranke. Telefon obvezen, e-pošta priporočena a ni nujno obvezna — glede na panogo (SMS kot primarni kanal, ugotovitev 5), a to je poslovna odločitev naročnika (glej razdelek 8).
- Prikaz TUDI zasedenih terminov (zasivljeno, brez podatkov o stranki - glej 3.1), sporočilo "ni prostega termina ta dan" ostaja za primer, ko je cel dan zaseden/zaprt.
- Vdeljiv (iframe) na obstoječo spletno stran servisa + samostojen deljiv link.
- **Privzeta možnost "Druga želja / opis težave"** poleg šifranta storitev - stranka opiše svojo potrebo v prostem besedilu namesto izbire vnaprej določene storitve; ta pot preskoči izbiro izvajalca (implementirano 2.9.2026).

### 3.7 Obvestila
- E-pošta/SMS ob: nov termin, prestavljen, odpovedan, opomnik pred terminom, opcijsko "follow-up" po terminu.
- Urejevalne predloge sporočil s spremenljivkami ({ime_stranke}, {datum}, {storitev} ...).

### 3.8 Plačila (Faza 2)
- Zunanji plačilni procesor (Stripe ali slovenski ponudnik, npr. preko banke/PayPal), ne lasten plačilni sistem — sledi vzorcu Lime Booking (razdelek 7, ugotovitev 8).

### 3.9 Poročila
- Prihodki po obdobju, zasedenost, no-show stopnja in finančni vpliv, delež terminov "prek spleta" vs. ročno, po zaposlenem/lokaciji/storitvi.

### 3.10 Vloge in pravice
- Vsaj 3 nivoji: lastnik/administrator (vse), vodja lokacije (svoja lokacija), izvajalec (samo svoj urnik/svoje stranke) — Lime Booking sistem vlog obstaja, a podrobnosti niso bile vidne (ugotovitev 12), zato to načrtujemo samostojno.

## 4. Podatkovni model (jedro)

| Entiteta | Ključna polja | Povezave |
|---|---|---|
| `Lokacija` | naziv, naslov, delovni_cas, cas_pas, valuta | 1—N Zaposleni, 1—N Termin |
| `Storitev` | naziv, opis, trajanje, cena, kategorija_id, erp_sifra_artikla, vidna_na_spletu | N—M Zaposleni (izvajalci), 1—N TerminStoritev |
| `KategorijaStoritve` | naziv, vrstni_red | 1—N Storitev |
| `Zaposleni` | ime, priimek, email, telefon, jezik, vloga | N—M Lokacija, N—M Storitev, 1—N Urnik, 1—N Termin |
| `Urnik` | zaposleni_id, lokacija_id, dan, delovni_cas_od_do, cas_rezervacij_od_do | — |
| `Stranka` | ime, priimek, email, telefon, jezik, erp_partner_id, soglasje_obvestila | 1—N Termin, 1—N Zapisek |
| `Termin` | datum_cas_od_do, status, vir(splet/admin), lokacija_id, stranka_id, zaposleni_id, cena_skupaj, zapisek | 1—N TerminStoritev |
| `TerminStoritev` | termin_id, storitev_id, cena, popust, trajanje | vezna tabela (podpira več storitev na termin) |
| `Obvestilo` (predloga) | tip(nov/prestavljen/odpovedan/opomnik), kanal(email/sms), zamik, aktivno | — |
| `Zapisek` | stranka_id, besedilo, oznaka_id, datum | — |

## 5. Arhitektura sistema (predlog)

```
┌─────────────────────┐     ┌──────────────────────┐
│  Javni booking UI    │     │   Admin/dashboard UI   │
│  (spletna stran/      │     │   (koledar, šifranti,  │
│   iframe widget)      │     │    poročila, nastavitve)│
└──────────┬───────────┘     └──────────┬────────────┘
           │            REST/GraphQL API │
           └───────────────┬─────────────┘
                            ▼
                 ┌─────────────────────┐
                 │   Backend aplikacija  │
                 │  (poslovna logika,    │
                 │   avtentikacija,       │
                 │   API/webhooki)        │
                 └──┬──────────┬────────┘
                    │          │
        ┌───────────▼───┐  ┌──▼──────────────────┐
        │  Baza podatkov │  │ Zunanje storitve       │
        │  (PostgreSQL)  │  │ - Email/SMS ponudnik    │
        └────────────────┘  │ - Plačilni procesor      │
                             └──────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────┐
        │  Integracijski sloj → TRONxERP │
        │  (adapter, glej razdelek 6)     │
        └─────────────────────────────┘
```

**Predlog tehnologije** (izhodišče za potrditev, ne dokončna odločitev — glej razdelek 8):
- Backend: Node.js/TypeScript ali .NET (slednje je smiselno, če bo integracija s TRONxERP tesna — COMTRON-ova aplikacija je Angular/verjetno .NET zaledje, kar olajša morebitno skupno delo z njihovimi razvijalci)
- Frontend: React ali Angular (admin + javni obrazec kot ločeni SPA ali eno Next.js/Angular Universal ogrodje zaradi SEO na javnem obrazcu)
- Baza: PostgreSQL
- Gostovanje: odvisno od obstoječe infrastrukture naročnika (glej razdelek 8)

Ključno arhitekturno načelo: **integracijski sloj proti TRONxERP je ločen adapter/modul**, ne prepleten s poslovno logiko booking aplikacije. S tem lahko aplikacija deluje samostojno tudi če/dokler povezava s TRONxERP ni (še) vzpostavljena, integracijo pa je mogoče kasneje zamenjati (datotečni uvoz → API), ne da bi bilo treba predelati jedro aplikacije.

## 6. Integracija s TRONxERP

### 6.1 Trenutno stanje (posodobljeno po živi preverbi in najdbi API-ja, 2.9.2026)

**Najpomembnejša novost: TRONxERP ima pravi, ločen REST API — "TronOfficeAPI"**, dostopen na `https://xerp.comtron.si/tronofficeapi/swagger/` (povezavo posredoval naročnik). Klic `swagger/v1/swagger.json` vrne `{"Success":false,"ErrorCode":403,"ErrorMessage":"Seja vam je potekla"}` — torej API **obstaja in je živ**, a je zaščiten z avtenticirano sejo. Dokler nimamo dostopa do specifikacije (glej 6.4, točka 1), ne vemo, kateri endpointi so na voljo — to je zdaj najpomembnejše odprto vprašanje v celotnem dokumentu.

Poleg tega je bila v živo preverjena vsaka od prej domnevanih poti (glej `TRONxERP-integracija-poizvedba.md`, razdelek D za polne podrobnosti):

1. **"Povezana spletna trgovina" (priročnik, pogl. 11.4) — potrjena kot resnična, delujoča funkcija**, ne le besedilo priročnika. Veleprodaja → Pregled naročil → "Uvoz naročila" odpre modal **"Pregled spletnih naročil"** — namensko mrežo za naročila iz povezane spletne trgovine, z avtomatskim ujemanjem na poslovne partnerje/naslovnike. **V UI-ju ni nobenega mehanizma za ročni upload datoteke** — naročila morajo prispeti prek ozadenjske integracije, ki v vmesniku ni vidna.
2. **"ERP šifra artikla" — potrjeno je zgolj prosto urejljivo besedilno polje** (client-side alfanumerični filter, brez zunanje validacije/ujemanja/lookup-a). Uporabno kot mesto za zapis ID-ja iz booking aplikacije, a brez kakršnekoli samodejne sinhronizacije.
3. **Gumb "Uvoz naročila" NI datotečni uvoz** — glej točko 1. Prvotna domneva o Excel/CSV uvozu naročil je ovržena.
4. **Excel uvoz/izvoz artiklov** — ostaja edini potrjen, dejansko delujoč self-service paketni mehanizem, a velja samo za artikle, ne za naročila/termine.
5. **"Administrativni modul" → "Sistemske nastavitve"** — generična tabela ključ/vrednost na nivoju firme, ki **v tem testnem okolju že vsebuje žive integracijske podatke**: JWT žeton `TICtoken`, SMTP poverilnice v čistem besedilu, in nastavitev `B2BSupplier=TIC` za firmo "Gastro Test". To dokazuje, da **integracije v TRONxERP niso samopostrežne** — COMTRON jih očitno ročno konfigurira po meri za posamezno stranko/firmo prek te tabele (primer: karkoli "TIC" je, ima že delujočo povezavo). "Trgovina z moduli" je sicer generičen prodajni mehanizem za module (trenutno edini pravi modul: GLS poštna spremnica) — arhitekturno bi lahko COMTRON tu nekoč ponudil "booking konektor" kot plačljiv modul, a tega še ni.

### 6.2 Priporočen pristop (dokončno potrjeno, 2.9.2026)

Naročnik je delil zaslonske posnetke swagger seznama iz lastnega prijavljenega brskalnika — **TronOfficeAPI ima namenski, samopostrežni "Integration" API sklop**, ne le splošen interni API. To potrjuje **Pot A kot dejansko, takoj izvedljivo pot**, ne le upanje:

- `POST /login/doLogin` — prijava/pridobitev avtorizacijskega žetona.
- `POST /integration/importOrder` — **neposreden uvoz naročila** (skoraj zagotovo mehanizem, ki polni "Pregled spletnih naročil", odkrit v živi preverbi razdelka D). To je zamenjava za mock klic ob zaključku termina.
- `POST /integration/saveCustomer`, `GET /integration/customer`, `POST /integration/getCustomers` — sinhronizacija Stranka ↔ Poslovni partner.
- `POST /integration/saveArticle` + `updateArticlesExKeys`/`updateArticleExKeys` ("exKey" = namenski mehanizem za mapiranje zunanjih ID-jev) — natančnejši način za povezavo Storitev ↔ Artikel kot prosto polje "ERP šifra artikla".
- `GET /integration/getBusUnitsWithStores`, `getTaxRates`, `getDeliveries` — podporni podatki (mapiranje Lokacij, davki, dostava).

Poln seznam in podrobnosti: [TRONxERP-API-swagger-najdba.md](TRONxERP-API-swagger-najdba.md) in [TronOfficeAPI-referenca.md](TronOfficeAPI-referenca.md) (celotna shema vsakega endpointa, zajeta 2.9.2026 iz naročnikovega prijavljenega brskalnika).

**Implementirano (2.9.2026):** ogrodje aplikacije (`NarocanjeAplikacija/app/`) ima zdaj pravega TronOfficeAPI adapterja (`src/lib/tronxerp-client.ts` + `src/lib/tronxerp-adapter.ts`), ki se samodejno vklopi, ko sta v `.env` nastavljena `TRONXERP_API_USERNAME`/`TRONXERP_API_PASSWORD` (sicer ostane mock, aplikacija dela naprej brez povezave). Adapter kliče `doLogin`, `saveCustomer` in `importOrder`.

**Kar še manjka za polno zanesljivo implementacijo:** natančna oblika vrstic/postavk naročila v `importOrder` telesu (primer v swagger UI se je obrezal), vrednost `articleType`, ki v TRONxERP označuje "virtualni/storitveni artikel" (za pravilno `saveArticle` sinhronizacijo Storitev), in trajanje/osvežitev prijavnega žetona (koda trenutno ob vsaki napaki poskusi eno ponovno prijavo, kar je razumen privzeti ukrep, a ni bilo preizkušeno v živo).

**Pot B (COMTRON integracija po meri, npr. "TIC")** ostaje kot rezervna možnost, a ni več primarno priporočilo.

Arhitekturno priporočilo iz razdelka 5 ostaja nespremenjeno: integracija je izolirana v ločenem adapterju (`src/lib/tronxerp-adapter.ts` v ogrodju aplikacije), da jedro aplikacije ni odvisno od podrobnosti implementacije.

### 6.3 Predlog mapiranja podatkov (posodobljeno po naročnikovih navodilih, 2.9.2026)

| BookingApp | TRONxERP | Mehanizem |
|---|---|---|
| `Stranka` | Poslovni partner (kupec) | **iskanje obstoječega** prek `POST /integration/getCustomers` (po telefonu, nato e-pošti, nato imenu+priimku - prvi zadetek šteje); **stranka se NE ustvarja samodejno** - če ni najdena, se uporabi privzeta stranka (`TRONXERP_API_DEFAULT_CUSTOMER_ID`, privzeto "0") in dejanski podatki (ime, telefon, e-pošta) se zapišejo v opombo dokumenta (`DocNote`) |
| `Storitev` | Artikel tipa "Storitve" (`articleType=1`) | `saveArticle` + `updateArticleExKeys` (exKey = interni ID storitve), sinhronizirano ob ustvarjanju storitve v adminu |
| `Termin` | Dokument Naročilo (delovni nalog) prek `POST /integration/importOrder` | **poslano ŠELE ob potrditvi termina** (prehod v status `REZERVIRAN`, glej spodaj), ne že ob spletni rezervaciji - datum/ura dokumenta = datum/ura termina; TerminStoritev vrstice → `DocumentPositions` |

**Potek potrjevanja (poslovno pravilo naročnika, posodobljeno 2.9.2026):** spletna rezervacija (vir=SPLET) po nastanku takoj dobi lokalni status `V_POTRJEVANJU` - v TRONxERP se ŠE NE pošlje ničesar. Ko osebje termin v `/admin/koledar` potrdi, status preide v `REZERVIRAN` in **šele takrat** se pošlje delovni nalog v TRONxERP (`spremeniStatusTermina` preveri prejšnji status, da se nalog ne pošlje dvakrat ob morebitnih nadaljnjih spremembah). Če osebje termin zavrne/zavrže, status preide v `ODPOVEDAN`, kar **avtomatsko sprosti termin nazaj za novo spletno naročanje** (glej `dostopnost.ts` - izključuje samo termine s statusom ODPOVEDAN) - ker delovni nalog v tem primeru sploh ni bil poslan, ni potrebe po preklicu na strani TRONxERP. Ročno v adminu ustvarjeni termini (vir=ADMIN) so takoj `REZERVIRAN`, zato se zanje delovni nalog pošlje takoj ob vnosu.

### 6.4 Obvezni naslednji koraki, preden je integracija dokončno implementirana

Vprašanje "ali API sploh obstaja" je razrešeno (glej 6.2) — preostali koraki so zdaj tehnično-operativni, ne več raziskovalni:

1. **Pridobiti natančno shemo zahteve/odgovora** za ključne endpointe (`doLogin`, `importOrder`, `saveCustomer`, `getCustomers`, `saveArticle`, `updateArticleExKeys`, `getBusUnitsWithStores`) — v swagger UI (`https://xerp.comtron.si/tronofficeapi/swagger/`) je treba razširiti vsak endpoint (klik nanj) in razkriti polja "Request body"/"Responses". Naročnik ima dostop v svojem brskalniku — najhitreje z zaslonskimi posnetki razširjenih endpointov, ali z izvozom celotnega `swagger.json`, ko je prijavljen (gumb za prenos, če ga swagger UI ponuja, sicer klik "Authorize" + kopiranje odgovora).
2. **Ugotoviti avtorizacijski mehanizem** — ali `doLogin` vrne bearer token za `Authorization` glavo (najverjetneje, glede na ključavnice na endpointih), in katere poverilnice sprejema (isti uporabnik kot spletna prijava, ali ločen integracijski račun/API-ključ od COMTRON).
3. **Preveriti pri COMTRON** (če po točki 1-2 še kaj ostane nejasno): ali je za produkcijsko rabo API-ja treba posebno dovoljenje/paket, in ali obstajajo omejitve (rate limiti, količina klicev).

## 7. Vloge in pravice — predlog

| Vloga | Dostop |
|---|---|
| Lastnik/administrator | vse — vsi termini, nastavitve, poročila, uporabniki |
| Vodja lokacije | termini in poročila svoje lokacije, urejanje osebja/urnikov na svoji lokaciji |
| Izvajalec/zaposleni | samo svoj koledar, svoje stranke, brez dostopa do prihodkov drugih |

## 8. Odprta vprašanja za naročnika (poslovne odločitve)

Tega ni mogoče razrešiti iz tehnične analize — potrebna je vaša odločitev, preden nadaljujemo v podrobno tehnično arhitekturo/kodiranje:

1. **Panoga in obseg**: koliko lokacij, koliko zaposlenih/izvajalcev, katere storitve — vpliva na kompleksnost šifrantov in urnikov.
2. **Plačilni ponudnik**: Stripe (kot Lime Booking) ali slovenski ponudnik (npr. banka, Mollie, drugo)? Ali plačilo ob rezervaciji sploh potrebujete v MVP, ali je dovolj kasneje plačilo na servisu?
3. **SMS/email ponudnik**: kdo bo pošiljal SMS opomnike (strošek na sporočilo) — imate že razmerje s kakšnim ponudnikom (npr. za druge sisteme)?
4. **Gostovanje/infrastruktura**: kje naj aplikacija teče (obstoječ strežnik/cloud, ali nov)? Ali obstajajo omejitve (npr. mora teči na istem strežniku kot TRONxERP zaradi 10.0.1.47 internega naslova)?
5. **Razvojna ekipa**: kdo bo to razvijal — vi/vaša ekipa, zunanji izvajalec, ali jaz nadaljujem z gradnjo tukaj? Od tega je odvisna izbira tehnologije (razdelek 5).
6. **Sheme endpointov TronOfficeAPI** — API je potrjeno pravi in samopostrežen (razdelek 6.2), manjkajo le natančne zahteve/odgovori za `doLogin`/`importOrder`/`saveCustomer`/`saveArticle`/`updateArticleExKeys`/`getBusUnitsWithStores` (razdelek 6.4, točka 1) — najhitreje z zaslonskimi posnetki razširjenih endpointov iz vašega brskalnika.
7. **Poverilnice/API dostop za `doLogin`** — ali se za API prijavo uporablja isti uporabnik kot za spletno TRONxERP prijavo, ali potrebujemo ločen integracijski račun/žeton od COMTRON?
8. **Kontakt pri COMTRON** — potreben samo še za morebitna vprašanja o pogojih produkcijske rabe API-ja (rate limiti, dovoljenja) — ali imate obstoječega kontaktnega tehnika/prodajalca?

## 9. Viri
- [Lime-Booking-analiza.md](Lime-Booking-analiza.md) — celoten popis referenčne aplikacije (12 razdelkov + ključne ugotovitve)
- [TRONxERP-integracija-poizvedba.md](TRONxERP-integracija-poizvedba.md) — popis obstoječe TRONxERP dokumentacije + živa preverba 2.9.2026 (razdelek D)
- [TRONxERP-API-swagger-najdba.md](TRONxERP-API-swagger-najdba.md) — najdba TronOfficeAPI (2.9.2026)
- `KONTEKST-TRONxERP.md`, `Navodila/` — obstoječa dokumentacija TRONxERP v tem delovnem direktoriju
