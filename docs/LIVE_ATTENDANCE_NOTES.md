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

1. Poznámky: nižšie uvedené hraničné scenáre sú dokončené. Dlhodobý výpadok siete a strata odpovede až po DB commite ostávajú samostatnými odolnostnými kontrolami.
2. Dochádzka: prehliadačový konflikt/obnova a 30-členný súpis sú dokončené v rozsahu nižšie. Ostáva súbeh presunu udalosti so vznikom súkromného záznamu a nový browser scenár odobratia trénerstva.
3. Ďalší bod roadmapy: autentifikované rodinné prepojenia a ich stránkovanie, finančné detaily/opravné zápisy, nastavenia a notifikácie.
4. Samostatné brány: SMTP/doména a doručenie, hosted obnova pozvánky, fyzický mobil, čítačka obrazovky, obnova zálohy a nasadenie.

## Hranice poznámok — 28. október

`scripts/live-notes-boundaries.mjs`: **17/17 úspešných kontrol**, sanitizovaný report `test-results/live-notes-boundaries.json`. Používa existujúce Auth roly a presne overenú fiktívnu udalosť/tím/hráča; nový tréning a 52 poznámok zostali na teste. Žiadne mazanie, migrácie, service-role zápisy alebo odoslanie e-mailu.

- Pre hráča aj tréning: 26 nových poznámok, všetky načítané kurzorom bez duplicít aj pri rovnakom čase vytvorenia, presný 4 000-znakový text; 4 001 znakov odmietne databázový constraint.
- Hráč a rodič nedostanú poznámky ani pri odoslaní platného kurzora získaného trénerom. Autorizovaná oprava zvýši verziu. Po vytvorení a úpravách zostal počet ich upozornení nezmenený; notifikácie vytvorenia testovacej udalosti boli pred meraním.
- Autentifikovaný T3, dve okná rovnakého trénera: druhé okno uloží verziu 2; prvé so starou verziou zachová návrh a zobrazí nový text, blokuje submit do explicitného rozhodnutia. Mobil 390 × 844: výber uloženého textu, vrátenie pôvodného návrhu a úspešné uloženie verzie 3.
- Jednorazovo simulované odmietnutie browser POST pred odoslaním: text/verzia zostali, pending sa ukončil a slovenská chyba bola viditeľná. Ďalší reálny POST uspel s verziou 4; reload potvrdil presný text. Nejde o reálny Supabase outage ani stratenú odpoveď po commite.
- Mobilné načítanie nového tréningu: prvá stránka 25, ďalšia 1 vrátane celého 4 000-znakového textu, bez vodorovného pretekania. API overilo obe kategórie; tento prehliadačový pagination prípad bol tréningový.

Spustenie iba pri vedomom vytvorení nového testovacieho behu:

```powershell
node --use-system-ca scripts/live-notes-boundaries.mjs --write-test-data --fixture-event=<uuid-existujucej-fiktivnej-udalosti>
```

Vyžaduje existujúce `.env.local` / `.env.live.local`, presný `LIVE_TEST_PROJECT_URL`, štyri pripravené testovacie účty a fixture s očakávaným názvom. Správca je použitý iba na meranie počtu upozornení; zapisuje tréner. `test-results/live-notes-boundaries-state.json` sa vytvára s `wx` pred prvým zápisom a obsahuje iba checkpoint cieľa/IDs. Dokončený ani prerušený beh automaticky neopakovať a checkpoint nemažte na účely reseedovania. Existujúci dokončený runner dochádzky sa nespúšťal znovu.

Migračná história 28. októbra: Management **401**, ale priame overené TLS/read-only spojenie potvrdilo **23/0**. T3 snímkovanie a dokončenie streamovaného renderu sú občas nestabilné; úspech sa pripisuje iba skutočne dokončeným interakciám, nie samotnej prítomnosti skrytého SSR HTML.

## Súpis 30 hráčov a obnova dochádzky — 28. október

`scripts/live-attendance-roster.mjs`: **9/9 úspešných kontrol**, sanitizovaný report `test-results/live-attendance-roster.json`. Samostatný testovací tím obsahuje 29 nových fiktívnych profilov a existujúceho fiktívneho hráča, priradeného trénera a rodinné prepojenie na prvého nového hráča. Dve samostatné udalosti oddeľujú API a browser scenár. Žiadne nové Auth účty, e-maily, service-role zápisy, migrácie ani mazanie.

