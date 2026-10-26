# Pozvánky a obnova prepojenia účtu

Aktualizované 26. 10. 2026. Lokálna skúška chybových scenárov; doručovanie e-mailov a živá obnova zostávajú neoverené.

## Výsledky pozvania

Pozvánku môže spustiť len aktuálny aktívny administrátor. Server načíta kontakt z profilu, vyžaduje aktívny profil a výslovne neprepojený účet (`account_linked = false`). E-mail ani Auth identifikátor z formulára sa nepoužívajú. Serverový kľúč slúži len na Auth pozvanie; prepojenie zapisuje klient administrátorovej relácie cez `link_member_account` s databázovou kontrolou aktuálnej roly.

| Výsledok | Význam a ďalší krok |
| --- | --- |
| Údaje/oprávnenia nemožno overiť | Pozvanie sa nespustilo. Obnoviť profil a overiť aktívny stav, rolu a kontakt. |
| Chýba konfigurácia | Pozvanie sa nespustilo. Overiť serverový kľúč a adresu aplikácie súkromne. |
| Výsledok pozvania nemožno potvrdiť | Chyba služby alebo spojenia môže nastať až po vytvorení Auth účtu. Najprv skontrolovať Auth a doručovanie, až potom rozhodnúť o opakovaní. |
| Supabase prijal pozvánku, prepojenie nepotvrdené | Žiadosť o doručenie bola prijatá. Databázový zápis mohol zlyhať alebo sa mohla stratiť jeho odpoveď. Obnoviť stránku a overiť skutočný stav. Neposielať ďalšiu pozvánku naslepo. |
| Pozvánka odovzdaná na doručenie | Auth vrátil platnú identitu s rovnakým e-mailom a databáza potvrdila prepojenie. Neznamená to doručenie do schránky. |

Auth a klubová databáza netvoria jednu transakciu. Aplikácia automaticky neopakuje odosielanie, nemaže Auth účty ani nevytvára náhradné profily. Výnimky databázy a SDK sa nevracajú do používateľskej odpovede.

## Obnova administrátorom

1. Overiť správny Supabase projekt a pôvodný členský profil. Zaznamenať iba výsledok incidentu, nie heslá, tokeny ani aktivačné odkazy.
2. Obnoviť detail člena. Ak už je prepojený, v dôveryhodnej administrácii overiť, že ide o zamýšľanú Auth identitu. Pri strate odpovede mohol zápis uspieť. Existujúce prepojenie neprepisovať.
3. Ak prepojenie chýba, v Supabase Auth overiť presnú identitu, e-mail a čas pozvania; porovnať ich s aktuálnym kontaktom zamýšľaného člena. Pri zmene kontaktu, duplicitách alebo nejasnej identite zastaviť obnovu a vyriešiť vlastníctvo účtu. Nevytvárať ďalšie osoby, roly ani rodinné väzby.
4. Pre aktívny neprepojený profil použiť `link_member_account(p_id, p_user)` cez **aktuálnu autentifikovanú administrátorskú reláciu** v dôveryhodnom servisnom postupe. RPC nevytvára Auth účet ani neposiela e-mail. Nevykonávať ho anonymne alebo pomocou serverového kľúča; taký kontext nemá klubového administrátora. Identifikátory získava iba oprávnený správca a nevkladá ich do verejných logov.
5. RPC odmietne neaktívny/prepojený profil, chýbajúcu Auth identitu, identitu použitú iným profilom a odobratú administrátorskú rolu. Pri chybe znovu skontrolovať stav; neobchádzať obmedzenia priamym prepisom profilu.
6. Overiť stav účtu na detaile, audit profilu a prihlásenie pozvaného používateľa s jeho oprávneniami. Ak je potrebná obnova hesla alebo nová správa, použiť samostatný schválený postup doručovania na určenú testovaciu adresu.

Nepripojená Auth identita nemá klubový kontext ani prístup k záznamom. Prepojenie nepridáva roly ani tímy; využije už existujúci profil. Tento postup zostáva manuálny, bez automatického vyhľadávania účtov podľa e-mailu.

## Overenie

- `tests/unit/invitation-actions.test.ts`: skutočný dispatcher s izolovanými náhradami Auth/DB; role, podvrhnuté polia, neznámy stav účtu, neplatný kontakt, chybné čítanie/konfigurácia, vrátené aj vyhodené chyby odoslania/prepojenia a nesúlad identity. Žiadna sieť ani pošta.
- `tests/integration/authorization.test.ts`: PGlite vykonáva migrácie a preveruje izoláciu nepripojenej identity, obnovenie prepojenia a audit, jedinečnosť Auth identity a odobratie oprávnenia bez obnovy JWT.
- Otvorené: hosted Auth/PostgREST, skutočné paralelné pozvánky, výpadok po prijatí správy, doručenie SMTP a manuálna obnova na vyhradenom testovacom projekte. Lokálne testy tieto výsledky nenahrádzajú.
