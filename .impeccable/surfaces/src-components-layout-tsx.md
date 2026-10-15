---
version: 1
slug: "src-components-layout-tsx"
primary_target: "src/components/layout.tsx"
related_targets: ["src/app/klub","src/features/dashboard.tsx","src/features/calendar.tsx","src/app/globals.css"]
---

# Klubový priestor

Mode: Operate

## Rozsah

Zdieľaný dizajnový systém, navigácia, prehľady jednotlivých rolí, kalendár, tímy, členovia, dochádzka, platby a oznamy. Potvrdené použitie: administratíva na počítači, tréneri a rodičia aj na mobile. Ide o zdokonalenie existujúcej identity, nie o novú produktovú funkciu.

## Smer

Obsah určuje rozloženie: program sa číta v časovej postupnosti, tímy ako adresár, financie ako porovnateľné záznamy. Opakované ikony, farebné pásiky a kontajnery sa odstránia, kde nenesú informáciu. Rodič musí nájsť najbližšiu udalosť a odpoveď dieťaťa bez prechádzania dekoratívneho úvodu. Stavové a finančné informácie zostanú textovo explicitné.

## Pohyb

Hlavná interakcia je mobilná navigácia: vysunie sa zľava a po zatvorení vráti fokus. Formulár sa otvorí krátkym posunom a zmenou krytia. Bežné záznamy neanimujú pri načítaní. Obmedzený pohyb zachová farebnú a textovú spätnú väzbu.

## Overenie a hranice

Desktop a mobil cez T3 náhľad, klávesnicové otvorenie a zatvorenie, formulárové stavy, jeden mechanický scan a najviac dve vizuálne kontrolné kolá. Náhľad má fiktívne údaje a nevykonáva databázové mutácie. Zostáva samostatné živé Supabase overenie rolí, autentifikácie a zápisov.
