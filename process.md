# OpportunityOS — development and commit log

This is the canonical log requested for `process.md` and `proccess.md`. Read it before each work session and commit, as required by [tech.md](./tech.md). Append one entry per meaningful commit. Record only changes and checks actually made; Git is the authority for commit hashes.

## Entry template

```text
### YYYY-MM-DD — <commit subject>
- Roadmap phase / status:
- Intent:
- Files changed:
- Behavior or architecture changed:
- Checks run and results:
- Limitations / risks:
- Next step:
```

## Entries

### 2026-10-01 — fix: use Node JWK type for sync verifier

- Roadmap phase / status: First live-source deployment failed during TypeScript checking; correction pending redeploy.
- Intent: Fix the GitHub OIDC verifier key type reported by Vercel.
- Files changed: `apps/web/lib/github-oidc.ts`, process log.
- Behavior or architecture changed: Import Node's `JsonWebKey` type so `createPublicKey` receives its expected shape with the index signature; signature checks and trust conditions are unchanged.
- Checks run and results: Vercel compiled the previous commit but reported TS2345 at `createPublicKey` in the verifier; the Node type declaration was inspected to identify the mismatch. No local automated tests were run.
- Limitations / risks: Production remains on the prior successful deployment until a new build is Ready. The sync workflow has not yet run.
- Next step: Push the type correction and confirm Vercel Production builds successfully before starting the first sync.

### 2026-10-01 — feat: add hourly public internship source sync

- Roadmap phase / status: Opportunity catalog ingestion implemented for a curated US student-job source set; first Production workflow run and live feed verification still pending.
- Intent: Replace the demo-only discovery path with current employer-source internships and early-career listings, while keeping samples clearly separate and avoiding unauthorized Handshake collection.
- Files changed: Next.js source adapters, hub query helper, OIDC-protected sync route, catalog/feed/detail UI, GitHub Actions hourly schedule, README, architecture plan, and process log.
- Behavior or architecture changed: GitHub Actions requests a short-lived signed OIDC token and runs each Greenhouse/Lever source separately at minute 17 hourly. The server verifies the workflow identity, fetches published US student roles, normalizes and upserts them into the existing hub `opportunities` table, and retires source listings that disappear. Live results require verification within 72 hours. Feed adds live/sample switching, recently posted/checked sorting, original application links, provenance, and freshness labels.
- Checks run and results: Read official Greenhouse, Lever, GitHub Actions OIDC/schedule, Vercel cron, and Handshake terms. Read the existing hub schema through its server API and inspected candidate source boards for published student roles. No local automated tests or profile data changes were made.
- Limitations / risks: GitHub schedule can be delayed or skipped; this is a curated set, not every employment site. Greenhouse does not provide a reliable publication date for all jobs, so those results use verification time. The first live workflow and Vercel deployment still need to run; Handshake requires an authorized integration. The hub raw-query endpoint bypasses row policies, so SQL is fixed and server-only and restricted to public `opportunities` data.
- Next step: Commit and push, wait for Production Ready, manually start the first workflow, confirm imported live records appear, then monitor the first scheduled run.

### 2026-10-01 — fix: use write-scoped key for profile persistence

- Roadmap phase / status: Production sign-in works; private profile persistence had an authorization error on save.
- Intent: Repair profile insert and update through the hub data API after the user reported `key does not carry db:write for insert`.
- Files changed: `apps/web/lib/hub.ts`, `apps/web/lib/student-server.ts`, README, and the hub/Vercel audit note.
- Behavior or architecture changed: Server-side data reads keep using the publishable key. Insert, update, and delete require a signed-in access token and use the server-only secret key, while the hub still enforces owner policies. Profile updates now send a single object in `values`, as required by the hub query DSL.
- Checks run and results: Reviewed the hub data route, key scopes, and query parser against the failing request. `git diff --check` was used before commit. No automated test, profile write, or build was run locally.
- Limitations / risks: The user's profile data was not changed during the fix; they must save it after the new Vercel deployment is Ready. The long-lived refresh concurrency risk remains open.
- Next step: Push to GitHub, confirm the Production deployment is Ready, and have the user retry Save profile.

### 2026-10-01 — fix: allow Production login and harden deploy flow

