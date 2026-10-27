# Trénerova dochádzka — 21. október 2026

Aktualizácia 27. 10. 2026: **23/23 migrácií na testovacom Supabase**, vrátane `20261026191818_attendance_conflict_response.sql`. Konflikt očakávanej verzie vracia `PT409` / HTTP 409, aby ho PostgREST automaticky neopakoval ako serializačnú chybu `40001`. Živé bulk/atomicita, súbeh dvoch Auth relácií, história/revokácia a vybrané T3 mutácie s reloadom prešli. Hráč a rodič vidia iba oprávnenú účasť. Podrobnosti a zostávajúce scenáre: [LIVE_ATTENDANCE_NOTES.md](LIVE_ATTENDANCE_NOTES.md). Staršie počty/chyby a obmedzenia snímkovania nižšie sú historické.

## Pracovný postup

Kalendár, program tímu a trénerov prehľad vedú na existujúci detail udalosti `/klub/kalendar/[id]`. Sekcia Dochádzka a detail tímu navyše ponúkajú posledných päť nezrušených tréningov do konca dnešného dňa; ďalšie termíny zostávajú dostupné cez kalendár. Výber na zápis sa obmedzuje na tímy aktuálne pridelené trénerovi alebo všetky tímy administrátora, aj pri kombinácii tréner/rodič.

Tréner vidí dátum, čas v Europe/Bratislava, miesto, tím a celý súpis. Prítomnosť, neprítomnosť, meškanie a ospravedlnenie označí priamo tlačidlom. Dôvod ospravedlnenia je nepovinný, najviac 200 znakov. Neoznačený hráč sa nikdy automaticky nestáva neprítomným.

- `Všetci prítomní` platí pre celý načítaný súpis, aj pri vyhľadávaní alebo filtri. Hromadný krok možno bezprostredne vrátiť. Jednotlivé výnimky možno upraviť pred spoločným uložením.
- Počty zobrazujú rozpracované označenia. Vyhľadávanie pri ôsmich a viacerých hráčoch ignoruje diakritiku. Filter neoznačených nemení rozsah uloženia.
- Uloženie odošle iba zmenené riadky v jednej transakcii. Úspech sa zobrazí až po potvrdení všetkých riadkov. Chyba ponechá rozpracované údaje v pamäti komponentu; do úložiska prehliadača sa súkromná dochádzka nezapisuje.
- `Zrušiť označenie` funguje aj na už uloženom zázname. História opravy zostáva v audite.
- Obnovenie/odchod cez bežný odkaz upozorňuje na neuložené zmeny. Nejde o offline režim ani o záruku uchovania pri zatvorení procesu, páde prehliadača či navigácii späť v rámci klientského routera.
- Pri konflikte sa zápis celej dávky odmietne. Načítanie aktuálnych záznamov zachová miestne zmeny, ukáže uložený stav dotknutých hráčov a vyžaduje potvrdenie voľby alebo použitie uloženého stavu. Zmiznutie neuloženého hráča zo súpisu je oznámené; jeho zmena sa neuloží.

Plánovaná odpoveď a jej poznámka sú pri hráčovi iba kontext. Zostávajú v `availability` a trénerova dochádzka ich nemení. Hráč/rodič má samostatný formulár plánovanej účasti a iba čítanie vlastnej/rodinnej skutočnej dochádzky.

## Dáta, oprávnenia a migrácia

Migrácia pracovného postupu: `supabase/migrations/20261021201352_coach_attendance_workflow.sql`. Používa existujúcu tabuľku `attendance`, jej primárny kľúč `(event_id, player_id)`, audit a RPC súpisu/histórie; nevytvára druhý systém dochádzky. Po dvoch bezpečnostných migráciách z 22. októbra nasleduje `20261022184845_reconcile_attendance_access.sql`, ktorá zjednocuje ochranné triggery a zachováva opravy histórie po zmene členstva, roly či deaktivácii. Poradie a živé blokátory sú v PROGRESS.md.

