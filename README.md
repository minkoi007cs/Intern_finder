# OpportunityOS / Intern Finder

OpportunityOS helps students explore internships, research roles, scholarships, and hackathons. Listings in this prototype are **fictional examples**, without real application links. The match percentage describes compatibility with a profile, not the chance of receiving an offer.

## Current architecture

- `apps/web`: Next.js App Router app on `http://localhost:3001`. This is the active application.
- [app_system hub](https://system.minkoi.org): hosted sign-in, PostgreSQL data API, and row permissions for the `intern_finder` project.
- `apps/api`: earlier FastAPI and SQLAlchemy implementation, retained as a reference. The current web app does not call or require it.

The web server never connects directly to PostgreSQL. All hub HTTP requests are in `apps/web/lib/hub.ts`, which is server-only. Browser components call same-origin Next.js routes. The server uses the publishable key for reads and the `INFRA_SECRET_KEY` for the authorization-code exchange, refresh, and owner-scoped data writes. Every private data call also sends the signed-in user's access token so hub row policies still apply.

## Run locally

Requirements: Node.js 22 or later. In the hub, open **intern_finder → Quickstart → Get keys** and redeem its one-time handover code into `apps/web/.env.local`. Do not commit or share that file. It should contain:

```text
NEXT_PUBLIC_INFRA_URL=https://system.minkoi.org
NEXT_PUBLIC_INFRA_PUBLISHABLE_KEY=pk_…
INFRA_SECRET_KEY=sk_…
APP_URL=http://localhost:3001
```

Then:

```bash
cd apps/web
npm ci
npm run dev
```

Open `http://localhost:3001`. `/login` starts the hub's hosted email, Google, GitHub, or Microsoft sign-in. The app sends the user to `/auth/callback`, checks `state` and PKCE, and stores the resulting session in an httpOnly SameSite=Lax cookie. `proxy.ts` refreshes expiring tokens before requests reach route handlers.

### Production on Vercel

The Git repository does not contain `.env.local`. In the Vercel project for `intern.minkoi.org`, set these variables for **Production** before deploying:

| Variable | Production value |
| --- | --- |
| `NEXT_PUBLIC_INFRA_URL` | `https://system.minkoi.org` |
| `NEXT_PUBLIC_INFRA_PUBLISHABLE_KEY` | This project's `pk_live_` value from the hub handover |
| `INFRA_SECRET_KEY` | This project's `sk_live_` value, stored as a server-only Secret |
| `APP_URL` | `https://intern.minkoi.org` |
| `HUB_PUBLIC_CATALOG_ENABLED` | `true` after the approved demo view is available |

Create a new Production deployment after changing these values; an existing deployment keeps its old environment. The production callback is `https://intern.minkoi.org/auth/callback`. The hub hosts the Google and GitHub sign-in screens.

In the hub, open **intern_finder → Overview → Allowed browser origins (CORS)** and include `https://intern.minkoi.org` alongside `http://localhost:3001`. The hub rejects the authorization request before showing Google or GitHub if the callback's origin is missing. Saving an origin takes effect without a Vercel redeploy; changing `APP_URL` on Vercel requires a new deployment.

## Hub schema

The hub project has two tables, both created through **Database → Schema** with `id`, `owner_id`, `created_at`, and owner policies:

| Table | Additional columns | Use |
| --- | --- | --- |
| `student_profiles` | `full_name`, `university`, `major`, `academic_year`, `profile_json` | Private, editable profile. Arrays and optional fields are serialized into `profile_json` because the hub data API accepts scalar values. |
| `opportunities` | `title`, `organization`, `opportunity_type`, `remote_type`, `deadline`, `is_demo`, `details_json` | Owner-scoped source table containing 40 fictional demo listings. |

The hub has a unique index on `student_profiles.owner_id` and the SQL view `public_demo_opportunities`, defined as `SELECT id, details_json FROM opportunities WHERE is_demo = true`. The view exposes no `owner_id` or profile fields. An anonymous `select` policy applies only to this view. The local web environment has `HUB_PUBLIC_CATALOG_ENABLED=true`, so the feed reads the 40 fictional records from the hub. The bundled fictional catalog remains a fallback if the hub is unavailable. Do not add public read access to `student_profiles`.

## Checks

```bash
cd apps/web
npm run typecheck
npm run build
```

The current prototype has no resume upload, verified live opportunity ingestion, or application tracking. See [tech.md](./tech.md) for the longer product roadmap. The older [AUDIT.md](./AUDIT.md) describes the FastAPI version of the prototype.
