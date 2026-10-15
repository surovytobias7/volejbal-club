---
name: Volej klub
description: Prehľadný klubový priestor pre každodennú prácu.
colors:
  primary: "#17676a"
  deep: "#123e43"
  ink: "#18383d"
  muted: "#5d7174"
  background: "#f5f7f6"
  surface: "#ffffff"
  line: "#d9e2e0"
  tint: "#e8f1ef"
  warm: "#f4ae85"
  focus: "#b6532b"
  danger: "#9d303d"
  control-border: "#78968d"
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

Záznam existujúcej identity a jej zdokonalenia z 15. 10. 2026. Autoritou implementácie sú `src/app/globals.css` a zdieľané komponenty. Zachované sú tmavozelená navigácia, teplý farebný detail, Manrope a športovo pôsobiace nadpisy Barlow Condensed. Výraz vychádza z programu, tímov a čitateľných údajov; nepotrebuje dekoráciu okolo každého záznamu.

## Colors

Zelená označuje navigáciu a primárnu akciu. Teplá farba podporuje najbližšiu udalosť a dôležité stavy. Úspech, chyba a splatnosť majú aj textový názov, nikdy iba farbu. Svetlé pozadie drží pracovné plochy čitateľné; tmavá plocha je vyhradená navigácii a zvýraznenej udalosti. Výber textu, kurzor, posuvníky a fokus používajú rovnakú paletu.

## Typography

Obe písma sú lokálne z `@fontsource`. Barlow Condensed patrí hlavným nadpisom, názvom tímov a súhrnným číslam. Manrope patrí textu, dátam, navigácii a ovládaniu. Dlhší obsah používa 13–14 px; pomocný text pri údajoch aspoň 12 px. Krátke stavové štítky môžu mať 11 px. Čísla v tabuľkách sú tabulárne; finančné sumy sa zarovnávajú doprava. Mobilné formuláre používajú 16 px vstupy.

## Layout

Bočný panel má na širokej obrazovke 232 px (210 px v užšom desktopovom rozložení). Do 900 px ho nahrádza otvárateľná navigácia. Do 700 px je k dispozícii spodná navigácia. Pracovná plocha má pružné stĺpce a maximálnu šírku 1580 px; mobilné okraje majú 16 px.

Prehľad začína krátkym pozdravom a najbližšou udalosťou. Program a úlohy majú viac váhy než štatistiky. Tímy tvoria zoznam s kategóriou a jasným vstupom do detailu. Agenda zoskupuje udalosti podľa dátumu; v skupine dátum neopakuje. Na úzkej obrazovke sa tabuľky menia na označené riadky pri zachovaní tabuľkovej sémantiky.

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
- Prázdne stavy pomenúvajú chýbajúci obsah a ďalší krok bez univerzálnej dekoratívnej ikony.

## Do's and Don'ts

Zachovať slovenské texty, sk-SK, EUR a Europe/Bratislava. Použiť zdieľaný vzor skôr než ďalší lokálny variant. Vizuálny náhľad vždy označiť a izolovať od autentifikácie. Zachovať filtre, stránkovanie a oprávnenia. Nenahrádzať databázové chyby fixtures. Nenahrádzať zrozumiteľný text ikonou a nepoužívať pohyb ako podmienku dostupnosti obsahu.
