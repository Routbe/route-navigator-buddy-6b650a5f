# ROUT: login buttons, public profile and sovereign identity architecture

## Context
- You export the code to GitHub and deploy it on Vercel. Keys live in Vercel; here I'll ask for them through the secure form only to test in the preview.
- Your Neon database stays the source of truth. Lovable Cloud is not used.

## Step 0 — Diagnosis: why the social login buttons disappeared
Findings from the code:
- The sign-in page hides every Google/GitHub/GitLab/Apple/OIDC/Infomaniak button unless the server reports that provider as configured (sign-in page filter on `enabledProviders()`).
- `enabledProviders()` only looks at exact variable names: `GOOGLE_CLIENT_ID`/`_SECRET`, `GITHUB_CLIENT_ID`/`_SECRET`, `GITLAB_…`, `APPLE_…`, `INFOMANIAK_…`, `OIDC_CLIENT_ID`/`_SECRET` + `OIDC_DISCOVERY_URL`.
- Most likely cause (to confirm first): the OIDC-provider work added "hide buttons without keys", and/or the variable names in Vercel differ from these names, so the list comes back empty. The client login (`OIDC_*` = signing in ON rout.be via an external OIDC) and the provider role (signing in VIA rout.be, `src/lib/oauth/provider.server.ts`) share the `OIDC` name, which risks confusion.
- Fix: strict separation — rename the provider-side config to `ROUT_PROVIDER_*` and keep one Better Auth instance for logging in on rout.be; the provider (authorize/token/userinfo/jwks) gets its own module with no shared settings.

## Step 1 — Login buttons always visible
- Always show the full icon grid.
- Provider without keys: no request is sent; show the message "Deze optie is nog niet actief".
- Configured providers, email, Bluesky and Mastodon keep their current flow.

## Step 2 — One profile source, two public views
- Keep `/u/[alias]` (privacy alias) and `/[handle]` (verified identity only). No new routes.
- One central loader for badges, certificates, status and timeline, returning alias or identity fields depending on the URL.

## Step 3 — Public profile extended
- One quiet block: badges + certificates + current status.
- Public timeline, newest first, only permitted milestones.

## Step 4 — Privacy & Public Profile settings
- Toggles: public profile on/off, show timeline on/off (stored in `profiles.display_prefs`); the existing badge setting is still respected.
- A private profile shows visitors nothing; the owner can still manage it.

## Step 5 — Data structure (idempotent Neon migration `db/43_public_activity.sql`)
- `public_activity` (user_id, kind: badge|certificate|status|milestone, payload jsonb with no sensitive data, visibility, occurred_at, source: rout|bluesky|mastodon, external_ref).
- Reuse existing badge events through a combined read.
- Preparatory fields only for Bluesky/Mastodon activity and followers; no feeds fetched.

## Step 6 — Architecture document (your Master Review)
Save `docs/identity-broker-architecture.md` covering:
1. The root cause, plus how logging in ON rout.be and logging in VIA rout.be are kept apart.
2. Neon schema: `users`, `identities` (provider, provider_sub, `display_meta` jsonb captured once at linking: avatar, name, public counts; scopes `openid profile email` only), `oidc_clients`, `oidc_consents`, `oidc_sessions`/codes.
3. Flows: seamless (consent screen with rich identity), strict/merge (new provider + existing email: re-authenticate with an existing method + email OTP before linking; `prompt=login`, `login_hint`, `acr_values`).
4. A stable `sub`: a pairwise, immutable ID per user+client, derived from `users.id`, never from provider IDs.
5. Limits: Vercel function duration and cold starts (use Neon's serverless HTTP driver and pooled `-pooler` URL; no long-lived connections), and JWKS key rotation stored in the database rather than memory.

## Step 7 — Checks
- In the browser: all icons visible, a message for missing keys, a working provider still works, privacy and timeline toggles, `/u/alias` vs `/handle`.
- Leave "Mijn Hooi" out of this. Add no duplicate trophy cabinet.

## Secrets (requested after approval, through the secure form)
`DATABASE_URL` (Neon pooled), `APP_SESSION_SECRET`/`SESSION_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, optional GitLab/Apple/Infomaniak/OIDC. The same names must exist in Vercel → Settings → Environment Variables.

## Technical notes
- Vercel deploy: the current build targets an edge worker. A Vercel preset (Nitro `vercel`) may be needed in `vite.config.ts`; I'll check this and document it, without breaking the Lovable preview.
