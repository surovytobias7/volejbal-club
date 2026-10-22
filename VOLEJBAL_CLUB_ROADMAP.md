# Volleyball Club System — plán dokončenia a spustenia

**Verzia:** 1.2

**Dátum:** 22. október 2026

**Projekt:** `surovytobias7/volejbal-club`  
**Pracovné prostredie:** T3 Code / Codex, Next.js, TypeScript, Supabase, GitHub  
**Produkt:** Jediný volejbalový klub, slovenské používateľské rozhranie, roly administrátor / tréner / hráč / rodič.  
**Cieľ:** Spoľahlivý, bezpečný a vizuálne osobitý klubový systém pripravený približne pre 340 mesačne aktívnych používateľov.

> **Zdroj stavu:** Reporty Codexa a doterajšia komunikácia. Tento dokument nie je nezávislý audit repozitára. Pred označením úloh ako hotových treba overiť skutočný kód, funkčnosť a aktuálne dokumenty projektu.

**Aktuálne pokračovanie:** Reprodukovaných a opravených 9 bezpečnostných zlyhaní; 250 lokálnych testov prešlo. Doplnené serverové kontroly a databázové obmedzenia, aktualizovaná matica prístupov a navigácia podľa skutočných oprávnení. Dve nové migrácie čakajú na obnovenie prístupu k migračnej histórii testovacieho Supabase (Management HTTP 401); nový RPC kontrakt zatiaľ chýba na Data API. Pred nasadením aplikácie aplikovať iba overené chýbajúce migrácie a dokončiť hosted acceptance. Podrobnosti v `docs/PROGRESS.md`; staršie počty nižšie sú historické.

## Pravidlá práce

Aktualizácia integrácie 22. októbra: dochádzka a bezpečnostné opravy sú spojené bez konfliktných značiek, 296 lokálnych testov prešlo. Nová zjednocujúca migrácia zachováva opravy historickej dochádzky aj aktuálne oprávnenia. Spolu 22 lokálnych migrácií; štyri nad historickým vzdialeným základom čakajú na potvrdenie histórie a živé overenie. Management API naďalej vracia HTTP 401. Záverečné overenie bezpečnostnej aktualizácie Next.js a aktuálne výsledky: `docs/PROGRESS.md`.

- Pokračovať v **existujúcom** projekte; neprepisovať ho od začiatku.
- Používať existujúci Graphify výstup na orientáciu a čítať len relevantné súbory; graf nenahrádza kontrolu implementácie.
- Využívať vhodné Codex skills (najmä `frontend-design`, `web-design-guidelines`, `vercel-react-best-practices`, Supabase skills) podľa potreby. Codex si môže organizovať prácu samostatne.
- Zachovať slovenské texty, bezpečné serverové operácie, RLS a oddelené oprávnenia používateľov.
- V **testovacom** prostredí iba fiktívne údaje; osobné údaje detí nepridávať pred bezpečnostným schválením.
- Každú etapu ukončiť funkčným testom, aktualizáciou dokumentácie a zrozumiteľným stavom „hotové / otvorené / blokované“.
- Bez automatického `git push`; používateľ kontroluje commit/push. Žiadne tajné kľúče v Gite, chate ani verejných logoch.
- Finálne rozhodnutie o hostingu a platnom tarife robiť podľa **aktuálnych** cien, licenčných podmienok, limitov a technickej kompatibility.

## Súčasný overený/predbežný stav

**Aktualizácia dochádzky (21. 10.):** Lokálne je implementovaný trénerov súpis s priamym označením, hromadným zápisom, opravami, auditom a ochranou konfliktov. Integruje existujúci kalendár, tím, prehľad aj dochádzku. Nová migrácia nie je aplikovaná na živom Supabase; aktuálna kompletná testovacia sada má tri pôvodné zlyhania súkromných polí mimo dochádzky. Historický údaj o 169 zelených testoch nižšie nie je aktuálnym výsledkom. Presné kontroly a ďalšie kroky: `docs/ATTENDANCE.md`, `docs/PROGRESS.md` a `docs/ROADMAP.md`.