- Roadmap phase / status: Production hosted sign-in is reachable; the active product remains a fictional demo with private profile support.
- Intent: Remove the hub origin rejection, audit the deployed UI and active Next.js code, and address immediate login and navigation issues.
- Files changed: Hub Allowed Origins setting outside Git; `apps/web/lib/hub.ts`, `apps/web/app/page.tsx`, `README.md`, and `AUDIT_HUB_VERCEL_2026-10-01.md`.
- Behavior or architecture changed: Registered `https://intern.minkoi.org` alongside localhost in the hub; restricted post-login return paths to the app origin; required `APP_URL`; added a session-aware home sign-in/profile link; documented the hub deployment step.
- Checks run and results: Hub Overview retained both origins after reload. The live browser showed a signed-in profile page and 40 labeled fictional feed records. Code and UI were inspected; `git diff --check` was used before commit. No automated test or build was run.
- Limitations / risks: Profile save and token refresh across Vercel instances were not exercised. The process-local refresh deduplication may not protect against simultaneous requests on separate instances. The source edits still require a Vercel deployment.
- Next step: Push the changes, confirm Vercel deploys the new commit, then ask the user to save a profile and report any callback or refresh error.

### 2026-10-01 — docs: record Production hub auth repair

- Roadmap phase / status: Production hosted sign-in starts successfully; full user login and profile save remain for the user to check.
- Intent: Record the Vercel configuration that repaired HTTP 500 on `/auth/login`.
- Files changed: Process log. Vercel Production environment variables and deployment were changed outside Git.
- Behavior or architecture changed: Added `NEXT_PUBLIC_INFRA_URL`, `NEXT_PUBLIC_INFRA_PUBLISHABLE_KEY`, `INFRA_SECRET_KEY` as a Secret, `APP_URL=https://intern.minkoi.org`, and `HUB_PUBLIC_CATALOG_ENABLED=true` to the `intern-finder` Vercel project's Production environment. Redeployed commit `67ed2b8` without build cache.
- Checks run and results: Vercel showed the new deployment Ready with `intern.minkoi.org` assigned. The Google and GitHub login routes each returned HTTP 303 to `https://system.minkoi.org/authorize` with `redirect_uri=https://intern.minkoi.org/auth/callback`; the flow cookie had `httpOnly` and `Secure` attributes. No key, token, or cookie value was printed.
- Limitations / risks: The provider callback and a user profile save have not been completed end to end after redeployment. The catalog contains fictional demo records.
- Next step: User signs in with Google or GitHub on the live site and saves a profile; inspect logs if the provider callback reports a new error.

### 2026-10-01 — docs: explain Vercel hub environment setup

- Roadmap phase / status: Production authentication diagnosis; fix pending authorization to store the existing hub keys in Vercel.
- Intent: Explain why the deployed app cannot start hosted sign-in and record the required Production configuration.
- Files changed: README and process log.
- Behavior or architecture changed: No runtime change. Documented five Production variables and the production callback URI.
- Checks run and results: `https://intern.minkoi.org/auth/login?provider=google` returned HTTP 500. Vercel logs reported `INFRA_SECRET_KEY is not set`. Vercel's project environment list contained only older Supabase/FastAPI variables, and hub Settings showed Google and GitHub enabled. Official Vercel documentation confirms environment changes require a new deployment.
- Limitations / risks: The Production hub secret is not yet stored in Vercel; login stays broken until authorization, environment setup, and redeployment are complete.
- Next step: With approval, import the existing hub keys into Vercel Production and redeploy; then confirm the login route redirects to the hub.

### 2026-10-01 — docs: enable approved public demo view

- Roadmap phase / status: Hosted sign-in, private profile schema, and hub-backed fictional catalog configured locally.
- Intent: Finish the explicitly approved anonymous read policy on the narrow demo view and document the resulting setup.
- Files changed: README, architecture note, and process log. Local `apps/web/.env.local` was updated but remains gitignored.
- Behavior or architecture changed: Enabled anonymous `select` on `public_demo_opportunities` only; `opportunities` and `student_profiles` retain owner-only table policies. Set `HUB_PUBLIC_CATALOG_ENABLED=true` locally in both checkouts.
- Checks run and results: Hub Access Control showed 9 policies and its visitor simulator allowed `select` on the demo view. A publishable-key HTTP request without a user token returned 40 view rows (200); the same request to `student_profiles` returned 401 `UNAUTHENTICATED`.
- Limitations / risks: Catalog records are fictional. Profile persistence has not been confirmed with a user-entered profile; no deployment is configured here.
- Next step: Have a user save a real profile and check it reopens correctly; deploy when requested.

