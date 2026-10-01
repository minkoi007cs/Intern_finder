# Intern Finder: hub and Vercel audit (2026-10-01)

## Scope and evidence

Reviewed the live `intern.minkoi.org` home, demo feed, and signed-in profile UI; the `intern_finder` project settings and access policies in app_system; the active `apps/web` source; and the Vercel Production configuration observed during deployment. No account data was changed during the audit.

## Findings

| Priority | Finding | Evidence and disposition |
| --- | --- | --- |
| P0, resolved | Hub rejected the Production callback origin. | Allowed browser origins contained only `http://localhost:3001`. Added `https://intern.minkoi.org` while retaining localhost; the value persisted after a dashboard reload. A signed-in profile page was subsequently visible on the live domain. |
| P0, resolved in source | Profile writes used a key without `db:write`; updates also sent the wrong `values` shape. | The hub requires `db:write` on a key for insert/update. The web server now uses its secret key for writes while retaining the signed-in user token and owner policies; updates send one object as required by the hub query DSL. |
| P1, resolved in source | The post-login `next` path was checked as a string, but URL parsing can normalize control characters and backslashes into an external redirect. | `safeNext` now rejects those characters and checks the resolved origin before accepting a local path. |
| P1, open | Parallel session refreshes can replay one rotating refresh token when Vercel handles requests on different instances. | `proxy.ts` deduplicates with a process-local `Map`, while the hub revokes a token family on reuse. This needs a cross-instance coordination strategy or hub-supported idempotent refresh before treating long-lived sessions as reliable. |
| P2, resolved in source | The public home page lacked a direct sign-in/profile link. | Added a header link that shows **Sign in** for visitors and **My profile** for a session already present. |
| P2, resolved in source | Production configuration was missing a required hub allowlist step in the deploy guide. | README now names the exact hub dashboard field, Production origin, and callback. `APP_URL` is now required in app code, so an absent value fails clearly instead of silently redirecting to localhost. |
| P2, open | The demo catalog can silently fall back to bundled examples when the hub read fails. | `lib/catalog.ts` catches hub errors and serves local fictional records. This keeps the demo usable, but operators cannot tell from the UI which source supplied the records. Add a non-sensitive source or health indicator before relying on the hub catalog operationally. |
| P3, open | Profile entry asks for comma-separated skills/interests and offers limited guidance on save errors. | The form is usable but long. Skill chips with add/remove controls, inline validation, and a clearer saved-state cue would reduce friction. |

## Product state

The hub has private `student_profiles` and owner-scoped `opportunities` tables plus a narrow public view for 40 fictional demo records. Google and GitHub are enabled in hub Settings. The live feed labels examples and compatibility scores correctly. This is still a demo product: it has no verified live opportunities, resume flow, or application tracker. The older FastAPI/Supabase architecture in `tech.md` remains historical and should be rewritten before using it as the next implementation plan.

## Remaining verification

The live browser showed a signed-in profile page after the origin fix. A profile save and a long-lived session refresh were not exercised during this audit. No automated tests or build were run as part of this review.