- [x] Existuje Next.js aplikácia s prepojením na testovací Supabase projekt.
- [x] Aktuálne **169 lokálnych automatických testov**; TypeScript, lint a build. Presné overenie a limity sú v `docs/PROGRESS.md`, `docs/UI_REVIEW.md` a `docs/BRAND_REVIEW.md`.
- [x] Oficiálna identita **ŠŠK Gymnázium Bilíkova Bratislava**: pôvodné logo, modrá/biela/červená, zdieľané štýly, navigácia, prihlásenie a nové členenie prehľadu.
- [x] Codex reportoval živé testovanie rolí, dochádzky, kalendára, financií, rodičovských odpovedí a hráčskeho profilu.
- [x] Údaje testovacieho Supabase projektu sa nastavujú v lokálnom `.env.local`; skutočné tajomstvá nepatria do Git repozitára.
- [ ] UI/UX prerábka prebieha; finálny vzhľad ešte nie je schválený.
- [ ] SMTP, spoľahlivé doručovanie e-mailov a úplné použitie e-mailových šablón zostávajú otvorené.
- [ ] Kompletné manuálne end-to-end/akceptačné testovanie všetkých rolí a mobilných tokov zostáva otvorené.
- [ ] Bezpečnostné a produkčné overenie, hosting, reálne účty a reálne údaje nie sú dokončené.

## ETAPA 1 — Dokončiť originálny UI/UX dizajn (teraz)

**Cieľ:** Prémiový športový dizajn bez generických „AI dashboard“ šablón, so zachovanými funkciami.

- [x] Zapracovať potvrdený klubový dizajnový smer do zdieľaného systému a hlavných obrazoviek; pôvodné logo zachovať bez úprav. Vybrané náhľady pri 320–1280 px a formulárové/menu interakcie overené, úplná autentifikovaná matica zostáva otvorená.

- [ ] Dopracovať typografiu, farebný systém, spacing, navigáciu, formuláre, tabuľky, loading/empty/error stavy a prístupnosť.
- [ ] Prejsť všetky štyri roly a kľúčové obrazovky: dashboard, tímy, hráči, tréningy, kalendár, dochádzka, poplatky, oznámenia, profily, nastavenia, prihlasovanie.
- [ ] Odskúšať desktop a mobil, vrátane mobilného menu a dotykového ovládania.
- [ ] Skontrolovať, že redesign neporušil oprávnenia ani existujúce workflow.
- [ ] Pripraviť ukážku obrazoviek a schváliť dizajnový smer.

**Hotové, keď:** najdôležitejšie stránky sú vizuálne konzistentné, responzívne, prístupné a prejdú súvisiace testy.

## ETAPA 2 — Audit požiadaviek + chýbajúce funkcie vrátane poznámok

**Cieľ:** Zistiť, čo aplikácii naozaj chýba, a implementovať len relevantné medzery.

- [ ] Porovnať aktuálny projekt s `docs/PROGRESS.md`, `docs/REQUIREMENTS_GAPS.md` a pôvodnými požiadavkami. Výsledok dať do prehľadu **hotové / chýba / chyba / nie je v rozsahu**.
- [x] **Poznámky:** používateľ 16. 10. potvrdil interné poznámky k hráčovi a tréningu. Čítajú administrátor/priradení tréneri, upravuje autor/administrátor; hráčska ani rodičovská rola prístup neposkytuje.
- [x] Lokálna implementácia poznámok: databáza/RLS, serverová autorizácia, vytvorenie/úprava, audit, stránkovanie, verzovanie a UI/testy. Rozsah a dôkazy: `docs/INTERNAL_NOTES.md`.
- [x] Aplikovať novú migráciu na testovací Supabase: 18. 10. overený stav 18 migrácií / 19 RLS tabuliek / 21 RPC; vybrané živé vytvorenie/čítanie a izolácia poznámok prešli.
- [ ] Dokončiť živú akceptáciu úprav, auditu, revokácie, súbehu a mobilných formulárov poznámok podľa `docs/INTERNAL_NOTES.md`.
- [ ] Skontrolovať existujúce moduly oznámení, profilov, dochádzky, financií, kalendára, upozornení a súvisiacich oprávnení.
- [ ] Overiť proces pridania hráčky a bezpečné prepojenie na jej používateľský účet, prípadne účet rodiča; rodič môže mať viac detí. Hráčsky účet môže byť voliteľný podľa pravidiel klubu.
- [ ] Rozhodnúť o importe hráčok/tímov (CSV/Excel), oprave duplicít, priradení do tímov a prípadnom variabilnom symbole na evidenciu platieb.
- [ ] Poplatky zatiaľ iba **evidencia**, nie online platby.

