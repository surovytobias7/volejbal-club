# Živá akceptácia dochádzky a poznámok — 27. 10. 2026

## Rozsah a cieľ

Overenie používa potvrdený testovací Supabase a výhradne fiktívne účty. Lokálna produkčná zostava Next.js komunikuje so skutočným Auth/PostgREST. Nie je to nasadenie ani úplná produkčná akceptácia.

Nový Management token funguje. Štyri chýbajúce migrácie boli 26. októbra po kontrole presného prefixu, SQL účinkov a RLS aplikované transakčne spolu s históriou, následne overené čítaním a obnovením PostgREST schémy. Dôkaz: ignorovaný `test-results/migrations-applied.json`. Pri pokračovaní 27. októbra už vetva aj test obsahovali ďalšiu migráciu `20261026191818_attendance_conflict_response.sql`; nebola znovu aplikovaná. `npm run db:status` potvrdil **23 aplikovaných, 0 čakajúcich migrácií**. Bez resetu alebo produkčných zápisov.

## Auth a databázové mutácie

- `npm run live:check`: **11/11**, `npm run test:live`: **64/64** (26. október, aktualizovaný kontrakt vrátane `viewer_context`). Reporty: `live-preflight.json`, `live-accounts.json` v ignorovanom `test-results/`.
- Nový `scripts/live-attendance-notes.mjs` vytvára izolovaný tím, trénera a tréningy. Klubové zápisy používajú prihlásené roly a RLS; administrátorský Auth kľúč slúži iba na vytvorenie fiktívneho účtu bez odoslania e-mailu.
- Prvý beh: **11 úspešných kontrol**, potom neúspešná zastaraná požiadavka testu na kód `40001`. Aktuálna migrácia správne vracia `PT409` / HTTP 409. Pôvodný neúspešný report zostal v `live-attendance-notes-initial.json`; nejde o úplne úspešný beh.
- Po oprave očakávania pokračovanie z uloženého bodu: **21/21**, report `live-attendance-notes.json`. Spolu oba behy doložili **31 odlišných úspešných kontrol** (kontrola vstupných rolí sa opakovala). Úvodné zápisy sa zbytočne neopakovali.

Overené hranice:

| Oblasť | Živý výsledok |
| --- | --- |
| Dochádzka | Hromadné uloženie, nezmenená plánovaná dostupnosť, bezpečné opakovanie, rollback neplatnej dávky, vlastné/rodinné čítanie a odmietnutie neoprávnených zápisov. |
| Súbeh dochádzky | Dve nezávislé Auth relácie odoslali rovnakú verziu: jeden úspech, jeden `PT409` / HTTP 409. |
| Interné poznámky | Vytvorenie a čítanie hráčskej aj tréningovej poznámky. Druhý priradený tréner číta, ale nemení cudziu poznámku. Hráč, rodič a nepriradený tréner nemajú tabuľkové/RPC čítanie ani vytvorenie. |
| Súbeh a audit poznámok | Autor a správca súbežne upravia rovnakú verziu: zmení sa presne jeden riadok. Následná oprava správcu zachová starý/nový obsah v audite. |
| Revokácia | Autor stráca čítanie poznámok a zápis dochádzky po odobratí trénerstva; deaktivácia uzatvorí klubový kontext. Overená nezmenená hodnota JWT. Dočasná deaktivácia/priradenie trénera boli obnovené. |
| História | Oprava po odchode hráča z tímu aj po deaktivácii; zachovaný audit. Zrušený tréning odmietne ďalší zápis. |

## Autentifikovaný T3 prehliadač

Kontroly 27. októbra na lokálnej produkčnej zostave, so skutočným testovacím Supabase:

- Tréner na 1280 × 800 označil všetkých prítomných, hráčovi nastavil meškanie a uložil dávku. Po obnovení stránky zostalo 1 prítomný / 1 meškanie; dostupnosť zostala bez odpovede.
- Vytvorenie tréningovej poznámky, úprava pri 390 × 844 a opätovné načítanie potvrdili persistenciu textu. Mobilný dokument nepretekal vodorovne; T3 snímkovanie už funguje.
- Hráč vidí iba svoju účasť, rodič iba aktuálne prepojené dieťa v tomto tréningu. Interné poznámky ani trénerské ovládanie sa nezobrazujú. Priamy vstup oboch rolí do `/klub/clenovia` je odmietnutý.
- Nájdená anglická predvolená 404 bola nahradená slovenskou stránkou nedostupného obsahu s návratom na prehľad. Klubová vetva zachováva navigáciu; verejná stránka používa oficiálne logo a existujúce typografické/prvkové štýly. Odpoveď nerozlišuje neexistujúci a neoprávnený záznam.
- Prihlásenie prešlo skutočnou Next Server Action; jednorazový loopback pomocník držal heslá mimo nástrojových argumentov a výstupov. Po kontrole boli používateľské relácie odhlásené a pomocník zastavený.

Toto je emulovaný mobilný viewport v T3, nie fyzické zariadenie ani čítačka obrazovky. Staršie Electron diagnostické chyby a prerušené prefetch požiadavky neboli vydávané za čistý konzolový audit.

## Bezpečné spustenie runnera

V súkromnej `.env.live.local` musia byť existujúce fiktívne účty `LIVE_ADMIN_*`, `LIVE_COACH_*`, `LIVE_GUARDIAN_*`, `LIVE_PLAYER_*` a presný `LIVE_TEST_PROJECT_URL`. Potrebný je aj súkromný `test-results/club-demo-state.json` s nepriradeným fiktívnym trénerom pre rovnaký cieľ. Auth administrátorský kľúč zostáva v lokálnom prostredí.

```powershell
node --use-system-ca scripts/live-attendance-notes.mjs --write-test-data
```

Runner odmietne odlišný cieľ, chýbajúci príznak alebo existujúci stav. **Dokončený beh nespúšťať znova vymazaním stavu.** `--resume-notes` je úzky bod obnovy pred prvou poznámkou, nie všeobecné opakovanie. Existujúci dokončený stav sa odmieta aj v tomto režime. Pri chybe sa pokúsi obnoviť dočasne odobratý prístup a odhlásiť vlastné relácie; zlyhanie obnovy je neúspešná kontrola.

Súkromný `test-results/live-attendance-notes-state.json` obsahuje prihlasovacie údaje a identifikátory fixtures: nikdy ho nevypisovať ani necommitovať. Sanitizované reporty ich neobsahujú. Záznamy zostávajú na teste pre audit a nadväzujúce kontroly; dieťa A je úmyselne neaktívna historická fixture. Žiadne automatické mazanie účtov alebo záznamov.

## Zostávajúca akceptácia

1. Poznámky: živé stránkovanie, hranične dlhý text, chyba spojenia, zachovanie textu pri konflikte v prehliadači a overenie neprítomnosti notifikácií hráčom/rodičom. Súbeh API nie je dôkaz zachovania formulára.
2. Dochádzka: celý prehliadačový konflikt/obnova, väčší súpis a súbeh presunu udalosti so vznikom súkromného záznamu.
3. Ďalší bod roadmapy: autentifikované rodinné prepojenia a ich stránkovanie, finančné detaily/opravné zápisy, nastavenia a notifikácie.
4. Samostatné brány: SMTP/doména a doručenie, hosted obnova pozvánky, fyzický mobil, čítačka obrazovky, obnova zálohy a nasadenie.