| Kontrola | Skutočný výsledok |
| --- | --- |
| Úplnosť súpisu | RPC stránky 25 + 5, 30 jedinečných hráčov, všetci pôvodne neoznačení. |
| Bulk a read-back | Atomická dávka 30 vrátane meškania/ospravedlnenia za prvou stránkou; 30 uložených riadkov verzie 1 bez duplicít. |
| Konflikt a oprava | Zastaraná verzia odmietne celú zmiešanú dávku (`PT409`); nekonfliktný riadok nezmenený. Zrušenie označenia zachová riadok a zvýši verziu. |
| Osobný/rodinný rozsah | Hráč dostane iba seba, rodič iba prepojené dieťa; obaja bez `can_manage`. |

T3 na lokálnej produkčnej zostave so skutočným Supabase, desktop 1280 × 800:

1. Viditeľných 30 neoznačených hráčov. Vyhľadávanie jedného hráča, `Všetci prítomní` zmení všetkých 30, uloženie potvrdené. Individuálna oprava na ospravedlnenie s krátkym fiktívnym dôvodom uložená.
2. Browser ponechal návrh neprítomnosti prvého hráča. Druhá nezávislá Auth/API relácia toho istého trénera uložila meškanie. V browseri pribudol druhý nekonfliktný návrh meškania. Druhý editor nebol druhý browser formulár.
3. Uloženie odmietlo celú zastaranú dávku, oba návrhy zostali; samostatný API read-back potvrdil nezmenený druhý riadok. `Načítať aktuálne záznamy` označilo konflikt, `Zobraziť celý súpis` ho sprístupnilo mimo filtra. `Použiť uložený stav` prevzalo prvý záznam a ponechalo druhý návrh. Nasledujúce uloženie prešlo.
4. Nové načítanie a API read-back potvrdili 30 jedinečných záznamov: 28 prítomných / 2 meškania. Rodičovská dostupnosť zostala `no` s pôvodným fiktívnym dôvodom počas všetkých opráv.

Mobil 390 × 844: viditeľné statusové tlačidlá 82 × 74 px a žiadne vodorovné pretekanie. Izolovaná browser udalosť bola v druhej Auth relácii zrušená a stav overený čítaním. Návrh neprítomnosti z otvoreného súpisu server odmietol. Reload zobrazil uložené meškanie, vyčistil návrh a odstránil všetky statusové aj save tlačidlá; aktuálna dochádzka aj dostupnosť zostali nezmenené. Fixture zostala zrušená. Následná drobná úprava read-only textu odstránila výzvy na označovanie a nepresné tvrdenie o výsledku skoršieho nepotvrdeného zápisu; prešla lokálnymi check/test/build, nevyžadovala nový DB zápis.

Nová implementácia reloadu má osem serverových regresných testov (stav, strata oprávnenia, udalosť skrytá po načítaní súpisu, prechodná DB chyba, osobné roly). **406/406 lokálnych testov v 21 súboroch**, check bez upozornení a build prešli. Nový UI scenár po odobratí trénerstva nebol v tomto behu živým browser testom; samostatná historická DB revokácia zostáva platným dôkazom. T3 streamovanie/snímkovanie občas zlyhalo a bolo opakované; skryté SSR riadky sa nepovažovali za úspešný render. Fyzický mobil, čítačka, dlhodobý outage a strata odpovede po commite nie sú týmto overené.

Runner vyžaduje presný `LIVE_TEST_PROJECT_URL`, existujúce štyri fiktívne identity a čerstvo overenú migračnú históriu bez neznámych/čakajúcich verzií. Spúšťa sa iba pri vedomom vytvorení nového behu:

```powershell
node --use-system-ca scripts/live-attendance-roster.mjs --write-test-data
```

Súkromný checkpoint `test-results/live-attendance-roster-state.json` sa rezervuje exkluzívne (`wx`) pred prvým zápisom, obsahuje cieľ a fixture IDs. **Dokončený beh nespúšťať znovu a checkpoint nemažte na účely reseedovania.** Žiadny zo starších dokončených runnerov nebol opakovaný. Overená vzdialená história zostáva **23/0**; nová migrácia nebola potrebná.
