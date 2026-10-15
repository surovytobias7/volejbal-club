⚠️ DEGRADED: single-context (AGENTS.md zakazuje subagentov).

# Vizuálna revízia a úpravy rozhrania — 15. 10. 2026

Rozsah: zdieľaný systém a Shell, prehľad, kalendár, tímy, členovia, dochádzka, platby a oznamy. Použitý Impeccable: init, critique, distill, animate a polish. Používateľ potvrdil vyváženú prioritu administratívy na počítači a trénerov/rodičov na mobile. Kontext je v `PRODUCT.md`, vizuálne pravidlá v `DESIGN.md` a brief v `.impeccable/surfaces/src-components-layout-tsx.md`.

## Kritický nález

Najvýraznejší generický vzor bol tímový adresár: rovnaká karta s kruhovou ikonou lopty, štítkom, nadpisom, krátkym textom a oddelenou pätou. Opakované pásiky a rámiky zvyšovali vizuálnu zložitosť aj tam, kde ju už riešili typografia a medzery. Veľký úvod prehľadu a štatistiky posúvali program nadol. Pohyb takmer výhradne predstavoval spinner a pulzovanie načítavania; navigácia a formuláre menili stav náhle.

Identita má použiteľný základ: lokálne písma Manrope a Barlow Condensed, konzistentná zelená paleta, slovenské názvy a skutočná volejbalová terminológia. Existujúce mobilné tabuľky, rozlíšenie dostupnosti a dochádzky, stavové texty a stránkovanie sa zachovali. Skrytý slogan v bočnom paneli nebol viditeľným problémom; odstránený bol jeho nepoužívaný markup.

| Priorita | Nález a dôsledok | Vykonaná úprava |
| --- | --- | --- |
| P2 | Opakované karty tímov a zbytočné ikonové obaly sťažovali porovnávanie názvov. | Zdieľaný `TeamList`: kategória, názov, opis, vstup do detailu; bez opakovanej lopty a farebných pásikov. |
| P2 | Veľký úvod a rovnako výrazné súhrny odďaľovali program a deti. | Otvorený pozdrav, kompaktná najbližšia udalosť, menšie štatistiky a otvorené sekcie prehľadu. |
| P2 | Rámiky, pásiky a rovnaké kontajnery stierali rozdiel medzi programom, oznamom a záznamom. | `Panel plain` pre otvorené sekcie; jedna plocha zostáva pri tabuľkách. Agenda zoskupuje dátum raz, oznamy majú deliace čiary, filtre sú bez ďalšieho rámu. |
| P2 | Náhle otvorenie navigácie a dialógu nevysvetľovalo priestorový vzťah. | Radix navigačný dialóg, príchod zľava, kratší odchod, návrat fokusu; jemný vstup formulára a textová spätná väzba. Obmedzený pohyb používa krytie bez posunu. |
| P2 | Pomocný text bol miestami 10–11 px a okraje vstupov málo kontrastné. | Podpis značky 11 px; text pri sumách a záznamoch 12 px; silnejší okraj vstupu; sumy zarovnané doprava. |

P0: 0. P1: 0. Hodnotenie nepripisuje vizuálnym zmenám overenie produkčných pracovných postupov.

## Heuristické hodnotenie

Expertné skóre 0–4, nie výsledok používateľského výskumu. Východiskový stav vychádza zo zdrojového kódu a dostupného náhľadu; mobilné snímkovanie v prvej karte T3 zlyhalo. Neexistuje nezávislý druhý hodnotiteľ.

| Heuristika | Pred úpravou | Po úprave | Poznámka |
| --- | --- | --- | --- |
| Viditeľnosť stavu | 3 | 3 | Čitateľné stavy, aktívna navigácia; živé mutácie neoverené. |
| Zhoda s praxou klubu | 4 | 4 | Program, plánovaná účasť, skutočná dochádzka a platby zostávajú rozlíšené. |
| Kontrola používateľa | 3 | 4 | Escape, uzamknutie a návrat fokusu, zatvorenie navigácie pri desktopovom breakpointe. |
| Konzistentnosť | 3 | 3 | Zdieľané pravidlá a prezentačné komponenty; všetky autentifikované detaily neboli prezreté. |
| Prevencia chýb | 3 | 3 | Existujúce potvrdenia, autorizácia a validácia zachované. |
| Rozpoznanie namiesto pamätania | 3 | 4 | Jasný adresár, označené mobilné polia, aktuálna sekcia, menej dekoratívnej konkurencie. |
| Efektívnosť | 3 | 3 | Filtre a stránkovanie zachované; meranie času používateľských úloh neprebehlo. |
| Vizuálna jednoduchosť | 2 | 3 | Menej kontajnerov a opakovaných ikon, jasnejšia hierarchia. |
| Zotavenie z chýb | 3 | 3 | Overený fokus chybného poľa a úspešné hlásenie v izolovanom formulári. |
| Pomoc a vysvetlenia | 2 | 2 | Existujúce opisy a prázdne stavy; nevznikol nový onboarding. |
| **Spolu** | **29/40** | **32/40** | **Zlepšenie vizuálnej hierarchie a ovládania.** |

