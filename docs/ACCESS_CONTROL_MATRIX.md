# Access control, architecture and privacy audit

Audit started 2026-10-19; implementation and local verification updated 2026-10-22. This is a product policy and verification register, not a production-security or GDPR certification. Existing changes were retained on `feature/authenticated-workflow-acceptance`. No production records are fixtures.

## Authority and scope

Aktualizácia 27. 10. 2026: testovací Supabase má potvrdených **23 migrácií / 19 RLS tabuliek / 27 RPC**. Nový živý dôkaz pokrýva osobnú/rodinnú dochádzku, odmietnuté cudzie zápisy, interné poznámky, admin audit, súbeh a okamžitú revokáciu. T3 potvrdilo hráčsky/rodičovský rozsah a zákaz členského adresára. Presné prípady a nevykonané hranice sú v [LIVE_ATTENDANCE_NOTES.md](LIVE_ATTENDANCE_NOTES.md); lokálne označenie T/U nižšie samo osebe neznamená živé overenie všetkých kombinácií rolí.

`AGENTS.md`, `PRODUCT.md`, `docs/DATABASE.md` and the user's approved internal-notes scope are authoritative. Four **additive** roles: administrator (A), coach (C), player (P), guardian (G). Permissions combine only for the records justified by each role. Coaching never grants financial access. An Auth account alone does not establish a club role. Current database identity, active status, roles and relationships must be rechecked; JWT role metadata is not authoritative.

Scopes: **club** = entire club; **teams** = current assigned coaching teams; **own** = current person's records; **children** = explicit current guardian links; **shared** = relevant team/club communications; **forbidden** = no access. An archive does not broaden scope. Personal historical attendance remains readable after leaving a team; it does not restore access to that team's current schedule or other players. Changing/removing a relationship is administrative and audited.

Read includes direct Data API/RPC, embeds, counts, search, filters and cursor pages. A readable record does not imply permission to edit it. No general approval workflow exists. Administrative creation/assignment is the authorization step. No implemented bulk export, file upload, payment gateway, public team directory or chat exists; those are not implicitly authorized by a table's read permission.

## Implemented inventory

| Surface / route | Data and important operations |
| --- | --- |
| `/`, `/prihlasenie`, `/obnova-hesla`, `/nove-heslo`, `/auth/confirm`, `/auth/callback`, `/nastavenie` | Login/logout, recovery, invite confirmation, session/password activation, configuration status. Redirects are allowlisted. |
| `/klub` | Scoped dashboard, upcoming events, pending responses, attendance aggregates, family pagination, finance totals, administrator recent audit. Self reminder refresh. |
| `/klub/clenovia`, `/klub/clenovia/[id]`, `/klub/profil` | Directory/search, own/authorized contact view, member create/edit, active status, roles, Auth invitation/link, family-link creation/removal, internal player notes. |
| `/klub/timy`, `/klub/timy/[id]` | Active/archive directory, scoped roster and program; admin team create/edit/archive/restore and coach/player membership assignment/removal. |
| `/klub/kalendar`, `/klub/kalendar/[id]` | Month/week/agenda, date/team/type/child filters, paginated roster, recurring event batch, individual edit/status, match details, availability, actual attendance, reminders, training notes. |
| `/klub/dochadzka` | Read-only actual attendance history/search/status/player filters and complete scoped statistics; corrections occur in event detail. |
| `/klub/oznamy` | Club/multi-team/named-recipient notices, create/edit/archive, priority, search and pagination; audience expansion notifications. |
| `/klub/notifikacie` | Own scoped notification history, mark read, reminder generation; current source/relationship recheck. |
| `/klub/platby`, `/klub/platby/[id]`, `/klub/platby/plany` | Plans and archive/restore, dated charges, corrected totals, payments, whole-entry reversal, immutable adjustment history, scoped complete aggregates/cursors. |
| `/klub/nastavenia`, `/klub/audit` | Club identity/contact/venue/categories; immutable administrative audit, actor names. |
| `/ukazka` | Explicit fictional design preview, feature-gated and isolated from authentication. Never a fallback after a failed database query. |
| Server-only infrastructure | User-session Supabase client, `requireViewer`, mutation dispatcher, note action, selector action, CSP/no-store proxy, narrow Auth-admin invitation client, trusted scheduled reminder worker. No application Storage use. |

### Database entities (19)

`profiles`, `member_details`, `user_roles`, `club_settings`, `teams`, `team_memberships`, `guardian_players`, `event_series`, `events`, `availability`, `attendance`, `announcements`, `fee_plans`, `charges`, `payments`, `charge_adjustments`, `notifications`, `audit_logs`, `internal_notes`.

### Public RPC inventory (27 locally and on the test project)

Writes: `create_member`, `edit_member`, `update_own_profile`, `create_event_batch`, `refresh_my_reminders`, `send_event_reminders`, `link_member_account`, `save_attendance`.

