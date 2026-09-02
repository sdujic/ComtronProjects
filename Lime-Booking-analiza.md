# Analiza obstoječe aplikacije Lime Booking

Dokument popisuje funkcionalnost SaaS aplikacije **Lime Booking** (admin/dashboard del na `app.lime-booking.com` in javni rezervacijski obrazec na `form.lime-booking.com`), kot izhodišče za specifikacijo lastne rezervacijske aplikacije naročnika, ki bo kasneje povezana na TRONxERP.

Analiza je bila narejena z brskanjem po pravem (produkcijskem) računu naročnika, ki vsebuje demo podatke: 1 lokacija ("Demo lokacija"), 1 storitev ("Demo storitev", 30 min, 15,00 €), 1 zaposleni ("Pero Perič") in 1 testni termin. Ker gre za demo/prazen račun, nekaterih funkcionalnosti (npr. dejanski izgled z več lokacijami, več storitvami, dejanskimi strankami) ni bilo mogoče videti "v polnem razmahu" - to je posebej označeno.

Legenda oznak pri vsaki ugotovitvi:
- ✅ **Potrjeno delujoče** - dejansko videno/preizkušeno v vmesniku
- 👀 **Opazil, a nisem preizkusil** - vidno v UI (npr. gumb, oznaka, omenjeno besedilo), a nisem izvedel celotnega toka (da ne bi tvegal sprememb pravih podatkov ali ker ni bilo praktično izvedljivo)
- ❌ **Ni na voljo / ni bilo mogoče najti** - v raziskanem delu vmesnika tega nisem zaznal

---

## 1. Koledar / rezervacije

**Čemu služi:** osrednji delovni zaslon administratorja - pregled in upravljanje vseh terminov.

### Pogledi
- ✅ Preklop **Mesec / Teden / Dan** (privzeto Teden), gumb "Danes", puščici za premik naprej/nazaj, izbirnik lokacije (za več lokacij), gumb z mini-koledarjem za skok na datum.
- ✅ Teden/dan: urni razmik po 30 min (07:00-22:00+), stolpci = dnevi, znotraj vsakega dne vrstica na zaposlenega. Delovni čas zaposlenega je vizualno označen (zelena prosojna podlaga s črtkanim robom), izven delovnega časa je polje sivo/šrafirano in ni klikljivo (ni mogoče ustvariti termina zunaj urnika).
- ✅ Mesečni pogled: termini prikazani kot majhni obarvani zapisi z uro znotraj celice dneva.

### Ustvarjanje termina
- ✅ Klik na prazen (delovni) slot odpre stranski panel "Dodajanje termina" z dvema zavihkoma: **Termin** in **Pavza** (zaposleni lahko iz koledarja neposredno vnese tudi lastno pavzo/blokado časa, ne samo termin stranke).
- ✅ Izbira storitve: iskalno polje + seznam storitev, grupiranih po kategorijah (če obstajajo). Če storitev na izbrani dan/uro ni na voljo (npr. zaposleni ne dela), se prikaže ikona "prepovedano" ob storitvi.
- ✅ Po izbiri storitve ("Potrdi izbiro") se odpre poln obrazec: Storitev, Zaposleni, **Cena** (ročno nastavljiva - popust ob rezervaciji), **Popust** (v €), **Čas trajanja** (ročno nastavljiv, ni nujno enak privzetemu), gumb **"+ Dodaj storitev"** (en termin lahko vsebuje več storitev hkrati, npr. striženje + barvanje), samodejni seštevek "Skupni čas vseh storitev" / "Skupna cena vseh storitev".
- ✅ Datum/čas od-do (ročno nastavljiva).
- ✅ Podatki o stranki: Ime, Priimek, E-pošta, Telefonska številka, Jezik (obrazec torej dovoljuje vnos nove stranke kar med kreiranjem termina, brez predhodnega vnosa v kartoteko).
- ✅ **Zapisek termina** (prosto besedilo) + "Dodaj oznako zapiska" (vezava na sistem oznak strank, glej razdelek 4).
- ✅ Stikalo **"Stranka je želela točno tega izvajalca"** (za analitiko/statistiko po zaposlenih).
- ✅ Stikalo **"Ponavljajoč termin"** (recurring appointment) - obstaja podpora za ponavljajoče se termine, podrobnosti nastavitve niso bile raziskane do konca (👀).
- ✅ Gumba "Prekliči" / "Dodaj termin".