## Kognitívna záťaž a roly

Desktopová navigácia má sedem bežných sekcií, teda viac než štyri voľby; zodpovedajú existujúcim častým úlohám. Mobilný dock má štyri. Úlohy administrátora zostávajú dostupné a formuláre sa neskrývajú za nové menu. Rodičovský prehľad uprednostňuje deti v hlavnom stĺpci. Trénerský finančný prístup sa nemení. Dlhé administratívne formuláre a rozsiahle zoznamy naďalej potrebujú samostatné používateľské overenie.

## Detektor a dôkazy

- Sekvenčná kontrola v jednej relácii: najprv dizajnové posúdenie, potom deterministický scan. Nezávislosť dvoch hodnotiteľov sa netvrdí.
- Jeden CLI scan `impeccable detect --json src`: päť upozornení. Dva relevantné nálezy `border-accent-on-rounded` v `src/app/globals.css` (chybový stav a profilový avatar) boli opravené. Tri ďalšie boli v generovanom `src/graphify-out/graph.html`, ktorý nie je aplikačnou obrazovkou (dva kontrasty, jeden drobný text); nevznikla globálna výnimka.
- Mutovateľná injekcia bola overená. `detect.js` sa úspešne vložil do troch obrazoviek v T3 karte `[Human]`: prehľad, členovia, platby. Počty nálezov 3 / 2 / 7 zahŕňajú opakovaný podpis značky a drobné texty. Zodpovedajúce zdieľané štýly boli opravené. CLI ani overlay sa znovu nespúšťali; potvrdenie používa render a vypočítané štýly.
- Vstupná karta T3 mala chybu snímkovania; nová karta fungovala. Konzola T3 zaznamenala chybu Electron preload, nie chybu aplikačnej logiky. Prenos záznamu animácie z desktopu do pracovného prostredia zlyhal, preto prenositeľné video nie je doložené.
- HMR v tomto prostredí ponechalo starší CSS chunk pri posledných zmenách veľkosti písma. Záverečné potvrdenie preto používa nový produkčný build, nie tento starý chunk.
- Cieľ kritiky: `src/components/layout.tsx`; slug `src-components-layout-tsx`. Pôvodný ignore zoznam neexistoval. Pomocný server detektora bol zastavený, injekcia zmizla po navigácii, dočasné vstupy boli odstránené.

## Overenie

- T3 desktop 1280 px: prehľad, tímy, členovia, platby, mesačný kalendár. T3 mobil 390 px: rodičovský prehľad, členovia, platby, agenda, oznamy a dochádzka. Bez horizontálneho presahu vo skontrolovaných zobrazeniach.
- Mobilná navigácia: fokus v dialógu, Shift+Tab zostáva v navigácii, Escape zatvorí navigáciu a fokus sa vráti na pôvodné tlačidlo. Formulár: chybné pole má fokus a opis chyby; úspešné hlásenie používa `role=status`; Escape vracia fokus.
- Kontrast palety: pomocný text na pozadí 4,78:1; biely text primárneho tlačidla 6,59:1; bočný text 7,71:1; fokus na pozadí 4,58:1; okraj vstupu na bielej 3,21:1. Ide o konkrétne páry, nie kompletný audit všetkých stavov.
- Pravidlá `prefers-reduced-motion` sú skontrolované v CSS: navigácia a dialóg bez posunu, spätná väzba ostáva, spinner a pulzovanie sa zastavia. Systémová emulácia zníženého pohybu a fyzické dotykové zariadenie neboli dostupným T3 rozhraním overené.
- `npm test`: 113 testov v ôsmich súboroch prešlo (vrátane PGlite).
- `npm run check`: TypeScript a ESLint prešli.
- Produkčný build a záverečné potvrdenie: prebieha.

Živé Supabase/Auth/RLS integračné scenáre a produkčné finančné mutácie sa v tejto úlohe nespúšťali. Nevykonalo sa nasadenie. Náhľad zostáva explicitne povolený cez `ENABLE_DESIGN_PREVIEW=true` a používa výhradne fiktívne údaje.

Questions skipped: používateľ už určil rozsah aj poradie práce a potvrdil vyvážené desktopové/mobilné použitie.
