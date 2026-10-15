# Volej klub

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Používateľ potvrdil 15. 10. 2026 vyváženú prioritu: administrátori spravujú klub na počítači, tréneri a rodičia používajú rozhranie aj na mobile. Hráči sledujú vlastný program, oznamy a dostupné členské údaje. Roly sú aditívne; tréner nemá automaticky finančné oprávnenia. Rodič vidí iba údaje prepojených detí.

## Product Purpose

Správa jedného volejbalového klubu: členská evidencia, tímy, tréningy a zápasy, plánovaná dostupnosť, skutočná dochádzka, oznamy a členské platby. Úspešné použitie znamená nájsť ďalšiu udalosť, vykonať úlohu a jednoznačne rozumieť jej výsledku.

## Operating Context

Administratívne zoznamy a finančné záznamy potrebujú prehľadné porovnávanie na širokej obrazovke. Mobilné použitie potrebuje rýchly prístup ku kalendáru, odpovediam na účasť a informáciám o deťoch. Rozhranie používa slovenčinu, sk-SK, EUR a Europe/Bratislava.

## Capabilities and Constraints

- Existujúca implementácia: Next.js App Router, strict TypeScript, Supabase Auth a PostgreSQL RLS.
- Každá mutácia zostáva autorizovaná na serveri aj v databáze. Deaktivácia platí bez čakania na obnovu JWT.
- Plánovaná dostupnosť a skutočná účasť sú oddelené údaje. Peniaze sú celočíselné centy; finančné opravy majú auditnú stopu.
- Náhľad `/ukazka` je výslovne označený, povolený iba cez `ENABLE_DESIGN_PREVIEW=true` a oddelený od autentifikácie. Zlyhanie databázy sa nikdy nenahrádza ukážkovými údajmi.
- Existujúce filtre, stránkovanie, formuláre, roly a väzby sa pri dizajnových úpravách zachovajú.
- Žiadne tvrdenie o nasadení alebo produkčnej pripravenosti bez overenia. PGlite nenahrádza živé integračné overenie Supabase.

## Brand Commitments

Existujúci názov rozhrania je Volej klub; názov a logo konkrétneho klubu sú konfigurovateľné. Texty majú byť vecné, priateľské a slovenské. Táto úloha je zdokonalenie existujúceho rozhrania so zachovaním funkcií.

## Evidence on Hand

Produktové pravidlá: `AGENTS.md`. Implementované funkcie a otvorené body: `docs/FEATURES.md`, `docs/PROGRESS.md`, `docs/LIVE_ACCEPTANCE.md`. Zdieľané rozhranie: `src/components`; hlavné obrazovky: `src/app/klub` a `src/features`. Náhľad obsahuje výhradne fiktívne údaje. Žiadne produkčné záznamy nie sú vizuálnymi fixtures.

## Product Principles

1. Dôležitá úloha a stav musia byť nájditeľné bez čítania celej obrazovky.
2. Oprávnenia a vzťahy určujú dostupné údaje aj akcie.
3. Súvisiace údaje patria spolu; opakovaná dekorácia nesmie prehlušiť program a záznamy.
4. Potvrdenie, chyba a načítavanie musia byť čitateľné aj pri obmedzenom pohybe.
5. Rovnaké úlohy musia byť použiteľné klávesnicou aj dotykom.
