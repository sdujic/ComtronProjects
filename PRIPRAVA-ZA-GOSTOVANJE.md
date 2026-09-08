# Priprava za gostovanje na spletu

Ta dokument pove, kaj je **že pripravljeno** za javno objavo aplikacije, kaj je treba **obvezno urediti pred** tem, in **korak-za-korakom pot**, če se odločiš za najlažjo/priporočeno kombinacijo (Vercel ALI Netlify + brezplačna PostgreSQL baza - glej razdelka 4 in 5, postopek je skoraj identičen). Dejanske objave (ustvarjanje računov, potiskanje kode, klik na "Deploy") NISEM izvedel - za to je potreben tvoj račun na izbrani platformi, jaz sem pripravil vse, da je ta korak čim krajši, ko se odločiš.

## 1. Kaj je že pripravljeno

- **Koda je preverjena in se pravilno zgradi** (`npm run build`) - ni znanih napak pri prevajanju.
- **Git repozitorij je pripravljen lokalno** (`NarocanjeAplikacija/.git`) - zadnji commit vsebuje vse dosedanje funkcionalnosti, vključno z interaktivnimi navodili (`Navodila-NarocanjeNaTermin.html`).
- **Podatkovni model je pripravljen na PostgreSQL** brez sprememb kode - trenutno teče na SQLite (`prisma/schema.prisma`, `provider = "sqlite"`) samo zato, ker je bilo to najhitreje za razvoj na tem računalniku. Preklop je ena beseda (glej razdelek 3).
- **Vse nastavitve okolja so dokumentirane** v `app/.env.example` in `app/README.md` (razdelek "Nastavitve / spremenljivke").
- **Prijava v admin je zaščitena** (glej `app/README.md`, razdelek "Prijava v admin").
- **Admin vmesnik je dosleden in robusten** - urejanje z dvoklikom (ne le dodaj/izbriši) je na voljo na vseh seznamih (zaposleni, storitve, lokacije, delovna mesta, urniki, stranke), brisanje je idempotentno (ne vrže napake, če je zapis medtem že izginil), urnik ima vgrajeno zaščito pred neveljavnim časom rezervacij.

## 2. Varnostni pregled - obvezno pred javno objavo končnim strankam

Trenutne testne vrednosti so namenjene SAMO lokalnemu testiranju - preden je aplikacija dostopna na internetu komurkoli, nujno popravi:

| Kaj | Zdaj (testno) | Kaj narediti pred javno objavo |
|---|---|---|
| `ADMIN_PASSWORD` | `123` | Nastavi pravo, močno geslo |
| `ADMIN_SESSION_SECRET` | testni privzeti niz | Nastavi dolg naključen niz (npr. `openssl rand -hex 32`) |
| Baza | SQLite (datoteka) | PostgreSQL (glej spodaj) - SQLite ne deluje zanesljivo na serverless gostovanju (Vercel, Netlify) |
| `NODE_ENV` | development/lokalno | Na produkcijskem gostovanju je to samodejno `production` - preveri, da je piškotek za prijavo takrat označen kot `secure` (že je, glej `src/lib/admin-auth-actions.ts`) |

**Dodatno, vredno vedeti (ni nujno za kratek test, a bodi pošten do strank):**
- Ni e-poštnih/SMS obvestil strankam o potrditvi/zavrnitvi termina - to bo treba dodati, preden gre v resnično uporabo, ne le test.
- `Stranka.soglasjeObvestila` (GDPR soglasje) obstaja v podatkovnem modelu, a na javnem obrazcu trenutno ni prikazano kot kljukica, ki bi jo stranka potrdila - za pravi test s končnimi strankami razmisli, ali ga je treba dodati.

## 3. Preklop iz SQLite na PostgreSQL

1. V `app/prisma/schema.prisma` spremeni:
   ```prisma
   datasource db {
     provider = "postgresql"   // prej "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. Nastavi `DATABASE_URL` v `.env` (lokalno za test) ali na hosting platformi (za produkcijo) na pravo PostgreSQL povezavo, npr.:
   ```
   DATABASE_URL="postgresql://uporabnik:geslo@gostitelj:5432/narocanje?schema=public&sslmode=require"
   ```
3. Ustvari sheme v novi bazi in testne podatke:
   ```bash
   npx prisma migrate dev --name init
   npx tsx prisma/seed.ts
   ```
   (`migrate dev` ustvari tudi datoteko z migracijo v `prisma/migrations/` - to je treba narediti enkrat, PRED prvim deployem, ker bo produkcija kasneje uporabljala `npx prisma migrate deploy`, ki samo izvede že pripravljene migracije, ne ustvarja novih.)

## 4. Priporočena pot: Vercel + Neon (ali Supabase) - brezplačno za test

Ta pot je najhitrejša za Next.js aplikacije in nima stroškov za manjši testni obseg.

### Korak 1 - GitHub repozitorij
1. Na [github.com](https://github.com) ustvari nov, **zaseben** repozitorij (npr. `narocanje-na-termin`).
2. V mapi `NarocanjeAplikacija` (kjer je že pripravljen git repozitorij):
   ```bash
   git remote add origin https://github.com/<tvoj-uporabnik>/narocanje-na-termin.git
   git push -u origin master
   ```

### Korak 2 - PostgreSQL baza (Neon)
1. Ustvari brezplačen račun na [neon.tech](https://neon.tech) (ali [supabase.com](https://supabase.com) - postopek je zelo podoben).
2. Ustvari nov projekt/bazo - Neon takoj ponudi pripravljen `DATABASE_URL` (kopiraj ga).
3. Lokalno (na tem računalniku) začasno nastavi ta `DATABASE_URL` v `.env`, izvedi korak 3 zgoraj (`migrate dev` + `seed`), da baza dobi strukturo in testne podatke.

### Korak 3 - Vercel
1. Ustvari brezplačen račun na [vercel.com](https://vercel.com), poveži svoj GitHub račun.
2. "Add New Project" → izberi repozitorij `narocanje-na-termin` → Root Directory nastavi na `app` (ker je Next.js projekt v podmapi, ne v korenu repozitorija).
3. Pod "Environment Variables" dodaj VSE spremenljivke iz `app/.env.example`, z resničnimi (ne testnimi) vrednostmi - vsaj: `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`. TRONxERP spremenljivke pusti prazne/izpuščene, če prave integracije še ne testirate (aplikacija samodejno pade nazaj na mock).
4. Klikni "Deploy". Po nekaj minutah dobiš javen naslov (npr. `narocanje-na-termin.vercel.app`).

### Korak 4 - Preveri
1. Odpri dobljen naslov - vstopna stran se mora naložiti.
2. Prijavi se v `/admin` s pravim `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
3. Naredi eno testno rezervacijo prek `/rezervacija` in preveri, da se prikaže v `/admin/koledar`.

