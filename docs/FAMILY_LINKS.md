# Rodinné prepojenia — 30. október 2026

Rodinná správa používa existujúce `guardian_players`, administrátorský detail člena a RPC `guardian_dashboard`. Nepribudla druhá evidencia ani migrácia.

## Pravidlá a používateľský tok

- Administrátor na profile rodiča vyhľadá hráča, prepojí ho alebo zruší konkrétnu väzbu. Každý zápis overuje server a RLS; databáza vyžaduje zodpovedajúce roly a odmieta duplicity. Súpis má stránky po 25 a posledný kurzor je UUID hráča.
- Rodič vidí iba aktívne prepojené deti s hráčskou rolou, po štyroch. Dostáva vlastný program, účasť a finančný súhrn pre každé dieťa. Tlačidlá správy väzieb ani členský adresár sa mu nezobrazujú.
- Trénerstvo nepridáva právo spravovať rodinu. Pri kombinácii tréner/rodič zostáva rodičovský finančný rozsah vzťahovo obmedzený.
- Po odpojení sa pri ďalšom čítaní zruší prístup bez obnovy JWT. Už otvorená stránka nie je živý odber zmien; nové čítanie/mutácia rešpektujú aktuálny stav.
- Prázdna pokračovacia stránka už netvrdí, že používateľ nemá prepojené deti. Zobrazí „Na tejto stránke už nie sú žiadne deti“ a pokyn vrátiť sa cez `Na začiatok`. Skutočne prázdny úvodný zoznam má pôvodný text o priradení správcom. Neplatný kurzor sa neprekladá do PostgREST filtra.

## Živá evidencia

`scripts/live-family-links.mjs` prešiel **18/18 kontrol**, sanitizovaný report je `test-results/live-family-links.json`.

| Oblasť | Overený výsledok |
| --- | --- |
| Admin pagination | 26 väzieb, 25 + 1 bez duplicít, mená dostupné v join dotaze používanom stránkou. |
| Parent pagination | Existujúca rodina + päť nových fiktívnych detí, úplné stránky po štyroch, stabilný celkový počet. Prázdna stránka za koncom zachová total. |
| Súkromie | Cudzí kurzor nesprístupní cudzie dieťa. Rodič nevidí väzby druhého rodiča, ani keď majú spoločné dieťa. Cudzí profil je skrytý. |
| Mutácie | Duplicitná väzba vráti `23505`. Rodič, tréner a hráč nevytvoria ani neodstránia väzbu; kontrolné čítanie potvrdí nezmenených päť testovacích väzieb. |
| Revokácia | Admin odstráni jednu novú väzbu; rodič okamžite stratí profil a rodinný súhrn tohto dieťaťa pri nezmenenom JWT. Druhý rodič si svoju väzbu zachová. |

Všetky zápisy používajú normálne Auth/PostgREST a publishable key. Nové fixtures: 26 hráčskych profilov a jeden rodičovský profil bez Auth účtu; 26 väzieb nového rodiča a päť k existujúcemu fiktívnemu rodičovskému účtu, z ktorých jedna je zámerne odpojená. Existujúce rodinné väzby sa nemenili. Bez e-mailov, service-role zápisov alebo DDL. Záznamy zostávajú na teste.

## Autentifikovaný T3

Lokálny produkčný build, živý testovací Supabase, administrátor a rodič:

1. Desktop 1280 × 800: správcovský súpis zobrazuje 25 detí a ďalšiu stránku s jedným. Mobil 390 × 844: odpojenie tohto posledného fiktívneho dieťaťa nechá prázdnu pokračovaciu stránku s návratom. Test prijal potvrdzovací dialóg pre jediný fiktívny unlink; nesimuloval databázový výsledok.
2. Vyhľadanie toho istého hráča, opätovné prepojenie, potvrdenie úspechu a nové načítanie stránky zachovali jeho meno/väzbu. Pôvodných 26 väzieb nového testovacieho rodiča je obnovených.
3. Rodičovský mobilný prehľad: prvá aj druhá stránka po štyroch, bez tlačidiel link/unlink a členskej/admin navigácie. Bez horizontálneho pretekania.
4. Platný kurzor za koncom zoznamu ukázal opravený text. `Na začiatok` skutočne obnovilo prvé štyri deti. Priama URL dieťaťa odpojeného v API teste skončila slovenskou nedostupnou stránkou bez jeho mena.

Ide o desktopový prehliadač s emulovanou šírkou, nie fyzický telefón ani čítačku. Nie je to úplná browser kombinatorika všetkých rolí ani dôkaz finančných opráv; tie sú ďalším bodom roadmapy.

## Lokálna regresia a bezpečné spustenie

**412/412 testov v 21 súboroch**, typecheck, lint a produkčný build Next.js 16.4.2 prešli. Nový test najprv reprodukoval zavádzajúci prázdny stav; po oprave prešli oba prázdne stavy. Štyri rolové kombinácie overujú zákaz link/unlink pred DB dotazom. Existujúce PGlite testy rodinného rozsahu zostávajú samostatnou lokálnou vrstvou.

```powershell
node --use-system-ca scripts/live-family-links.mjs --write-test-data
```

Spustenie vyžaduje presný `LIVE_TEST_PROJECT_URL`, štyri pripravené `LIVE_*` testovacie účty a overenú migračnú históriu nie staršiu než hodinu, bez čakajúcich/neznámych migrácií. Nový checkpoint `test-results/live-family-state.json` sa rezervuje exkluzívne pred zápisom. **Dokončený/prerušený beh automaticky neopakovať, checkpoint nemažte na reseedovanie.** Kontrolný opakovaný pokus bol odmietnutý a hash úspešného reportu ostal rovnaký. Checkpoint obsahuje testovací cieľ/IDs; nevypisovať ani necommitovať súkromné testovacie súbory.

30. októbra Management kontrola vrátila **401**. Explicitný priamy TLS/read-only preflight s kontrolou cieľa a certifikátu potvrdil **23 aplikovaných / 0 čakajúcich**. Žiadna migrácia nebola potrebná. Ďalej finančné detaily/opravné zápisy a nastavenia/notifikácie; SMTP, fyzické zariadenia, zálohy a deployment zostávajú oddelené brány.
