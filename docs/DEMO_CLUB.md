# Lokálna ukážka so skutočným prihlásením

Pripravené 18. 10. 2026 na výslovnú požiadavku používateľa. Údaje sú fiktívne a uložené v samostatnom testovacom Supabase. Existujúce záznamy sa zachovali.

- Prihlásenie: `http://localhost:3000/prihlasenie`.
- Trénerský e-mail a heslo sú iba v ignorovanom `test-results/coach-login.txt`. Nekopírovať ich do dokumentácie, chatu ani Gitu.
- Nový tréner má pridelené dva tímy a 22 hráčok. Tretí ukážkový tím s 8 hráčkami nemá sprístupnený. Nemá finančnú rolu.
- Spolu: 3 tímy, 30 hráčok, 24 udalostí, 90 skutočných dochádzok, 30 plánovaných odpovedí, 6 oznamov, 15 interných poznámok.
- Odpovede vytvoril existujúci testovací rodič pre prepojené fiktívne deti; dochádzku tréner/správca. Nevznikla výnimka z RLS.
- Potvrdený Auth účet sa vytvoril bez odosielania e-mailu. Adresa `example.com` nie je poštová schránka.

## Opakovanie a kontrola

Skript potrebuje súkromnú `.env.live.local`: explicitný `LIVE_TEST_PROJECT_URL` zhodný s aplikačným pripojením, administrátorské a rodičovské testovacie prihlásenie a kľúč pre Auth administráciu. Hodnoty sa nevypisujú. Migrácia poznámok musí byť aplikovaná vopred; seed nemigruje schému.

```powershell
node --use-system-ca scripts/seed-demo-club.mjs --write-test-data
node --use-system-ca scripts/verify-demo-club.mjs
```

Ignorovaný `test-results/club-demo-state.json` obsahuje identifikátory a prístup. Zachovať ho: opakovanie používa tie isté záznamy a neprepisuje následné úpravy v UI. Druhé spustenie bolo overené. Súbor neslúži ako všeobecná záloha databázy. Nevytvárať ďalšiu sadu vymazaním stavu bez zámerného rozhodnutia.

Auth administrátorský klient iba vytvára identitu; bežné klubové záznamy sa zapisujú cez prihlásené admin/coach/guardian klienty pod RLS. Overenie kontroluje rozsah tímov/hráčok, neprístupnosť financií a poznámok iného tímu/rodiča. HTTP skript overuje skutočný Next prihlasovací formulár, SSR stránok, poznámky, značku a odhlásenie. Nevypisuje heslá, cookies ani HTML.

Samostatný `/ukazka` zostáva výslovne označený, bez autentifikácie a bez persistencie. Je dostupný iba s `ENABLE_DESIGN_PREVIEW=true`; nie je náhradou chybných databázových dotazov.
