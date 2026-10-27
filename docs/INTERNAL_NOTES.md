# Interné poznámky — 16. 10. 2026

Aktualizácia 27. 10. 2026: oba druhy poznámok majú živé vytvorenie/čítanie, overené druhého trénera, admin opravu/audit, súbeh verzií a okamžitú revokáciu priradenia/deaktivácie. Tréningová poznámka prešla aj vytvorením/úpravou v T3 a reloadom na mobilnom rozmere. Hráč/rodič poznámky nevidia v UI ani Data API. Aktuálne **23 migrácií**; podrobnosti a zostávajúce stránkovacie/chybové prípady: [LIVE_ATTENDANCE_NOTES.md](LIVE_ATTENDANCE_NOTES.md). Stav 18 migrácií a neoverené úpravy v zázname nižšie sú historické k 18. októbru.

## Potvrdený rozsah

Používateľ potvrdil poznámky k hráčovi aj tréningu: čítajú ich administrátor a priradení tréneri, upravuje autor alebo administrátor. Hráčska a rodičovská rola samostatne prístup nedávajú. Roly zostávajú aditívne.

- Poznámka patrí presne jednému hráčskemu profilu alebo jednému výskytu udalosti typu `training`. Nevznikli tímové poznámky ani poznámky k zápasom či celej opakovanej sérii.
- K hráčovi má prístup tréner ktoréhokoľvek tímu, v ktorom je daný aktívny hráč aktuálne zaradený. K tréningu má prístup tréner jeho aktuálneho tímu. Administrátor má prístup aj k neaktívnemu hráčskemu profilu.
- Odobraté členstvo trénera/hráča, odobratá rola alebo deaktivácia sa posudzujú pri každej požiadavke. Autorstvo neposkytuje prístup po odobratí oprávnenia. Pri odstránení hráčskej roly alebo zmene udalosti na iný typ sa poznámky v danom kontexte nezobrazujú; audit sa zachová.
- Čítanie iného trénera neznamená právo meniť jeho poznámku. Finančné oprávnenia sa nemenia.
- Poznámky nenahrádzajú verejné pokyny k udalosti ani existujúcu poznámku k plánovanej dostupnosti. Skutočná dochádzka zostáva samostatná.

## Implementácia

`internal_notes`: kontext, text (1–4 000 znakov), autor a jeho meno v čase vytvorenia, čas vytvorenia/úpravy, verzia. Databáza určuje autora aj časy. API môže vkladať iba kontext/text a meniť iba text. Mazanie nie je dostupné.

Server Action overí aktívneho používateľa, rolu, aktuálny prístup ku kontextu, autora a nemenný kontext. Aktualizácia používa verziu otvoreného záznamu. Pri konflikte vyzve na skopírovanie rozpracovaného textu a obnovenie stránky. RLS a databázový trigger vynucujú práva aj pri priamom API zápise.

Vytvorenie a úpravy zapisujú starý/nový obsah do existujúceho `audit_logs`, ktorý je dostupný iba administrátorovi. Obrazovka Histórie zmien označuje operácie ako „Interná poznámka“; samostatný prehliadač starých textových verzií sa nepridával.

Zoznam používa 25 záznamov a kurzor `(created_at, id)`, zachová filtre a ostatné stránkovanie stránky. Formulár drží text pri chybe, oznámi výsledok a fokusuje pole. Načíta sa len pre administrátora/trénera; chyba načítania nenahradí záznamy fixtures a neblokuje ostatný profil/tréning.

## Migrácia a živé overenie

Nová aditívna migrácia: `supabase/migrations/20261016090000_internal_notes.sql`. Lokálne bola vykonaná v PGlite a typy sú regenerované. **18. 10. 2026 bola aplikovaná aj na vyhradený testovací Supabase**, po zhode cieľa a overení histórie predchádzajúcich 17 migrácií. Zápis schémy a migračnej histórie bol transakčný; PostgREST dostal obnovenie schémy. Migráciu neopakovať a databázu neresetovať.

Overený testovací stav: **18 migrácií, 19 RLS tabuliek a 21 verejných RPC**. Na požiadanie používateľa vzniklo 15 fiktívnych poznámok cez autentifikovaných trénera/správcu. Prešlo vytvorenie, trénerské čítanie cez RPC a skutočné SSR detailov; rodič a tréner nepriradeného tímu nemajú prístup k týmto poznámkam. Úpravy, revokácia, konkurentné formuláre a úplná živá matica nižšie ešte nie sú akceptované.

Živá akceptácia s fiktívnymi účtami:

1. Tréner vytvorí poznámku hráčovi aj tréningu, obnoví stránku a overí persistenciu.
2. Druhý priradený tréner ju číta, nedokáže upraviť; administrátor ju upraví a vidí audit.
3. Rodič, hráč a nepriradený tréner nemajú prístup cez UI ani priame PostgREST/RPC volanie.
4. Pôvodný autor stratí prístup po odobratí priradenia/roly alebo deaktivácii bez obnovenia JWT.
5. Dvaja oprávnení editori otvoria rovnakú verziu; druhé uloženie starého formulára nesmie prepísať prvé. Text zostane vo formulári.
6. Skontrolovať mobilné vytvorenie/úpravu, stránkovanie, dlhý text, chybu spojenia a audit. Overiť, že nevznikli oznámenia hráčom/rodičom.

## Doložené lokálne overenie

- PGlite: oprávnenia, anonymné odmietnutie, kombinované roly, odobratie prístupu, nemenné autorstvo/kontext, obmedzenia textu, zákaz mazania, audit, stránkovanie a verzovanie.
- Unit testy: vstupy/kurzory a samostatná serverová autorizácia, chyby overenia prístupu, podvrhnutý autor, cudzí záznam, zmena kontextu a konflikt verzie.
- T3 náhľad: rovnaké prezentačné komponenty a formulár; iba fiktívny lokálny stav. Pridanie, opakované úpravy, chyba, zachovanie textu a verzie overené. Náhľad nepreukazuje živý Auth/PostgREST zápis.