Reads: `finance_summary`, `charge_page`, `payment_page`, `dashboard_summary`, `member_page`, `team_page`, `attendance_page`, `announcement_page`, `selector_options`, `event_roster_page`, `team_roster_page`, `calendar_page`, `guardian_dashboard`, `can_access_internal_notes`, `internal_notes_page`, `viewer_context`, `member_private_details`, `audit_actor_names`, `can_manage_announcement`.

All must be authenticated-only. Public invokers retain RLS; private definer helpers must use an empty search path, qualified names and caller-derived identity with explicit scope checks. The bulk reminder worker and trigger functions are not callable by application roles. Graphify traced `requireViewer` into pages, selectors and actions; source review supplements the graph because it predates notes and branding. No extraction/rebuild was needed.

## Aktuálna matica oprávnení

Rozsahy sa sčítajú podľa platných rolí a väzieb. Nasledujúce opravy sú **implementované a overené lokálne**; migrácie sú aplikované aj na teste. `T` = PostgreSQL/RLS v PGlite; `U` = unit/mocked server alebo route test. Živé dôkazy z 27. októbra vyššie dopĺňajú vybrané prípady; nevzťahujú sa automaticky na každý riadok matice.

| Údaj / operácia | Administrátor | Tréner | Hráč | Rodič | Ochrana a dôkaz |
| --- | --- | --- | --- | --- | --- |
| Členský adresár | Celý klub, správa | Dostupné profily, čítanie | Bez adresára | Bez adresára | Server route + scoped `member_page`; T/U |
| Profil a kontakty | Celý klub | Priradené tímy + rozsahy ďalších rolí | Vlastný profil | Vlastný profil a prepojené deti | RLS aj detail podľa ID; T |
| Vlastné meno/telefón | Vlastné alebo administrácia | Vlastné | Vlastné | Vlastné | Úzke `update_own_profile` bez zmeny roly/dátumu/identity; T |
| Presný dátum narodenia | Správa klubu | Vlastný, nie trénovaných členov | Vlastný | Vlastný a prepojených detí | Žiadny všeobecný SELECT; autorizované RPC; T |
| Auth ID / stav účtu | Stav prepojenia; úzke prepojenie a auditné mená | Cudzie Auth ID ani stav účtu nie | Auth ID sa nevracia | Auth ID sa nevracia | Column grants blokujú aj WHERE/filter; admin RPC; T |
| Roly, deaktivácia, členstvá | Správa; zákaz vlastnej demócie/deaktivácie | Povolené čítanie | Vlastné roly/členstvo | Povolené členstvo detí | Admin server guard a RLS; T/U |
| Rodinné prepojenia | Vytvorenie/odobratie | Bez rodinnej administrácie | Vlastná väzba | Iba vlastné aktuálne väzby | Aktuálna guardian rola nutná aj pri zachovanej coach role; T/U |
| Tímy a archív | Celý klub, správa/archivácia | Priradené + osobný rozsah na čítanie | Vlastné tímy | Tímy detí | RLS; nepoužívaný DELETE odobratý; T |
| Súpiska | Celá | Súpiska vedených tímov | Vlastné členstvo | Členstvo detí | Scoped roster RPC, filtre a stránkovanie; T |
| Kalendár a detail | Celý klub | Vedené + osobne dostupné tímy | Vlastné tímy | Tímy detí | RLS aj pre súhrny/počty; T |
| Udalosť, séria, stav, pripomienky | Správa klubu | Iba vedené tímy | Bez správy | Bez správy | Server overuje aktuálny aj nový tím; RLS; T/U |
| Presun udalosti do iného tímu | Iba bez odpovedí, dochádzky a poznámok | Navyše musí viesť oba tímy | — | — | DB trigger a zámok zápisov; sériové T, hosted súbeh čaká |
| Plánovaná odpoveď a dôvod | Čítanie; odpoveď iba s vlastnou player/guardian rolou | Čítanie tímu; odpoveď iba s vlastnou player/guardian rolou | Vlastná odpoveď | Odpoveď prepojeného dieťaťa | Aktívny hráč/členstvo, nezrušená udalosť; T/U |
| Skutočná dochádzka | Evidencia/opravovanie v klube | Evidencia vedených tímov | Vlastné údaje, čítanie | Údaje detí, čítanie | Samostatná tabuľka, nemenné event/player kľúče, DB actor/time; T/U |
| História/štatistiky účasti | Celý klub | Vedené tímy | Vlastná história aj po odchode z tímu | História detí do revokácie väzby | RLS, kompletné SQL agregáty a kurzory; T |
| Poplatky, platby a opravy | Správa klubu | Samotná coach rola žiadne financie | Vlastné od 18 rokov; bez dátumu nie | Iba prepojené deti | RLS + aktuálne `can_finance` pre route/navigation; T/U |
| Platba, storno, oprava sumy | Append-only s auditom, limitmi a row lock | — | — | — | Admin guard, DB timestamp/actor, integer centy, audit; T/U |
| Oznamy a archív | Klub/tímy/osoby, správa | Publikovanie/úprava len ak vedie všetky cieľové tímy | Relevantné oznamy | Relevantné oznamy | Server preverí staré i nové publikum; RLS; T/U |
| Adresáti oznamu | Správa publika | Iba oprávnene spravované publikum | Ďalší adresáti skrytí | Ďalší adresáti skrytí | Column grant + bounded scoped RPC; T |
| Upozornenia | Vlastné/aktuálny rozsah | Vlastné/aktuálny rozsah | Vlastné/aktuálny rozsah | Vlastné/aktuálny rozsah | Preverenie zdroja/väzby, iba vlastný read timestamp; T |
| Interné poznámky | Čítanie/vytvorenie/úprava | Priradený tréner číta/vytvára; upravuje iba autor | — | — | RLS, server, nemenný kontext/autor, verzia/audit; T/U; hosted matrix čaká |
| Nastavenia, audit, pozvánky | Administrácia | Iba zdieľaná klubová identita | Iba zdieľaná identita | Iba zdieľaná identita | Admin guard/RLS; úzke account-link RPC; T/U; doručovanie a partial failure čakajú |
| Deaktivovaný/neprepojený/bez roly | Žiadny klubový prístup | Žiadny klubový prístup | Žiadny klubový prístup | Žiadny klubový prístup | Aktuálny profil a rola v `private.viewer()`, bez refresh JWT; T |
| Anonymný návštevník | Žiadny klubový prístup | Žiadny klubový prístup | Žiadny klubový prístup | Žiadny klubový prístup | RLS/grants; preview oddelený; T + existujúci live preflight |

