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
