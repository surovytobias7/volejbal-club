# SMTP a doručovanie pozvánok

Stav 14. 10. 2026: používateľ zatiaľ nemá doménu. SMTP ani doručenie e-mailov nie sú overené. Blokovaná požiadavka na úpravu šablón sa neopakovala. Nákup domény alebo plateného plánu nebol vykonaný.

## Odporúčané riešenie

Odporúčam Resend s vlastnou klubovou doménou a samostatnou odosielacou subdoménou, napríklad `auth.vasa-domena.sk` (iba ilustračný názov). Resend má priamy postup pre Supabase SMTP. Doménu registrujte na klub, s prístupom k DNS a obnovovaniu registrácie; konkrétny názov a cenu musí schváliť klub. Pred objednaním overte aktuálny cenník a limity poskytovateľa.

Supabase potvrdzuje obmedzenie úprav šablón na nových Free projektoch s predvoleným SMTP. Vlastné SMTP rieši aj doručovanie; samotný upgrade Supabase nie je náhradou za jeho nastavenie. Predvolená služba je určená na obmedzené testovanie a neposiela na ľubovoľné adresy.

## Manuálne kroky vlastníka účtu

1. Zaregistrujte zvolenú doménu a získajte prístup k jej DNS. Zatiaľ stačí doména; webhosting netreba kupovať kvôli SMTP.
2. Vytvorte účet Resend a pridajte odosielaciu doménu. Do DNS vložte presne záznamy SPF/DKIM, ktoré zobrazí Resend, a počkajte na overenie. Nastavte aj DMARC podľa pokynov poskytovateľa. Existujúce DNS záznamy neprepisujte naslepo.
3. V Resend vytvorte kľúč na odosielanie, podľa možností obmedzený na túto doménu. Uložte ho v správcovi hesiel. Kľúč neposielajte do konverzácie ani do repozitára.
4. V testovacom Supabase projekte otvorte **Authentication → Email → SMTP Settings**. Zapnite vlastné SMTP a vyplňte:

   | Pole         | Hodnota                   |
   | ------------ | ------------------------- |
   | Host         | `smtp.resend.com`         |
   | Port         | `465`                     |
   | Username     | `resend`                  |
   | Password     | Súkromný Resend API kľúč  |
   | Sender email | Adresa na overenej doméne |
   | Sender name  | Názov klubu               |

5. Uložte nastavenia a overte limity odosielania v oboch službách. Pre prihlasovacie správy vypnite sledovanie odkazov, ak je zapnuté. Oznámte iba stav overenia a nastavenia, nikdy tajné hodnoty.

## Nadväzujúce overenie aplikácie

Až po splnení predpokladov spustiť `node --use-system-ca scripts/sync-auth-templates.mjs`. Skript uloží miestne slovenské TokenHash šablóny a porovná spätné načítanie. Neodosiela poštu.

Použite fiktívny profil s testovacou schránkou, ktorú vlastníte. Pozvánku a obnovu hesla posielajte len na výslovne určenú adresu. Overte doručenie, slovenský obsah, aktiváciu, prepojenie profilu, nové prihlásenie, obnovu hesla a odmietnutie opätovného použitia odkazu. Do evidencie zapisujte výsledky bez hesiel, tokenov a celých odkazov.

Aktuálny `Site URL` je `http://localhost:3000`: odkaz funguje iba na zariadení s bežiacou lokálnou aplikáciou. Kliknutie v telefóne nie je platný test tohto lokálneho nastavenia. Pred testom na inom zariadení treba HTTPS staging origin, zhodné `APP_URL` a povolené Auth návratové adresy. Žiadne produkčné nasadenie zatiaľ nie je schválené ani overené.

## Zdroje overené 14. 10. 2026

- [Supabase: obmedzenie šablón na Free projekte](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)
- [Supabase: vlastné SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend: nastavenie SMTP pre Supabase](https://resend.com/docs/send-with-supabase-smtp)

Úspešné interné TokenHash testy nenahrádzajú doručenie ani kliknutie na doručený e-mail. Pozvánky po čiastočnom zlyhaní, obnova záloh a úplná browserová akceptácia ostávajú samostatné brány.
