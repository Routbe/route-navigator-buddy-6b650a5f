<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Architecture rules
- Neon (`DATABASE_URL`) is the only database; schema changes are idempotent files in `db/NN_*.sql`. Why: the app is deployed on Vercel outside Lovable Cloud.
- Login ON rout.be (Better Auth, `better-auth.server.ts`) and login VIA rout.be (OIDC provider, `src/lib/oauth/*`) never share config; provider env vars use the `ROUT_PROVIDER_*` prefix. Why: prevents one role breaking the other.
- Sign-in tiles are always rendered; unconfigured providers show a notice instead of sending a request. Why: missing keys must never hide options.
- Public profile visibility (`publicProfile`, `timelineVisible` in `display_prefs`) is enforced server-side in the public profile/timeline server functions. Why: client checks alone leak data.
