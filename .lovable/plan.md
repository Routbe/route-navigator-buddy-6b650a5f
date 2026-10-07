# Developer Console and consent screen for "Login met ROUT"

## What you get
- A dedicated portal at `/console/apps` with its own sidebar, separate from the Developer Hub tabs.
- A redesigned consent screen for end users, with account recognition, a clear list of what the app requests, and an inline verification code step in strict mode.
- A small, isolated backend addition for flow choice and Rich Identity. Logging in on rout.be itself is untouched.

## Part 1 — Developer Console

```text
/console/apps                      App overview (grid of cards + "Nieuwe app")
/console/apps/$clientId            -> redirects to credentials
  ├─ credentials                   Client ID (copy), rotate secret (shown once)
  ├─ branding                      Name, logo URL (live preview), website, privacy, terms
  ├─ redirects                     List of callback URLs: add, remove, validate
  ├─ scopes                        openid / profile / email with explanations + PKCE snippets
  └─ security                      Flow: Seamless | Strict; Rich Identity toggle
```
- Left sidebar per app (Google Cloud style). The top bar shows the app's logo and name and has a "back to overview" link.
- Delete an app from the overview, with confirmation.
- Access works as before: verified accounts only (the existing check).
- In the Developer Hub, the "Login met ROUT" tab is replaced by one short card with an "Open Console" button. The API and MCP tabs stay as they are.

## Part 2 — Consent screen (`/oauth/authorize`)
- A centered obsidian card: the app logo connected to the ROUT logo.
- **"Bestaand account gevonden"**: your profile photo, @handle and email.
- **Transparency**: one plain sentence ("Deze app vraagt toegang tot je e-mail en je openbare profiel") plus a short list per scope. With Rich Identity on, there is an extra opt-in checkbox for public activity, off by default.
- A prominent **"Doorgaan als @handle"** button, with Weigeren next to it.
- **Strict step**: when the app is set to Strict, or the request asks for `prompt=login`, `max_age`, or `acr_values=urn:rout:acr:strict`, an inline 6-digit code field appears. The code is sent by email; Telegram is used if you have it linked. Continuing only works after the code is correct.

## Part 3 — Backend addition (isolated)
- Migration `db/44_oauth_client_flows.sql`, applied only to `oauth_clients`:
  - `flow_preference text default 'seamless'` (`seamless` | `strict`)
  - `rich_identity_enabled boolean default false`
- New table `oauth_step_up_codes` (code hash, user, client, expiry 10 min, max 5 attempts), used only by the consent screen.
- `saveOAuthClient` and `listOAuthClients` gain the two fields.
- `describeAuthorizeRequest` returns `requiresStepUp` and `richIdentity`.
- New `sendStepUpCode` and `verifyStepUpCode`.
- `decideAuthorizeRequest` refuses approval when step-up is required and no valid code was verified. It then puts `acr=urn:rout:acr:strict` in the ID token.
- Rich Identity: `public_activity` data reaches the external app only when the app has it on **and** the user ticked it, through userinfo (`rout_public_activity`, public items only).
- No changes to Better Auth, `/api/auth/*` or the sign-in page.

## Checks
- Tests: the step-up rule (strict app, `prompt=login`, `acr_values`), code expiry and attempt limit, and Rich Identity only with double consent.
- Browser: overview, each app page, saving branding and redirects, and the consent screen in both seamless and strict.
- `docs/identity-broker-architecture.md` updated with the new fields and parameters.

## Technical details
- Routes under `src/routes/_authenticated/console.*`, using the existing auth gate.
- Styling uses existing tokens (obsidian surfaces) with no ad hoc colors.
- Migration 44 is idempotent and applied to Neon with the saved `DATABASE_URL`.