**Hotové, keď:** každý povinný scenár je implementovaný alebo výslovne odložený; úlohy sú uvedené v dokumentácii.

## ETAPA 3 — Supabase Auth, pozvánky a e-mailové doručovanie

**Cieľ:** Reálne fungujúci proces pozvania, nastavenia a obnovenia hesla.

- [ ] Dokončiť **SMTP** cez vybraného poskytovateľa (napr. Resend) a overenú doménu; doménu/DNS vyriešiť s klubom alebo majiteľom domény.
- [ ] Overiť e-mailové šablóny `invite.html` a `recover.html`, správne bezpečné odkazy a TokenHash spracovanie.
- [ ] Nastaviť URL a redirecty pre staging a neskôr produkčnú doménu (nie iba `localhost`).
- [ ] Otestovať pozvánku, aktiváciu účtu, zmenu/obnovu hesla, expirovaný odkaz a opakovanú pozvánku.
- [ ] Otestovať administrátorské pozvanie hráčky/rodiča/trénera a prepojenie na existujúce profily bez duplicít.
- [ ] Zaznamenať stav doručovania; ak ešte nie je SMTP, nemeniť stav na „hotové“.

**Hotové, keď:** testovací používateľ dostane e-mail a dokončí celý postup bez ručného zásahu v Supabase Dashboarde.

## ETAPA 4 — Databáza, oprávnenia, ochrana dát

**Cieľ:** Bezpečný systém pre osobné údaje vrátane detí.

- [ ] Skontrolovať Supabase migrácie a databázové integritné pravidlá, zápisy súvisiace s používateľskými rolami a konzistentnosť po zmenách.
- [ ] Overiť RLS pravidlá negatívnymi testami: rodič nevidí cudzie deti, tréner nespravuje cudzie tímy, hráč nezískava administrátorské dáta.
- [ ] Skontrolovať server-only secret keys, logovanie, únik osobných údajov, testovacie endpointy a `ENABLE_DESIGN_PREVIEW=false` na verejnom prostredí.
- [ ] Zaviesť primerané zálohovanie, skúšku obnovy, retenciu/mazanie dát, audit kritických činností a pravidlá prístupov.
- [ ] Skontrolovať GDPR: účel spracúvania, informačné povinnosti, roly prevádzkovateľa/sprostredkovateľa, zmluvy so službami, prístup k detským údajom.
- [ ] Oddeliť staging (fiktívne dáta) od produkčnej databázy (reálne dáta); žiadne testy proti produkcii bez plánu.

**Hotové, keď:** kritické autorizačné scenáre a obnova dát prejdú; pred ostrou prevádzkou sú vyriešené požiadavky ochrany osobných údajov.

## ETAPA 5 — Komplexné testovanie a opravy

**Cieľ:** Nielen „build prešiel“, ale použiteľnosť všetkých hlavných tokov v prehliadači.

- [ ] End-to-end scenáre pre admina, trénera, rodiča, hráča; desktop aj mobil.
- [ ] Otestovať kalendár, preplánovanie, odpovede na účasť, skutočnú dochádzku, oznámenia, poplatky, deaktiváciu, profil a pozvánky.
- [ ] Skontrolovať loading, chyby siete, prázdne stavy, formuláre a neplatné vstupy.
- [ ] Automatické kontroly: unit/integration/E2E, TypeScript, lint, build; testovať aj produkčný build.
- [ ] Založiť a riešiť chyby podľa závažnosti; pred demo verziou žiadne kritické blokéry.

**Hotové, keď:** existuje evidencia úspešných scenárov a známych neblokujúcich nedostatkov.

## ETAPA 6 — Staging hosting a ukážka pre manažérku

**Cieľ:** Poslať manažérke klubu webový odkaz a samostatný testovací účet.

