# ROUT — roadmap

## Klaar
- Gratis pagina bij registratie: elk account krijgt meteen `rout.be/u/<handle>`
  (gekozen naam of automatisch, bv. `jona4827`), met vangnet bij het openen van
  de Studio.
- Tweede pagina bij verificatie: gratis `/u/`-pagina blijft, geverifieerd
  profiel verhuist naar `voornaam.achternaam` (of de eerstvolgende vrije vorm).
- Roze influencerbadge + bedrijfsbetekenis voor de zwarte badge.
- Bedrijfsverificatie: aanvraagformulier (naam, rechtsvorm, btw, adres, domein)
  met manuele goedkeuring; pagina op de officiële domeinnaam.
- Influenceraanvraag: vier naamvoorkeuren + sociale kanalen, € 70 of gratis bij
  een geverifieerd account, goedkeuring in beheer (`/admin/verifications`).

## Openstaand (wacht op jou)
- Migratie `db/41_business_influencer.sql` één keer op de Neon-database
  uitvoeren (de app maakt de tabellen anders zelf aan bij het eerste gebruik).
- Betaling van € 70 voor influenceraanvragen koppelen aan de bestaande
  betaalketen; nu blijft zo'n aanvraag op "wacht op betaling" staan.

## Nieuw verzoek — veilig verder uitwerken
- [ ] Mastodon-login afronden en foutmeldingen tonen.
- [ ] Bestaande auth/build-problemen controleren zonder regressies.
- [ ] ROUT Developer Console en OAuth/OIDC-provider veilig ontwerpen en bouwen.
- [ ] Sovereign Wallet, credential-uitgifte en publiek tonen veilig ontwerpen en bouwen.

## Login & ontwikkelaars (okt 2026)
- [x] Preview-/lokale adressen vertrouwd, knoppen zonder sleutels verborgen, Neon Auth-pakket weg.
- [x] Browsertest: registreren, sessie, uitloggen, fout wachtwoord, Infomaniak-doorsturing.
- [ ] "Login met ROUT" volledige ronde testen met een geverifieerd testaccount.
- [ ] WhatsApp/Green-API schrappen; Telegram + sms als verificatie.
- [ ] Bestaande Telegram-fout oplossen; verificatiecontrole elke 2,5 s.
- [ ] Pagina 'Account beveiligen' afmaken + Telegram-webhook koppelen (Telegram-bot nodig).

## Login-knoppen & openbaar profiel (okt 2026)
- [x] Alle inlogknoppen altijd zichtbaar, melding bij ontbrekende sleutel.
- [x] Privacy & Openbaar Profiel: profiel aan/uit, tijdlijn aan/uit.
- [x] Openbare tijdlijn (badges + mijlpalen) op /u/alias en /handle.
- [x] Architectuurdocument identity broker (docs/identity-broker-architecture.md).
- [ ] Migratie `db/43_public_activity.sql` op Neon uitvoeren (wacht op jou).
- [ ] Sleutels in preview/Vercel zetten om providers live te testen (wacht op jou).
