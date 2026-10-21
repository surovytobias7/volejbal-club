---
name: ŠŠK Gymnázium Bilíkova Bratislava
description: Modrá, biela a červená identita školského volejbalového klubu.
colors:
  primary: "#252b80"
  deep: "#1d245b"
  ink: "#1c2747"
  muted: "#5e657b"
  background: "#ffffff"
  surface: "#ffffff"
  line: "#dfe3ed"
  tint: "#eef1fb"
  accent: "#ce2637"
  focus: "#b82437"
  danger: "#a32132"
  control-border: "#8b94ae"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(36px, 3.2vw, 48px)"
    fontWeight: 600
    lineHeight: 1.08
  body:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
rounded:
  control: "6px"
  surface: "12px"
  dialog: "16px"
spacing:
  small: "8px"
  control: "12px"
  compact: "16px"
  section: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
---

## Overview

Identita potvrdená používateľom 18. 10. 2026: **ŠŠK Gymnázium Bilíkova Bratislava**. Dodané logo je uložené bez úprav v `public/brand/bilikova-logo.png` (145 × 200 px). Autoritou implementácie sú `src/lib/club-brand.ts`, `src/components/club-identity.tsx`, `src/app/globals.css` a zdieľané komponenty. Manrope a Barlow Condensed pokračujú v športovom typografickom základe. Výraz nesie vlastné klubové logo, silné členenie programu a modro-bielo-červená identita.

## Colors

Modrá označuje navigáciu, primárnu akciu a najbližšiu udalosť. Biela je hlavná pracovná plocha aj prirodzený podklad loga. Červená označuje aktívnu navigáciu a krátky klubový akcent; úspech si zachováva sémantickú zelenú. Chyba, splatnosť a účasť majú vždy aj textový názov. Výber textu, kurzor, posuvníky, fokus, kalendár a formulárové stavy používajú spoločné tokeny. Na modrej navigácii je fokus biely; na bielom podklade červený.

Logo sa používa raz ako kotva obrazovky: na prihlásení a v desktope v záhlaví bočnej navigácie. Na mobile je v hornej lište a v otvorenom navigačnom dialógu. Pomer strán sa nemení; obrázok sa nepretvára na dekoratívnu ikonu. Nastavenia správcu môžu naďalej meniť názov a externé HTTPS logo autentifikovaného priestoru. Bez externého loga sa zobrazí dodaný klubový súbor. Verejné prihlasovacie stránky a metadáta používajú potvrdenú identitu.

## Typography

Obe písma sú lokálne z `@fontsource`. Barlow Condensed patrí hlavným nadpisom, názvom tímov a súhrnným číslam. Manrope patrí textu, dátam, navigácii a ovládaniu. Dlhší obsah používa 13–14 px; pomocný text pri údajoch aspoň 12 px. Krátke stavové štítky môžu mať 11 px. Čísla v tabuľkách sú tabulárne; finančné sumy sa zarovnávajú doprava. Mobilné formuláre používajú 16 px vstupy.

## Layout

Bočný panel zostáva pevný pri posúvaní stránky. Logo a spodný profil sa nezmenšujú; stredná navigácia využíva zvyšnú výšku a posúva sa iba pri skutočnom nedostatku miesta. Pri desktopovej výške do 800 px má hlavička minimálne 128 px a odkazy minimálne 44 px. Vyššie obrazovky zachovávajú voľnejší rytmus. Pri extrémne nízkom okne zostáva dostupné aj posúvanie celého panela; obsah sa neodrezáva.

Bočný panel má na širokej obrazovke 248 px (228 px v užšom desktopovom rozložení). Biele klubové záhlavie oddeľuje logo od modrej navigácie. Do 900 px panel nahrádza otvárateľná navigácia. Do 700 px je k dispozícii spodná navigácia. Pracovná plocha má pružné stĺpce a maximálnu šírku 1580 px; mobilné okraje majú 16 px. Prihlásenie na mobile ponecháva klubové záhlavie a formulár; veľký sprievodný slogan patrí desktopu.