- [ ] Vybrať Next.js-kompatibilný hosting: prednostne overiť Cloudflare Workers; ak existuje blokér, porovnať Netlify, Heroku študentský kredit, Vercel a ich podmienky používania.
- [ ] Preveriť aktuálne bezplatné limity, typ prevádzky a licencie; **0 € nie je zaručených**.
- [ ] Prepojiť GitHub s hostingom, nastaviť environment variables v hostingu, bezpečné cookies, callback URL a zostavenie aplikácie.
- [ ] Neposielať `.env.local` ani iné tajné súbory do repozitára; zdieľané testovacie prístupy obmedziť.
- [ ] Staging používa **výlučne fiktívne dáta** a oddelenú/testovaciu databázu.
- [ ] Manažérka prejde konkrétne scenáre a zapíše pripomienky ku funkciám, poznámkam, rolám a dizajnu.

**Hotové, keď:** odkaz funguje mimo vývojárskeho počítača a manažérka vie prejsť základné workflow.

## ETAPA 7 — Zapracovanie spätnej väzby a produkčná pripravenosť

- [ ] Prioritizovať pripomienky manažérky (nutné pred spustením / neskôr).
- [ ] Vybrať dlhodobý hosting a spôsob financovania; nezabudnúť na prípadné pozastavenie Supabase Free, zálohy a e-mailové limity.
- [ ] Pripraviť produkčný Supabase projekt, doménu, monitoring, logovanie, upozornenia a dokumentovaný deploy/rollback.
- [ ] Implementovať bezpečný onboarding/import klubových dát a prvých účtov; overiť správnosť priradenia detí a rodičov.
- [ ] Vytvoriť jednoduchý používateľský návod pre administrátora, trénerov a rodičov.

**Hotové, keď:** klub odsúhlasí funkcie, prevádzkové náklady, ochranu dát a spôsob podpory.

## ETAPA 8 — Ostré spustenie + údržba

- [ ] Nasadiť finálnu verziu a pripojiť produkčnú databázu.
- [ ] Importovať reálne údaje **až po bezpečnostnom overení a súhlase klubu**.
- [ ] Rozoslať pozvánky cez overené SMTP, overiť prvé prihlásenia a podporiť používateľov.
- [ ] Kontrolovať dostupnosť, chyby, spotrebu databázy, zálohy a doručovanie e-mailov.
- [ ] Po spustení robiť menšie pravidelné zlepšenia na základe reálneho používania.

**Hotové, keď:** systém stabilne používajú členovia klubu a existuje postup, ako riešiť incident, zabudnuté heslo a obnovu dát.

## Orientačná priorita / najbližšie tri kroky

1. **Teraz:** dokončiť UI/UX redesign, zjednotiť mobil a desktop, otestovať regresie.
2. **Potom:** overiť implementované interné poznámky na testovacom Supabase podľa `docs/INTERNAL_NOTES.md`; pokračovať v audite zostávajúcich povinných medzier.
3. **Následne:** SMTP + šablóny + klikacie testy; potom bezpečný staging pre manažérku.

> Poznámka: SMTP môže zostať technicky blokované do získania klubovej domény. To nesmie blokovať dizajn, samotné poznámky ani staging s existujúcimi testovacími účtami.

## Kontrolný formát po každej Codex session

Do `docs/PROGRESS.md` alebo tohto súboru doplniť:

- **Hotové:** čo sa implementovalo, relevantné súbory a testy.
- **Otvorené:** konkrétne úlohy s prioritou.
- **Blokery:** aká externá akcia je potrebná (doména, DNS, SMTP, schválenie dizajnu).
- **Ďalší krok:** presne jedna ďalšia zmysluplná úloha.
- **Git:** zmeny commitnuté/pushnuté alebo nie; bez tajných kľúčov.

## Pokyn pre Codexa pri ďalšej session

> Follow `docs/ROADMAP.md` as the main development roadmap. Use `docs/PROGRESS.md` and existing Graphify data to restore context efficiently. Work on the highest-priority unfinished task, preserve existing functionality and Slovak UI, use appropriate skills, test your changes, and update progress and roadmap checkboxes. Ask when a product decision is genuinely required, especially the scope and visibility of notes. Do not push automatically and never expose secrets.