- Pridaný stav `late`, nepovinný `reason` a celočíselná `version`. `status = NULL` znamená výslovne neoznačený záznam po oprave; fyzický riadok zachováva verziu, takže nevzniká problém s opätovným vytvorením vymazaného záznamu.
- `save_attendance` je `SECURITY INVOKER`, dostupné iba `authenticated`. Kontroluje aktuálne oprávnenie, stav udalosti, obsah dávky, duplicity a očakávané verzie. Zámok udalosti koordinuje zápis so zrušením; zámky riadkov a verzie chránia opravy. Totožné opakovanie po strate potvrdenia nezdvojuje audit ani verziu.
- Server Action samostatne overuje prihlásenie, aktuálnu rolu, dostupnosť udalosti a pridelenie k tímu. RLS chráni aj priamy Data API prístup. Nepoužíva sa service role ani oprávnenia z používateľom upraviteľného JWT.
- Databázové triggery určujú čas, autora a verziu, zakazujú presun účasti/odpovede na iného hráča alebo udalosť. Udalosť so záznamami dochádzky, dostupnosti alebo internými poznámkami nemožno presunúť do iného tímu.
- Nový zápis vyžaduje aktívneho hráča v aktuálnom tíme. Existujúci záznam zostáva v súpise a aktuálny oprávnený tréner/admin ho môže opraviť aj po odchode či deaktivácii hráča. Úzko obmedzená súkromná funkcia sprístupní meno historického účastníka, nie celý jeho profil. Zrušená udalosť zostáva iba na čítanie.
- Súpis tvorí aktuálne aktívne členstvo a historické záznamy dochádzky. Projekt nemá časovú históriu členstva, takže sa nedohaduje zostava minulého tréningu pre hráčov, ktorí nikdy nedostali záznam. Aktuálni noví členovia sa zobrazia neoznačení.
- Súpis načíta všetky stránky po 25 riadkoch. Nad 1 000 hráčov sa zobrazí chyba namiesto neúplného hromadného zápisu. Chyba ktorejkoľvek stránky nevytvorí čiastočný ani demonštračný súpis.
- História a štatistiky vynechávajú neoznačené riadky. Meškanie sa v súhrnnej účasti ráta ako účasť; história rozlišuje vlastný stav/počet meškaní.
- Deaktivácia a odobratie roly/pridelenia účinkujú bez obnovy JWT. Po odobratí poslednej klubovej roly zaniká aj prístup cez predikát `private.viewer()` a server odmietne vstup do klubu.

Migrácie sú aplikované a overené na potvrdenom testovacom projekte; produkčné nasadenie zostáva samostatná brána. Živá evidencia je uvedená v aktualizácii z 27. októbra vyššie.

## Overenie

- PGlite: nové aj existujúce testy skutočného PostgreSQL/RLS vrátane dávky, opráv, auditu, samostatnej dostupnosti, prázdneho stavu, meškania v štatistikách, konfliktu/verzie, rollbacku celej dávky, opakovania požiadavky, zrušenia, zmeny členstva, rodičovskej väzby, rôznych tímov a okamžitého odobratia prístupu.
- Jednotkové testy serverovej autorizácie, potvrdenia uloženia, validácie a načítania viac ako 25 hráčov vrátane chyby druhej stránky.
- T3 interaktívny náhľad: desktop 1280 × 800, mobil 390 × 844 a 320 × 740. Overené označenie, hromadné označenie, výnimky, dôvod, uloženie, oprava a opätovné otvorenie náhľadu; vyhľadávanie, hromadná akcia pri filtri a vrátenie; chyba uloženia so zachovaním zmien; konflikt s porovnaním uloženého stavu; zrušený tréning. Rozmery a pretekanie boli kontrolované cez DOM. Trvalé ukladanie na živom Supabase týmto nie je overené.
- Náhľad je výlučne `/ukazka?view=udalost` pri `ENABLE_DESIGN_PREVIEW=true`, obsahuje 20 fiktívnych hráčok a nemá Auth ani databázové mutácie. Obnovenie celej stránky údaje v náhľade zmaže.
- T3 `preview_snapshot` pri detaile udalosti opakovane vracia `PreviewAutomationExecutionError`, aj bez obrázka a pri jednom vyfiltrovanom hráčovi. Navigácia, kliknutia, písanie, zmena rozmerov a `preview_evaluate` fungujú. Snímková vizuálna kontrola, fyzický mobil a čítačka obrazovky zostávajú otvorené.
- Skutočné súbežné spojenia, Supabase Auth/PostgREST a celý autentifikovaný prehliadačový tok novej migrácie zostávajú na živé overenie. PGlite overuje konfliktné verzie a rollback; nenahrádza test paralelných požiadaviek na hostovanom PostgreSQL.

Presné záverečné výsledky príkazov sú v [PROGRESS.md](PROGRESS.md).

Záverečný lokálny výsledok: `npm run check` a `npm run build` prešli. `npm test`: **218 prešlo, 3 pôvodné zlyhania**, celkom 221 testov; všetkých 43 nových testov prešlo. Produkčný náhľad na porte 3001 sa tiež načítal s 20 neoznačenými hráčmi, bez vodorovného pretekania na 320 px. Snímkovanie T3 zlyhalo aj pri produkčnej zostave.

## Historické blokátory mimo dochádzky (opravené 22. októbra)

Aktuálne: bezpečnostné opravy sú integrované a celá sada prešla 296/296 testov. Nasledujúci odsek aj výsledok 218/3 vyššie zachytávajú stav pred integráciou. Živé overenie zostáva otvorené; vzdialenú migračnú históriu blokuje Management HTTP 401.

Východiskové `npm test` zlyhalo v 9 testoch (169 prešlo). Táto zmena opravuje 6 z nich. Tri pôvodné regresné testy zostávajú červené: čítanie `profiles.user_id`, `member_details.birth_date` a `announcements.recipient_ids` generickou API rolou pri inak dostupnom zázname. Neboli odstránené, preskočené ani oslabené. Vyžadujú samostatnú úpravu kontraktov čítania/súkromných polí v členoch, autentifikácii a oznamoch; samotné odobratie stĺpcových grantov by poškodilo existujúce časti aplikácie. Tento stav blokuje tvrdenie, že kompletná testovacia sada alebo produkčné bezpečnostné overenie prešli.