Prehľad začína krátkym pozdravom, samostatným pásom najbližšej udalosti a programom. Úlohy a správy sú dostupné v susednom stĺpci; súhrnné čísla nasledujú za pracovnými sekciami. Tímy tvoria zoznam s výraznou kategóriou a jasným vstupom do detailu. Agenda zoskupuje udalosti podľa dátumu; v skupine dátum neopakuje. Na úzkej obrazovke sa tabuľky menia na označené riadky pri zachovaní tabuľkovej sémantiky.

## Elevation & Depth

Bežné pracovné sekcie oddeľujú medzery a jemné deliace čiary. `Panel` drží jednu ohraničenú plochu pre tabuľky a formuláre. `Panel plain` je otvorená sekcia pre prehľad a oznamy. Výrazný mäkký tieň patrí iba dialógu. Nevytvárať vnorené karty.

## Shapes

Ovládanie má mierne zaoblenie 6 px, samostatné plochy 12 px, dialóg 16 px. Farebné hrubé pruhy na okrajoch záznamov, upozornení a nadpisov sa nepoužívajú. Ikony Lucide majú funkčnú úlohu; opakovaná volejbalová ikona nie je označením každého tímu či prázdneho stavu.

## Components

- `PageHeading`: ľavý nadpis, krátky opis a príslušná primárna akcia, bez dekoratívneho pásika.
- `TeamList`, `MemberTable`, `ChargeTable`, `AttendanceTable`, `FinanceSummary`: rovnaké prezentačné komponenty v autentifikovaných stránkach aj explicitnom náhľade. Dáta a autorizáciu zabezpečujú serverové stránky.
- `Shell`: aktuálna sekcia v hornej lište; aktívna navigácia používa `aria-current`. Mobilný Radix dialóg uzamyká fokus, zatvára sa Escape a vracia fokus na vyvolávajúce tlačidlo. Prechod na desktop zatvorí otvorenú mobilnú navigáciu.
- `FormDialog`: názov, opis, viditeľné zatvorenie a zdieľané formulárové stavy. Existujúce serverové akcie sa nemenia.
- Pohyb: 120 ms spätná väzba, 180 ms bežná zmena, 260 ms otvorenie navigácie alebo dialógu; príchod používa `cubic-bezier(0.16, 1, 0.3, 1)`. Navigácia prichádza zľava, kam pri zatvorení odchádza. Stránky nemajú hromadné animované nástupy. `prefers-reduced-motion` nahrádza priestorový pohyb krátkou zmenou krytia a zastaví rotáciu a pulzovanie.
- Jediný výraznejší pohybový detail: krátka červená linka najbližšej udalosti reaguje na hover a klávesnicový fokus. Neanimuje sa pri načítaní ani v slučke; obmedzený pohyb ju ponechá statickú.
- Prázdne stavy pomenúvajú chýbajúci obsah a ďalší krok bez univerzálnej dekoratívnej ikony.
- Členský detail používa otvorené kontaktné riadky (`dl`) a samostatné odkazy na program a históriu. Detail tréningu oddeľuje výrazný čas od miesta a pokynov; viacdňová udalosť uvádza aj dátum konca.
- Osobná odpoveď hráča je text pri udalosti, oddelený od skutočnej dochádzky. Odkaz vedie na odpovede v detaile. Pri kombinovaných rolách sa označenie týka iba vlastného hráčskeho členstva.
- Interné poznámky sú chronologický zoznam bez opakovaných kariet. Na desktope je formulár vedľa zoznamu, na mobile pred ním; poradie klávesnicového ovládania začína formulárom. Úprava používa existujúci dialóg, chyby zachovajú rozpracovaný text.

## Do's and Don'ts

Zachovať slovenské texty, sk-SK, EUR a Europe/Bratislava. Použiť zdieľaný vzor skôr než ďalší lokálny variant. Vizuálny náhľad vždy označiť a izolovať od autentifikácie. Zachovať filtre, stránkovanie a oprávnenia. Nenahrádzať databázové chyby fixtures. Nenahrádzať zrozumiteľný text ikonou a nepoužívať pohyb ako podmienku dostupnosti obsahu.