### 2026-10-01 — docs: record completed hub schema setup

- Roadmap phase / status: Hub schema and fictional seed complete; public view policy pending final confirmation.
- Intent: Record the hub changes made after the user completed recent second-factor verification.
- Files changed: README and process log.
- Behavior or architecture changed: Added a unique index on `student_profiles.owner_id`, created the narrow `public_demo_opportunities` SQL view, and inserted 40 idempotent fictional listings into `opportunities`. The web feed still uses its bundled catalog because the anonymous view policy is not active.
- Checks run and results: SQL Studio reported 0 rows affected for the index and view, and 40 rows affected for the seed statement.
- Limitations / risks: The public-read policy remains pending action-time confirmation. No live opportunities were added.
- Next step: Add and verify the view-only anonymous select policy, then enable hub catalog reads locally.

### 2026-10-01 — feat: connect active web app to app_system hub

- Roadmap phase / status: Identity/profile integration in progress; public demo catalog remains available.
- Intent: Use the new `intern_finder` hub project for hosted sign-in and owner-scoped student profiles while keeping the opportunity demo usable during hub policy setup.
- Files changed: Next.js hub client, proxy, profile and catalog routes, demo scoring/data, local city lookup, environment example, README, and architecture note. Created `student_profiles` and `opportunities` in the hub console.
- Behavior or architecture changed: The active Next.js app runs on port 3001, exchanges PKCE authorization codes server-side, refreshes sessions in the Next.js proxy, persists profiles through the hub data API, and serves a bundled fictional catalog while the hub `opportunities` table is empty or inaccessible. The previous FastAPI implementation is retained but no longer used by the web app.
- Checks run and results: `npm run typecheck` and `npm run build` passed. Local HTTP checks returned 40 fictional recommendations, unauthenticated profile access returned 401, and city suggestions returned results. Hosted hub sign-in reached the profile page. No profile write was made with personal data.
- Limitations / risks: Automatic approval review blocked adding a public-read policy to `opportunities` because it exposes every column. The web app now targets a narrow `public_demo_opportunities` view, but creating the view and its anonymous-read policy still needs explicit approval. The hub required a fresh second-factor check before adding a unique profile index or seeding the empty catalog table. Resume upload, live listing ingestion, and application tracking are not part of this integration.
- Next step: Complete the hub's second-factor check, add the profile index and demo seed, obtain approval for the narrow public demo view, verify private profile save with a user-entered profile, and deploy when requested.


### 2026-09-22 — docs: define OpportunityOS architecture and development log

- Roadmap phase / status: Phase 0, completed for the initial architecture and process baseline.
- Intent: Establish a detailed implementation plan and an auditable commit process before application code.
- Files changed: `tech.md`, `process.md`, `proccess.md`.
- Behavior or architecture changed: Selected a Next.js + FastAPI modular monolith, Supabase Auth/PostgreSQL/Storage, deterministic weighted ranking, and a phased MVP. Defined data flow, normalized schema, endpoint contract, privacy/security rules, gates, and roadmap.
- Checks run and results: Reviewed the supplied product brief and checked that the working directory initially had no project files. Documentation has not yet been implemented or runtime-tested.
- Limitations / risks: Specific dependency versions and source integrations are selected during implementation; hosted credentials are not present.
- Next step: Commit this documentation baseline, then scaffold a running frontend and backend foundation.

### 2026-09-22 — feat: scaffold web and API foundation

- Roadmap phase / status: Phase 1, in progress; source scaffold exists, runtime acceptance gate remains open.
- Intent: Add the first frontend and backend application structure after documenting the plan.
- Files changed: `.gitignore`, `.env.example`, `README.md`, `frontend/package.json`, frontend Next.js configuration and landing page, `backend/requirements.txt`, FastAPI config/database/health files, health test, `tech.md`, `process.md`.
- Behavior or architecture changed: The frontend has a responsive student-facing landing page with a labeled demo CTA and explicit compatibility-score wording. The API has a versioned health route, CORS configuration, and SQLAlchemy database engine using SQLite locally or PostgreSQL by environment variable. A minimal health test is included.
- Checks run and results: Python source compilation passed using a writable bytecode cache; frontend JSON config parsed successfully. `npm install --offline` failed because cache metadata was incomplete. Online npm/pip installation could not reach the package registries, so the frontend build, API startup, and pytest could not yet run.
- Limitations / risks: Dependencies are not installed; database schema/migration and a working opportunity feed are next. The current landing demo CTA points to a future page.
- Next step: Commit the scaffold, then implement the opportunity model, marked demo records, deterministic ranking, and feed in focused changes.