## Opravené nálezy a hranice overenia

1. Deväť existujúcich auditných testov reprodukovalo reálne chyby: dva presuny súkromného kontextu cez udalosť, dve zmeny event/player väzby, falšovateľný čas, tri nadbytočné čítania citlivých polí a prístup bez roly. Všetky prechádzajú; testy sa neoslabili.
2. Server Actions overujú aj viditeľné, ale nespravované zdroje. Čítanie tímu cez dieťa alebo vlastné členstvo nedáva právo evidovať dochádzku.
3. Oprávnené osobné údaje používajú úzky RPC. Staršia regresia vlastného profilu číta dátum cez nový kontrakt a naďalej dokazuje, že neoprávnená zmena nič nezmenila. Priamy SELECT má samostatné negatívne testy.
4. Caller-only RLS podmienky používajú statement-local init plans; stav účtu sa počíta iba pre stránku. Kompletné súhrny a stránkovanie nad 1 000 záznamov prechádzajú bez zvýšenia 20-sekundového limitu.
5. Obmedzené nepoužívané DELETE grants; odstránený iba duplicitný auditný trigger oznamov. Žiadne záznamy sa nemažú. Finančné korekcie/audit a bezpečné archivovanie zostávajú.


## Privacy decisions

- **Current safe rule:** assigned coaches receive names/contacts without exact birth dates. The API now enforces this. Broader coaching access would require a club decision; personal/guardian roles retain their own scope.
- **Awaiting club decision:** guardian access after a child's 18th birthday. Existing documented behavior retains an explicit link until admin revocation; no automatic new sharing or consent is inferred.
- **Before deployment:** club management must define retention periods and lawful administrative processes for account removal, attendance, financial ledgers, notes, audit snapshots and backups; who can approve an erasure/export; verification of guardian authority; access review and staff departure procedures. No speculative automated erasure or export implemented.
- Internal notes keep the previously approved single private scope. No public/shared note type or medical dossier added. Note/absence text should describe useful sporting context without unnecessary health or family detail.

## Evidence register

- `npm test -- --reporter=dot`: **250 passed / 14 files**. **161 PostgreSQL/RLS tests in PGlite**, **89 unit/mocked tests**, including 37 Server Action authorization and 5 direct route denials. This does not prove independent hosted concurrent sessions or browser mutations.
- Local schema: 20 migrations / 19 RLS tables / 26 public RPCs. The two 22 October migrations preserve records and existing history; earlier migration files are unchanged.
- Existing hosted schema: 11/11 preflight and 64/64 legacy-contract Auth/PostgREST checks passed on 22 October. After updating the runner for the new contract: 26 passed, 5 blocked by missing `viewer_context` (`PGRST202`). **New fixes have not been verified on hosted Supabase.**
- `npm run db:status`: blocked by Management HTTP 401; direct DB hostname returned ENOTFOUND. The last documented applied history is 18 migrations on 18 October. Current history/order must be verified before applying the two pending local migrations; no remote changes were made here.
- T3 UI evidence and final check/build status are recorded in PROGRESS.md. Preview/navigation inspection is separate from real authorization acceptance. No production deployment/readiness claim.

Technical references: [Supabase RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security). Both grants and row policies must permit an operation. Statement-local caller predicates improve query cost without introducing cross-request authorization caches.