### Urejanje obstoječega termina
- ✅ Klik na obstoječi termin odpre "Urejanje termina" s številko termina (npr. #10209443) in **statusom** v spustnem meniju zgoraj desno. Statusi: **Rezerviran** (privzeto/booked), **Neprihod** (no-show), **Odpoved termina** (cancellation) - torej 3 stanja termina.
- ✅ Isti obrazec kot pri ustvarjanju (storitev/zaposleni/cena/popust/trajanje/datum-čas/zapisek), plus zavihek **"Kartica stranke"** (glej razdelek 4) in gumba "Uredi stranko" / "Zamenjaj stranko". Nova stranka je označena z značko "Nova stranka".
- 👀 Spreminjanja statusa in brisanja/premikanja termina (drag & drop) nisem dejansko izvedel, da ne bi spremenil edinega demo termina v računu - drag&drop premikanje ni bilo eksplicitno preizkušeno, a glede na UX vzorec (mreža po urah/zaposlenih) je zelo verjetno podprto.

### Barvno kodiranje
- ✅ Vsaka storitev ima svojo barvo (izbira iz 6 prednastavljenih pastelnih barv + razširjena paleta), ki se uporabi za obarvanje bloka termina v koledarju.

---

## 2. Storitve (šifrant)

**Čemu služi:** katalog storitev, ki jih ponuja podjetje.

- ✅ Seznam storitev: iskanje, "Uredi zaporedje" (ročno določanje vrstnega reda prikaza), zavihka **"Vse storitve"** in **"Kategorije storitev"**.
- ✅ **Kategorije storitev**: ločen seznam (Naziv + "Dodaj kategorijo" + "Uredi zaporedje"); v demo računu prazen. Storitev se kategoriji dodeli preko spustnega seznama na sami storitvi ("+ Dodaj novo" kategorijo kar iz obrazca storitve).
- ✅ Urejanje storitve je razdeljeno v 5 zavihkov:
  - **Splošno**: Ime storitve (z ločenimi "Nastavitve prevodov" za večjezičnost), Opis storitve (WYSIWYG urejevalnik - krepko/ležeče/prečrtano/seznami/ločnice ipd., prav tako z nastavitvami prevoda), Kategorija, **Barva storitve**, stikalo "Naročanje preko spleta" (ali je storitev vidna/rezervabilna na javnem obrazcu), stikalo "Storitev ima osebo za izvajalca" + izbira izvajalcev (multi-select) - torej je mogoče imeti tudi storitve BREZ vezave na osebo (npr. najem opreme, prostora).
  - **Trajanje**: samo eno polje - trajanje v minutah (+/- stepper).
  - **Cena**: samo eno polje - "Osnovna cena (z davkom)" (+/- stepper).
  - **Dodatno**: 👀/❌ zavihek je bil v celoti prazen (brez polj, brez besedila) - preizkusil sem na dva načina (klik po UI in neposreden vstop na URL z daljšim čakanjem), rezultat je bil enak. Možno gre za nedokončano/onemogočeno funkcionalnost (morda "dodatki/add-oni" ali nadgradnja plana) - **ni bilo mogoče ugotoviti, kaj naj bi vseboval**. To je pomembna odprta točka za lastno aplikacijo: v specifikaciji je treba eksplicitno predvideti dodatke (add-on storitve, npr. "dodatna barva", "dodaten izdelek") in vezavo storitve na vire/opremo, ker Lime Booking tega v tem zavihku ni pokazal.
  - **Slike**: nalaganje do 10 slik na storitev, prikazane na spletnem obrazcu.
- ✅ Meni "..." na obrazcu storitve: **"Dupliciraj storitev"** in **"Izbriši storitev"**.
- ❌ Nisem našel eksplicitne vezave storitve na "vire" (npr. sobo, stroj, opremo) ločeno od osebja - izvajalec je vedno oseba (ali pa storitev sploh nima izvajalca).

---

## 3. Zaposleni / viri

**Čemu služi:** kartoteka osebja, njihov delovni čas in dodeljevanje storitev.

### Osebje
- ✅ Seznam ("Osebje" > "Pregled osebja"): ime, e-pošta, avatar, gumb "Dodaj osebo".
- ✅ Obrazec osebe (dodajanje/urejanje): Slika osebe, Ime, Priimek, Elektronski naslov, stikalo "Posodobi geslo", Opis, Telefonska številka (z izbiro države/klicne kode - polna mednarodna lista), **Jezik** (na voljo: English, Slovenščina, Deutsch, Hrvatski, Italiano, Español, Srpski, Bosanski, Français), **"Lokacije na katerih dela zaposleni"** (multi-select, "izberi vse") - torej je **večlokacijsko delo enega zaposlenega podprto**, **"Storitve, ki jih izvaja"** (multi-select, "izberi vse").
- ✅ Na dnu obrazca vrstica **"Urejanje dovoljenj ni mogoče"** s puščico - kaže, da sistem vlog/pravic obstaja, a ga v tem računu (edini/lastniški uporabnik) ni bilo mogoče urejati/videti podrobnosti (glej tudi razdelek 11).

### Urniki (delovni čas)
- ✅ Ločen razdelek "Urniki osebja" z zavihkoma **Urniki** in **Dopusti**.
- ✅ **Urniki**: seznam časovno omejenih urnikov (npr. "01.09.2026 - 31.12.2026") vezanih na lokacijo, z ikonama za urejanje (zobnik: ime/lokacija/obdobje/barva urnika) in brisanje. Klik na urnik odpre tedenski prikaz po zaposlenih z dvema podzavihkoma: **"Delovni čas"** in **"Naročanje"** - to je pomembna ločnica: čas, ko je zaposleni fizično na delu, je lahko drugačen od časa, ko je na voljo za rezervacije strank (npr. širši delovni čas, ožji "bookable" čas). Prikazano je tudi "Št. ur v tednu" na zaposlenega.
- 👀 Podrobno urejanje posameznega dneva v urniku (klik na prazno/obstoječo celico) mi v avtomatiziranem testiranju ni uspelo odpreti kot ločen dialog - možno je to vezano na hover-stanje ali drag-select, ki ga s klikom na samo eno točko nisem sprožil.
- ✅ **Dopusti**: ločena tabela odsotnosti s filtri (Lokacija, Zaposleni, **Vrsta**, Razpon datuma), stolpci Datum/Zaposleni/Lokacija/Vrsta/Opomba, "Dodaj dopust", množično brisanje. V demo računu prazna. Vrste dopusta nisem odprl (spustni filter "Vrsta"), a v analitiki zaposlenih (razdelek 9) so vidne kategorije **Dopusti, Bolniške, Pavze, Malica** - kar nakazuje, da so vsaj te 4 vrste odsotnosti/neaktivnosti ločeno beležene.

---

## 4. Stranke

**Čemu služi:** kartoteka strank in zgodovina.

- ✅ Seznam ("Stranke"): iskanje, tabela Ime/Priimek/Email/Telefon/**Zadnji obisk**, gumb "Dodaj stranko", ikona za nastavitev prikaza stolpcev, stran/paginacija. V demo računu prazen seznam ("Ni strank").
- ✅ **Kartica stranke** (dostopna preko termina, ker ni bilo pravih strank za neposreden test iz seznama): naslov z imenom (uredljivo s svinčnikom), jezik stranke, in trije zavihki:
  - **Termini**: podfiltri **Vsi / Prihodnji / Pretekli / Odpovedani**, kartice terminov z datumom, statusno značko ("Prihajajoč" ipd.), ceno, lokacijo, izvajalcem in hitrimi akcijami (ikone: dodaj v koledar, komentar, zgodovina, več-menu ...). Poleg seznama je mini-koledar meseca za hiter pregled datumov z rezervacijami.
  - **Zapiski**: "Glavni komentar stranke" (fiksna pripomba, urejena preko "Uredi") + seznam dodatnih zapiskov z iskanjem in gumbom "Dodaj zapisek". Zapiski se lahko označijo z oznakami, ki se urejajo centralno pod Nastavitve > "Oznake zapiskov strank" (prazen seznam v demo računu, a mehanizem obstaja - lasten sistem CRM oznak/tagov).
  - **Analitika**: zavihek obstaja (👀), vsebine nisem uspel odpreti/zajeti v tej seji (klik je bil oviran s prekrivajočim elementom) - verjetno gre za enak nabor metrik kot pri splošni analitiki, a filtriran na eno stranko.
- ✅ Zgornji desni gumbi na kartici stranke: **"Povezava za prenaročanje"** (unikaten link, ki stranki omogoči, da si sama ponovno rezervira termin - uporabno za "reminder" e-poštna sporočila) in **"Na koledar"**.
- ❌ Nisem zaznal eksplicitnega GDPR/soglasje polja (npr. checkbox "strinjam se s prejemanjem obvestil") - niti v obrazcu stranke niti na javnem rezervacijskem obrazcu. Možno obstaja v naprednejših nastavitvah ali je vezano na piškotni consent banner (ki je prisoten tako v adminu kot na javnem obrazcu), ni pa posebnega GDPR polja na nivoju posamezne stranke.

---

## 5. Javna rezervacijska stran (widget za stranke)

**Čemu služi:** obrazec, preko katerega končna stranka sama rezervira termin - to je najbolj neposredna referenca za "booking" del lastne aplikacije.

- ✅ Vsak račun ima unikaten naslov oblike `https://form.lime-booking.com/sl/{koda-računa}` (koda je vidna in kopirljiva pod Nastavitve > "Povezave do form"; jezik je del URL-ja, npr. `/sl/`, kar omogoča vdelavo v spletno stran v pravem jeziku ali preusmeritev glede na brskalnikov locale).
- ✅ Obrazec sem dejansko preizkusil kot "stranka" (nova brskalnikova seja brez prijave), **do zadnjega koraka pred dokončno potrditvijo** (nisem kliknil končnega gumba, da ne bi ustvaril prave rezervacije):
  1. **"Izberite storitev"** - seznam storitev s ceno/trajanjem in gumbom "+"; desno teče stranski povzetek "Pregled termina" (Izberite storitev / Izberite izvajalca / Izberite termin), ki se sproti dopolnjuje. Storitev je mogoče odstraniti (gumb "-") - nakazuje možnost izbire **več storitev hkrati** v enem obrazcu.
  2. **"Izberite izvajalca"** - seznam zaposlenih, ki izvajajo izbrano storitev (če storitev nima izvajalca, se ta korak preskoči - videl sem opombo "Zaposleni ni potreben").
  3. **"Izberite termin"** - vodoravni trak dni v mesecu (samo delovni dnevi so klikljivi, ostali sivi/onemogočeni), pod njim mreža prostih terminov v 30-minutnih korakih (že zasedeni termini se ne prikažejo - preverjeno, da 12:00 termin, ki je bil zaseden v koledarju, ni bil ponujen). Če na izbrani dan ni prostih terminov, se prikaže sporočilo "Na ta dan žal ni prostega termina, lahko pa naredite rezervacijo na prvi prosti termin!" z bližnjico **"Na prvi prosti termin"**.
  4. **"Vaši podatki"** - Ime* (obvezno), Priimek* (obvezno), E-pošta (NI obvezna), Telefonska številka* (obvezna, z izbiro klicne kode) - **zanimiva UX odločitev: telefon je obvezen, e-pošta ne** (verjetno zaradi SMS opomnikov kot primarnega kanala). Desno je celoten povzetek rezervacije (storitev, izvajalec, datum/ura) in gumb **"Potrdi"**.
- ✅ Zgoraj desno izbirnik jezika (zastavica + koda), spodaj "Powered by Lime" (branding ponudnika - v lastni aplikaciji tega seveda ne bo).
- 👀 Ker Stripe ni povezan na tem računu, **nisem mogel preveriti, ali/kako se v obrazec vklopi korak plačila** (glej razdelek 7) - domnevam, da bi se pri povezanem online plačevanju pojavil dodaten korak plačila pred/po "Vaši podatki".
- ❌ Nisem zaznal captche/dodatnih varnostnih ovir na samem obrazcu (razen splošnega piškotnega soglasja) - prijava v admin del ima Cloudflare Turnstile zaščito, javni obrazec je videti brez nje.

---

## 6. Obvestila (email/SMS)

**Čemu služi:** avtomatska komunikacija s stranko ob spremembah termina in opomniki.

- ✅ Stran "Obvestila" ima iskanje in filtre **Vse / Aktivna / Neaktivna**, razdeljena v dva sklopa:
  - **SPREMEMBE TERMINOV**: "New appointment" (nov termin), "Rescheduled" (prestavljen), "Canceled" (odpovedan) - vsak s svojim stikalom vklop/izklop. *Opomba: imena teh treh so v angleščini kljub sicer slovenskemu vmesniku - videti je kot neprevedena mesta v aplikaciji.*
  - **OPOMNIKI IN SLEDENJA**: "Appointment reminder" (privzeto "Pošlji 1 dan pred začetkom termina") in "Appointment follow-up" ("Pošlji 1 dan po koncu termina"), oba s stikalom, plus gumb **"+ Dodaj opomnik ali sledenje"** za dodajanje lastnih, s poljubnim časovnim zamikom pred/po terminu (👀 - obrazec za dodajanje nisem odprl do konca).
- 👀 Nisem našel/odprl urejevalnika **vsebine** posameznega sporočila (predloge besedila, spremenljivke tipa {ime_stranke}, izbira e-pošta vs. SMS kanal) - v tej seji ni bilo vidne povezave "uredi predlogo" ob posameznem obvestilu; možno je to dostopno šele po vklopu stikala.
- ✅ Spodaj desno je bil viden števec **"0 / 0"** z opombo "Obdobje od 02.08.2026 do predvidoma 02.09.2026" - kaže, da je **pošiljanje obvestil (najverjetneje SMS in/ali email) omejeno/merjeno po mesečni kvoti** (tipično za plačljive pakete obvestil pri SaaS rezervacijskih orodjih). Za lastno aplikacijo je to pomemben podatek - stroški SMS/e-pošte je treba všteti v poslovni model.

---

## 7. Plačila / depoziti

**Čemu služi:** spletno plačevanje ob rezervaciji.

- ✅ Stran "Spletno plačevanje": povezava z **Stripe** (Stripe Connect) - logotip Lime ↔ Stripe, status "Spletno plačevanje ni vzpostavljeno", izbira "Tip podjetja" (v demo primeru "Samostojni podjetnik" - torej obstaja izbira pravne oblike, ki verjetno vpliva na Stripe KYC proces), gumb "Povezovanje Stripe računa" (odpre zunanji Stripe onboarding flow - nisem šel skozenj, ker bi to ustvarilo povezavo na resničen Stripe račun).
- ❌ Ker Stripe ni povezan, nisem mogel videti dejanskega vnosa cenika/depozitov, popustov/kuponov ali paketov/naročnin na plačilni strani - **teh funkcij (kuponi, paketi, naročnine) v celotnem raziskanem vmesniku nisem zaznal nikjer** (ne v Storitve, ne v Nastavitve, ne v Plačila). Možno gre za funkcionalnost, ki je na voljo šele po povezavi Stripe računa, ali pa je Lime Booking sploh nima (ima samo enkratno plačilo storitve ob rezervaciji preko Stripe).
- **Sklep za lastno aplikacijo:** Lime Booking plačilni del deluje izključno preko zunanjega procesorja (Stripe Connect) in ne razvija lastnega plačilnega sistema - to je verjetno tudi razumen pristop za novo aplikacijo (Stripe/druga slovenska plačilna platforma preko standardnega vtičnika), namesto gradnje lastnega plačilnega modula.

---

## 8. Nastavitve podjetja

**Čemu služi:** globalna pravila rezervacij, delovni čas, lokacije.

### Nastavitve (dashboard/settings) - 5 zavihkov
- ✅ **Povezave do form**: koda/link javnega obrazca (glej razdelek 5) + gumb "Shrani" (verjetno za dodatne parametre vdelave, ki jih nisem raziskal do konca).
- ✅ **Nastavitve naročanja**: stikali "Privzeto dovoli podvojene stranke na terminih" in "Pokaži kompleksni izbor časa (dnevi, ure, minute)".
- ✅ **Nastavitve prenaročanja**: **"Minimalno število ur pred prenaročanjem"** (24), **"Minimalno število ur pred odpovedjo"** (48), "Število ur pred terminom, ko odpoved šteje kot pozna" (prazno = ni pravila), stikalo "Ali lahko stranka vidi svoje pretekle termine?" (privzeto DA), stikalo "Omeji koliko terminov vnaprej lahko ima stranka rezerviranih" (privzeto izklopljeno).
- ✅ **Nastavitve pavz**: eno samo stikalo "Omeji dolžino malice" (verjetno omeji, koliko časa si zaposleni lahko vzame za malico pri samostojnem urejanju urnika).
- ✅ **Oznake zapiskov strank**: prazna tabela (Oznaka/Akcije) + "Dodaj novo oznako" - centralna administracija CRM oznak, ki se nato uporabljajo pri zapiskih strank in terminih.
- ❌/👀 **Nisem našel eksplicitnega globalnega nastavljanja "buffer časa med termini"** ali "min/max koliko časa vnaprej je mogoče rezervirati" - edina "min/max" pravila, ki sem jih našel, so vezana na PRENAROČANJE/ODPOVED (24h/48h), ne na prvotno rezervacijo. Možno je to nastavljeno na nivoju posamezne storitve v zavihku "Dodatno", ki pa je bil pri meni prazen/nedelujoč (glej razdelek 2) - to ostaja odprto vprašanje in ga je vredno posebej preveriti/predvideti v lastni specifikaciji, ker je to standardna in pomembna funkcija (npr. "buffer 15 min med termini", "rezervacija mogoča največ 60 dni vnaprej").

### Lokacije (dashboard/locations)
- ✅ Seznam lokacij + "Dodaj lokacijo". Urejanje lokacije: Naziv, Naslov, Država, Mesto, Telefon, **Čas odprtja / Čas zaprtja**, Jezik, Časovni pas, Valuta, Slike (do 10, "prikazane na spletni formi IN v Lime Marketplace" - torej ima Lime svoj javni imenik/marketplace ponudnikov, kamor se lokacije lahko uvrstijo), stikalo **"Prazniki in dela prosti dnevi"** (vklopi prikaz praznikov), stikalo **"Onemogoči naročanje"** na dela prosti dnevi, "Uredi zaporedje zaposlenih" (vrstni red prikaza osebja na tej lokaciji).
- ✅ Potrjeno: **večlokacijsko poslovanje je prvorazredno podprto** - izbirnik lokacije je na koledarju, zaposleni se lahko dodeli več lokacijam, urniki so vezani na lokacijo, plačila/nastavitve pa so na nivoju celotnega računa (ne po lokaciji, kolikor je bilo videno).

---

## 9. Poročila / statistika

**Čemu služi:** analitika prihodkov, zasedenosti in vedenja strank.

- ✅ Stran "Analitika" ima 3 zavihke - **Splošno**, **Termini**, **Zaposleni** - z enotnimi filtri (Lokacija, Storitev) in izbiro obdobja (1D/7D/1M/1L + poljuben razpon prek koledarske ikone).
- ✅ **Splošno**: graf "Povprečni prihodki po dnevih" (primerjava izbranega/preteklega/prihodnjega obdobja), kartice **Skupaj prihodki**, **Povprečna vrednost termina**, **Napovedani prihodki** (s trend puščico - napoved na podlagi že rezerviranih prihodnjih terminov).
- ✅ **Termini**: tortni prikaz "Odstotek novih strank", kartice **Skupaj terminov**, **Skupaj strank**, **Skupaj novih strank**, **Termini preko spletne forme** (ločeno šteje termine, ustvarjene preko javnega obrazca, od tistih, ki jih je vnesel administrator - pomembna metrika za merjenje učinka samopostrežnega naročanja).
- ✅ **Zaposleni**: izbirnik "Vsi zaposleni"/posamezni zaposleni, nato tri skupine metrik na zaposlenega:
  - *Splošna analitika*: Prihodki, Povp. prihodki na termin, Št. strank, Št. strank preko spleta, Št. terminov, Št. terminov preko spleta, **Izgubljeni prihodki zaradi neprihodov** (potrjuje, da se **no-show finančno spremlja**).
  - *Podatki o delu*: Skupaj delovnih ur, Dejanski čas izvajanja storitev, Malica, Dopusti, Bolniške, Pavze, Ostalo (razčlenitev izrabe delovnega časa).
  - *Podatki o terminih*: Št. prenaročanj (+ ločeno po kanalu koledar/splet), Št. odpovedi (+ ločeno po kanalu koledar/splet).
- 👀 Same številke so bile v demo računu prazne/0 (ni prometa), zato natančne oblike prikaza podatkov (npr. tabela po posameznem zaposlenem) nisem mogel v celoti preizkusiti - a nabor razpoložljivih metrik je jasno razviden iz oznak polj.

---

## 10. Integracije

To je bil poseben fokus zaradi kasnejše povezave na TRONxERP.

- ✅ **Stripe** (plačila) - edina neposredno vidna integracija tretje osebe v vmesniku (Stripe Connect onboarding, glej razdelek 7).
- ✅ **Javni widget/link** (`form.lime-booking.com/sl/{koda}`) - to je najbolj univerzalen "integracijski" mehanizem: gre za samostojen URL, ki ga je mogoče vdelati (iframe) na obstoječo spletno stran ali deliti kot povezavo/gumb "Rezerviraj".
- ✅ **"Povezava za prenaročanje"** - unikaten link na posamezno stranko/termin za samopostrežno prenaročanje (uporabno npr. v e-poštnih opomnikih).
- 👀 Omemba **"Lime Marketplace"** (pri slikah lokacije) - kaže na to, da ima Lime svoj javni imenik ponudnikov (podoben Booksy/Treatwell), kar pa ni "integracija" v smislu ERP/API, ampak marketing kanal znotraj Lime ekosistema.
- ❌ **Nisem našel**: sinhronizacije z Google/Outlook koledarjem, Zapier integracije, javne REST API dokumentacije ali nastavitev webhookov kjerkoli v raziskanem vmesniku (10 postavk glavnega menija je izčrpno pregledanih: Koledar, Stranke, Analitika, Lokacija, Storitve, Osebje, Urniki, Splošne nastavitve, Obvestila, Spletna plačila - nobena od njih ne vsebuje razdelka "Integracije"/"API"/"Webhooks"). Prav tako v uporabniškem meniju (spodaj levo: Podpora / Nastavitve zasebnosti / Odjava) ni bilo ničesar API-povezanega.
- **Ključna ugotovitev za ERP povezavo:** Lime Booking (vsaj v tem naročniškem paketu/računu) **nima uporabniku vidnega API/webhook centra**. Če bi želeli povezati Lime Booking na TRONxERP, bi bilo najverjetneje treba (a) kontaktirati podporo Lime za dostop do partnerskega/razvijalskega API-ja (če obstaja na višjem paketu), ali (b) narediti integracijo posredno preko podatkov, ki so izvozljivi/vidni v vmesniku. Za **lastno aplikacijo** to pomeni, da je od začetka smiselno načrtovati odprt REST API in/ali webhooke (nov termin, sprememba, odpoved, nova stranka) kot prvorazredno funkcionalnost - ravno to je element, kjer bo lastna rešitev boljša od Lime Booking za namene povezave z internim ERP-jem.

---

## 11. Uporabniške vloge / pravice

- 👀 V testiranem računu obstaja samo en uporabnik (lastnik/administrator, hkrati edini "zaposleni"). Pri urejanju tega uporabnika je viden napis **"Urejanje dovoljenj ni mogoče"** s puščico - to potrjuje, da **sistem vlog/pravic v aplikaciji obstaja**, vendar ga (verjetno ker gre za edinega/lastniškega uporabnika, ki mu pravic ni mogoče omejiti) v tej seji ni bilo mogoče odpreti in videti dejanskih vlog (npr. "administrator" vs. "zaposleni z omejenim dostopom"). Ustvarjanje drugega uporabnika (kar bi to razkrilo) bi pomenilo trajen poseg v pravi račun, zato tega nisem naredil.
- ❌ Ni bilo mogoče ugotoviti natančnega nabora pravic (npr. ali zaposleni vidi samo svoj koledar, ali ima dostop do cen/prihodkov drugih ipd.) - to ostaja odprto vprašanje, ki bi ga bilo vredno preveriti neposredno pri Lime Booking podpori, če bi bilo to relevantno za primerjavo, sicer pa mora lastna aplikacija to zasnovati po lastni presoji (priporočilo: vsaj 2-3 nivoji - lastnik/administrator, vodja lokacije, izvajalec z omejenim dostopom na svoj urnik/svoje stranke).

---

## 12. Mobilna aplikacija / PWA

- ❌ V celotnem raziskanem admin vmesniku (vključno z nastavitvami, uporabniškim menijem "Podpora"/"Nastavitve zasebnosti") **nisem zasledil nobene omembe mobilne aplikacije, PWA namestitve ali povezave na App Store/Google Play**. Prijavna stran in dashboard sta responzivna spletna aplikacija, a eksplicitne mobilne app ponudbe ni bilo videti.

---

## Ključne ugotovitve za lastno aplikacijo

Povzetek mehanizmov, ki so v Lime Booking dobro rešeni in jih velja prenesti, ter pasti, na katere velja biti pozoren:

1. **Ločitev "delovni čas" vs. "čas za rezervacije"** (razdelek 3, Urniki) - zelo koristen koncept: zaposleni je lahko fizično prisoten dlje, kot je na voljo za rezervacije strank (npr. rezervira zadnjih 30 min za administrativno delo). Priporočam prenesti v novo aplikacijo.

2. **Termin z več storitvami hkrati** (razdelek 1 in 5) - tako v adminu kot na javnem obrazcu je mogoče v en termin dodati več storitev z enim skupnim seštevkom časa/cene. To bistveno poveča fleksibilnost glede na en-termin-ena-storitev model.

3. **Kanal-atribucija terminov** (razdelek 9) - dosledno ločevanje "prek spleta" vs. "prek koledarja (ročno)" pri terminih, prenaročanjih in odpovedih je odlična praksa za merjenje učinka samopostrežnega naročanja - vredno vgraditi od začetka v podatkovni model (ne dodajati naknadno).

4. **Finančno spremljanje no-show** ("Izgubljeni prihodki zaradi neprihodov") - preprost, a močan KPI, ki ga velja imeti v poročilih od začetka.

5. **UX past pri javnem obrazcu**: e-pošta ni obvezna, telefon je - kaže na to, da je SMS/telefon primarni kanal komunikacije s stranko v tovrstnih poslovanjih (frizerstvo/storitve). Za lastno aplikacijo velja premisliti enako logiko in od začetka predvideti SMS opomnike (ne le e-pošto), čeprav to prinaša strošek na sporočilo (glej točko 7 spodaj).

6. **Ločen "buffer/pravila rezervacije" del je bil presenetljivo skromen** - Lime Booking ima jasna pravila za PRE-naročanje/odpoved (min. ur vnaprej), a nisem našel enostavnega globalnega mesta za "buffer čas med termini" ali "koliko dni vnaprej je najkasneje/najzgodnejše mogoče rezervirati" (za samo prvotno rezervacijo). Če to v Lime Booking dejansko obstaja, je skrito/na nedelujočem mestu (prazen zavihek "Dodatno" pri storitvi) - to je **priložnost, da lastna aplikacija to naredi bolje in bolj vidno** (npr. jasna nastavitev "min. X ur vnaprej", "maks. Y dni vnaprej", "buffer Z minut med termini" - globalno in/ali po storitvi).

7. **Notifikacije so plačljiva/omejena kvota** (razdelek 6) - pri načrtovanju lastne aplikacije je treba od začetka predvideti strošek pošiljanja SMS/e-pošte (ponudnik, cena na sporočilo, morebitna mesečna kvota) kot del poslovnega modela, ne kot naknadno dodano funkcijo.

8. **Plačila prek zunanjega procesorja (Stripe Connect), ne lastna gradnja** - smiselno je slediti istemu vzorcu (npr. Stripe ali slovenski ekvivalent) namesto gradnje lastnega plačilnega sistema.

9. **Odprt API/webhooki manjkajo pri Lime Booking** - to je hkrati past (če bi šlo za odločitev "kupiti ali povezati obstoječi Lime Booking na ERP", bi bila povezava težavna) in **priložnost za lastno aplikacijo**: ker je cilj povezava na TRONxERP, je smiselno API/webhook plast (novi/spremenjeni/odpovedani termini, nove stranke, spremembe cenika) zasnovati kot temeljni gradnik arhitekture, ne kot dodatek na koncu.

10. **Kartica stranke kot "mini CRM"** (razdelek 4) - združuje zgodovino terminov (s statusnimi filtri), proste zapiske z oznakami in analitiko na enem mestu. Dober referenčni model za modul "Stranke" v lastni aplikaciji.

11. **Prazen/nedelujoč zavihek "Dodatno" pri storitvi** je opomnik, da je pri lastni specifikaciji treba eksplicitno definirati, ali/kako bodo podprti dodatki (add-oni), vezava na vire/opremo in buffer-pravila na nivoju storitve - v Lime Booking to očitno ni (ali ni bilo) v celoti dostopno, zato ne moremo slepo kopirati "kar je pri konkurenci", ampak moramo to načrtovati na novo.

12. **Sistem vlog obstaja, a v tem računu ni bil viden do konca** - pri lastni aplikaciji je treba vloge/pravice (lastnik, vodja lokacije, izvajalec) zasnovati eksplicitno, ker referenčnega zgleda iz te analize nismo dobili v celoti.