### 2026-09-22 — feat: add demo catalog and explainable recommendation feed

- Roadmap phase / status: Phases 3 and 4, in progress as a read-only demo; Phase 1 runtime gate remains open.
- Intent: Make the planned opportunity and ranking architecture concrete without exposing unauthenticated personal data.
- Files changed: `backend/app/models/opportunity.py`, first Alembic migration, demo seed command, opportunity response schemas/routes/services, `backend/app/ml/ranking.py`, ranking checks, frontend feed/detail routes, shared API types/client, `README.md`, `tech.md`, `process.md`, and frontend dependency manifest.
- Behavior or architecture changed: Added normalized organizations/skills/opportunities tables, an idempotent 40-record fictional seed, demo-only list/detail/recommendation routes, and deterministic weighted scoring with evidence and skill gaps. The frontend displays a searchable/category-filtered sample feed and detail view with a compatibility explanation. Updated Next.js dependency to the official August 2026 security release version 16.3.3; the API remains read-only for the demo.
- Checks run and results: Python source compilation passed. Four dependency-free ranking checks passed (alias normalization, skill gaps, neutral empty requirements, and location/distance). Dependency installation remains unavailable, so the database migration, HTTP routes, and frontend build have not been run. The Next.js version choice was checked against the official release advisory at https://nextjs.org/blog.
- Limitations / risks: No sign-in or persisted student profile yet; ranking uses a clearly labeled sample persona. Demo opportunities are fictional and have no application link. Package installation and end-to-end verification require registry access.
- Next step: Commit this vertical demo slice; once dependencies can be installed, run migration/seed, API tests, and frontend build, then add authenticated editable profiles.

### 2026-09-22 — feat: add authenticated student profiles and personal ranking

- Roadmap phase / status: Phase 2, in progress; authenticated profile code exists but acceptance requires real Supabase configuration and runtime tests.
- Intent: Add private, editable student profiles and rank the demo catalog from confirmed user data.
- Files changed: `.env.example`, `README.md`, `backend/requirements.txt`, JWT verification/config, user/profile/student-skill models and migration, profile schemas/routes, personal recommendation routes, profile security tests, frontend Supabase auth client, login/profile pages and API clients, feed/detail integration, `tech.md`, `process.md`.
- Behavior or architecture changed: Email/password and Google sign-in use the Supabase browser client. FastAPI verifies asymmetric Supabase JWT signatures, issuer, audience, expiry, role, and user ID before profile access. Profiles are keyed by the verified user ID; skills are stored in a normalized join table. PostgreSQL migration enables RLS and revokes browser roles' direct access to private tables. Signed-in users can edit profiles and receive scores from their saved fields; unauthenticated visitors keep a clearly marked sample experience.
- Checks run and results: Python source compilation, JSON manifest parsing, `git diff --check`, and four dependency-free ranking checks passed. Added security/validation tests, but they could not be executed because package registries were unavailable and dependencies are not installed. JWT/JWKS design and current Supabase client usage were checked against official Supabase documentation; PyJWKClient API against official PyJWT documentation.
- Limitations / risks: No live Supabase project credentials or database are configured, so sign-in, migrations, RLS, profile persistence, and browser build remain unverified. Course/project profile fields, resume parsing, search/map, save/application tracker, and live data ingestion remain later phases. The real-profile feed currently ranks fictional demo listings.
- Next step: Commit this profile increment. With dependency/network access and a Supabase project, run migrations, tests, build, and an owner-isolation smoke test; then proceed with resume and tracking milestones.

### 2026-09-22 — chore: connect existing GitHub repository history

- Roadmap phase / status: Repository publishing preparation; application milestone status unchanged.
- Intent: Integrate the existing `minkoi007cs/Intern_finder` main branch before pushing, preserving its initial commit without force-pushing.
- Files changed: `process.md`; the merge records the remote initial commit (README title only) as a parent while retaining the detailed OpportunityOS README.
- Behavior or architecture changed: None.
- Checks run and results: Confirmed remote `main` has one commit (`2d61f1c`) containing only `README.md`; merged with unrelated histories successfully and inspected the retained README.
- Limitations / risks: The deployment and runtime checks are still pending.
- Next step: Commit the merge, push `main`, and configure Vercel deployment.