### Korak 5 - Lastna domena (neobvezno)
Če želiš npr. `narocanje.comtron.si` namesto `...vercel.app`, na Vercel projektu pod "Domains" dodaš domeno, nato pri Comtronovem DNS ponudniku dodaš CNAME zapis, kot ga Vercel navede - to zahteva dostop do DNS nastavitev za comtron.si.

## 5. Alternativa: Netlify namesto Vercel

Netlify prek uradnega "Next.js Runtime" vtičnika (`@netlify/plugin-nextjs`) podpira vse, kar ta aplikacija uporablja - App Router, Server Actions (vse "Dodaj"/"Uredi"/"Izbriši" akcije), in middleware (`src/middleware.ts`, preverjanje prijave v `/admin`). Koraki 1-2 (GitHub repozitorij, PostgreSQL baza) so IDENTIČNI razdelku 4 zgoraj - razlikuje se samo korak s samim hosting projektom:

### Namesto Koraka 3 (Vercel) - Netlify projekt
1. Ustvari brezplačen račun na [netlify.com](https://netlify.com), poveži GitHub.
2. "Add new site" → "Import an existing project" → izberi repozitorij `narocanje-na-termin`.
3. Netlify samodejno zazna Next.js in ponudi namestitev "Next.js Runtime" vtičnika - potrdi (privzeta, brez tega App Router/Server Actions ne bi delovali).
4. Ker je Next.js projekt v podmapi `app/`, ne v korenu repozitorija, pod "Site settings → Build & deploy → Build settings" nastavi **Base directory** na `app` (isti pomen kot Vercelov "Root Directory"). Build command in Publish directory pusti privzeta (vtičnik ju nastavi sam).
5. Pod "Environment variables" dodaj iste spremenljivke kot za Vercel (`DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, TRONxERP po potrebi).
6. Klikni "Deploy site" - dobiš naslov oblike `nekaj-ime.netlify.app`.
7. **Pred prvim obiskom aplikacije ročno izvedi `npx prisma migrate deploy`** proti isti produkcijski bazi (enako kot pri Vercelu) - Netlify tega ne naredi sam ob buildu.

### Preveri delovanje
Enako kot Korak 4 zgoraj (odpri naslov, prijava v `/admin`, testna rezervacija prek `/rezervacija`) - po prvem deployu posebej preveri, da neprijavljen obisk `/admin` pravilno preusmeri na `/prijava` (to teče kot Netlify Edge Function - preverjeno delovanje, a vredno enkratne potrditve po prvem deployu na tej konkretni platformi).

### Če build javi napako o Prisma Client
Redko, a če se zgodi ("`@prisma/client` did not initialize" ipd.), dodaj v `app/package.json` v `"scripts"` eksploziten `"postinstall": "prisma generate"` - to prisili generiranje ob vsakem `npm install`, ne glede na to, kako gostiteljev build proces obravnava Prisma-jeve lastne postinstall kljuke.

Lastna domena (Korak 5 zgoraj) deluje enako - na Netlify projektu pod "Domain management" namesto Vercelovega "Domains".

## 6. Če imate raje obstoječo Comtron infrastrukturo

Če želite aplikacijo gostiti na že obstoječem strežniku (VPS, Docker ipd.) namesto na Vercelu/Netlifyju, mi povejte, kaj je na voljo (Linux/Windows strežnik, Docker, ali "gol" Node.js), pa pripravim natančnejša navodila zanj - splošno gledano aplikacija potrebuje: Node.js 18+, dostop do PostgreSQL baze, možnost nastavitve okoljskih spremenljivk in reverse proxy (nginx/Caddy) za HTTPS.

## 7. Za nadaljnji razvoj/predajo

Za splošno orientacijo po celotnem projektu (arhitektura, znane omejitve, poslovne odločitve) glej `PREDAJA-PROGRAMERJU.md` - ta dokument je bil pripravljen za morebitno predajo razvijalcu in ostaja veljaven tudi za gostovanje.
