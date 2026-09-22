# OpportunityOS — technical plan and roadmap

> Status: living architecture document. Update this file when an architectural decision, scope, API, schema, milestone, or acceptance criterion changes.

## Mandatory development protocol

1. **Before every work session and every commit, read [process.md](./process.md) in full.** `proccess.md` is an alias for the same log to preserve the requested spelling.
2. Record the intended step, files changed, behavior changed, test evidence, decisions, limitations, and next step in `process.md` **before** the corresponding commit. Each commit must match one log entry. Never claim a test passed without running it.
3. After a commit, use `git log` as the source for its exact hash. Add the hash to a later log entry if useful; do not amend a commit merely to insert its own hash.
4. Keep this document aligned with the implementation. If scope changes, update the roadmap and the log in the same commit.
5. Each milestone must leave the repository runnable. Do not put real credentials, student resumes, or private profile data in Git.

## 1. Product and first release

OpportunityOS helps students find internships, research roles, scholarships, hackathons, and other opportunities. It ranks relevant listings from a student profile and explains the match, missing skills, deadline, and next action. The initial persona is a Computer Science undergraduate interested in software, AI/ML, and research, with little work experience.

The **first usable MVP** includes sign-in, a structured/editable student profile, PDF resume upload with review before save, verified or clearly marked demo opportunities, a personalized feed, search and filters, deterministic compatibility score, matching/missing skills, save/application tracking, location filtering, and research listings. It should support students from other majors without schema changes.

Out of the first usable MVP: automated professor hiring claims, web scraping without permission, collaborative filtering, learning-to-rank, employer accounts, paid subscriptions, automatic application submission, and predicting acceptance probability. These remain later milestones.

### Product rules

- “84% match” means **profile compatibility under the current scoring rules**, never chance of acceptance.
- Missing a preferred skill does not hide an opportunity. Show concrete gaps and ways to improve.
- Never fabricate an opportunity, deadline, visa eligibility, funding, or professor opening. Demo records are conspicuously labeled.
- Eligibility and visa support default to `UNKNOWN` unless a source explicitly states them.
- Do not infer or rank on protected attributes. The user can edit all extracted profile data.

## 2. Architecture

```text
Browser (Next.js App Router, TypeScript, Tailwind)
  ├─ Supabase Auth session (email/password and Google)
  ├─ public demo pages and authenticated student workspace
  └─ HTTPS REST/JSON → FastAPI modular monolith
                         ├─ route validation and auth dependency
                         ├─ profile / resume / opportunity / application services
                         ├─ search + ranking + explanation services
                         ├─ ingestion adapters + scheduled ingestion jobs
                         └─ SQLAlchemy repositories → PostgreSQL (Supabase)
                                                     ├─ relational tables and full-text indexes
                                                     ├─ optional pgvector indexes
                                                     └─ private resume object storage (Supabase Storage)
```

The browser never receives a database service key. FastAPI verifies Supabase JWTs using its public JWKS; every student-owned query is scoped to the JWT subject. The API owns ranking, data validation, and all writes. Auth is delegated to Supabase so the API does not store passwords. A read-only demo persona can be served without credentials during local development; demo data is never presented as live listings.

### Frontend modules

`app/` routes: landing, sign-in, onboarding, dashboard/feed, search, opportunity details, research, map, saved, applications, profile/settings. `components/` holds cards, match breakdown, filters, layout, forms, and states. `lib/api.ts` is the typed API client; `lib/auth.ts` handles browser session access. React Server Components are the default for read views; client components handle interactive filters, forms, and tracking. Responsive layout with keyboard support, clear empty/loading/error states, visible data provenance, and WCAG-oriented semantics.

### Backend modules

`app/api/` contains thin FastAPI routes; `app/schemas/` contains Pydantic request/response types; `app/models/` contains persistence models; `app/services/` contains business logic; `app/repositories/` holds data access; `app/ml/` holds deterministic features/ranking and future embeddings; `app/ingestion/` holds source adapters. One deployable API and one database, with no extra queue or microservice for the MVP. Scheduled ingestion can run as a command or hosted job.

### Data flow

1. User signs in → Supabase gives a session JWT → browser sends Bearer token to the API.
2. Onboarding stores university, year, location, interests, goals, preferences, courses, projects, and skills.
3. PDF upload is size/type checked and stored privately; parser produces a **candidate** profile. User reviews edits, then explicitly confirms changes.
4. Ingestion adapter fetches permitted source data → normalizes → validates → deduplicates → upserts with source/provenance and freshness state.
5. Search retrieves a bounded candidate set with filters and eligibility exclusions only when explicit. Ranking calculates independent feature scores and a weighted total. Explanation is grounded in the computed features.
6. Save/apply actions write user-owned rows and append recommendation events. No interaction signal changes the initial deterministic score until an evaluated behavioral model is introduced.

## 3. Repository layout

```text
OpportunityOS/
  tech.md                 architecture, contracts, roadmap, acceptance criteria
  process.md              append-only development and commit log
  proccess.md             alias to process.md
  README.md               setup, operations, privacy, demo notes
  .env.example            non-secret configuration examples
  frontend/
    app/                  Next.js routes
    components/           reusable UI
    lib/                  types, API/auth utilities
    public/
  backend/
    app/
      api/ models/ schemas/ services/ repositories/ ml/ ingestion/
      core/               config, DB, auth, errors
      main.py
    alembic/              versioned PostgreSQL migrations
    tests/
    requirements.txt
  scripts/                seed and local-development helpers
```

## 4. PostgreSQL schema contract

UUID primary keys and UTC timestamps throughout. Use migration files for every schema change. `created_at` and `updated_at` on mutable tables; explicit foreign keys, unique constraints, and indexes. `users.id` equals Supabase Auth subject UUID; no local password hash. Below, `*` means a required MVP table, `+` means a later extension.

| Table | Key columns and relationships | Important indexes / rules |
| --- | --- | --- |
| `users`* | `id`, `email`, `created_at`; referenced by all student-owned rows | unique normalized email; never expose other students |
| `student_profiles`* | `user_id` unique FK, name, university, major/minor, grad/academic year, optional GPA, location/lat/lon/radius, remote and career preferences, interests | `user_id` unique; validate coordinates and radius |
| `skills`* | normalized name, category, aliases | unique canonical name; aliases normalized |
| `student_skills`* | user/profile FK, skill FK, optional proficiency, source | unique `(user_id, skill_id, source)` |
| `courses`* / `student_courses`* | normalized course definition; user-specific completion and source | course search index; join uniqueness |
| `projects`* | user FK, title, description, technologies, GitHub/project URLs | user FK index; URLs validated |
| `organizations`* | name, type, website, location | normalized-name index |
| `opportunities`* | org FK, title, description, type, employment/remote type, location/lat/lon, salary range/currency, majors/year/experience, research fields, URLs, posted/deadline, eligibility/visa/sponsorship, source, status, `last_verified_at`, `is_demo` | source+external-ID or canonical URL unique; type/deadline/status/location indexes; full-text GIN index |
| `opportunity_skills`* | opportunity FK, skill FK, `required` boolean | unique `(opportunity_id, skill_id)` |
| `saved_opportunities`* | user FK, opportunity FK, saved_at | unique `(user_id, opportunity_id)` |
| `applications`* | user FK, opportunity FK, status, applied/follow-up dates, notes | unique `(user_id, opportunity_id)`; user/status index |
| `recommendation_events`* | user FK, opportunity FK, event type, timestamp | append-only; user/time index; avoid sensitive payloads |
| `resume_uploads`* | user FK, private object path, MIME, byte size, parse status, timestamps | user FK index; deletion removes object and row |
| `research_labs`+ / `professors`+ | organization/university, public profile, verified opening state/source | no hiring claim without verified source |
| `embeddings`+ | entity type/id, model version, vector, refreshed_at | pgvector index once semantic search is enabled |

Opportunity types: `INTERNSHIP`, `COOP`, `JOB`, `PART_TIME`, `RESEARCH`, `RESEARCH_ASSISTANT`, `SCHOLARSHIP`, `FELLOWSHIP`, `HACKATHON`, `COMPETITION`, `VOLUNTEER`, `STARTUP`, `CAMPUS_JOB`, `OTHER`. Application statuses: `SAVED`, `PLANNING_TO_APPLY`, `APPLIED`, `INTERVIEW`, `OFFER`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`. Listing statuses: `ACTIVE`, `EXPIRED`, `UNVERIFIED`. Store public source provenance and independent `last_verified_at` so stale results can be excluded or labeled.

## 5. API contract (prefix `/api/v1`)

| Method/path | Purpose | Access |
| --- | --- | --- |
| `GET /health` | health check, without secrets | public |
| `GET/PUT /profile` | read/update student profile | owner |
| `POST /resume/upload` | validate/store private PDF | owner |
| `POST /resume/{id}/parse` | extract candidate profile | owner |
| `POST /resume/{id}/confirm` | apply reviewed fields | owner |
| `DELETE /resume/{id}` | delete object + metadata | owner |
| `GET /opportunities` | paginated listing with text/type/remote/deadline/radius filters | public or owner |
| `GET /opportunities/{id}` | details + provenance | public or owner |
| `GET /recommendations` | ranked feed with score breakdown | owner; demo persona read-only |
| `GET /recommendations/{id}/explanation` | grounded explanation | owner; demo persona read-only |
| `POST/DELETE /opportunities/{id}/save` | save/unsave | owner |
| `GET/POST /applications` | list/create tracker entries | owner |
| `PATCH /applications/{id}` | update state, dates, notes | owner |
| `GET /search` | combined full-text, filters, later semantic retrieval | public or owner |
| `GET /map/opportunities` | bounded location search | public or owner |
| `POST /events` | validated interaction event | owner |
| `DELETE /account` | erase owned data and Supabase user | owner, reauthentication policy |

Use typed error responses, pagination and bounded page sizes, stable sort, validated query params, and proper HTTP status codes. Auth registration/login itself uses Supabase client methods; the API does not invent a second password system. OpenAPI is generated by FastAPI.

## 6. Matching and search

Retrieve active, fresh candidates first. Apply explicit user filters (type, remote, distance, deadline). Do not silently exclude a student because a skill is missing. Normalize names/aliases in one versioned skill dictionary. Components are independently calculated in `[0,1]`:

| Component | Initial weight | Rule |
| --- | ---: | --- |
| Skills | 0.35 | required skills count more than preferred; empty requirements are neutral |
| Interests | 0.20 | overlap of stated interests/research fields and listing tags |
| Major | 0.10 | neutral if no preferred major is stated |
| Experience/year | 0.10 | explicit minimum-year/experience compatibility; unknown is neutral |
| Location | 0.10 | remote preference or distance within chosen radius; missing geodata is neutral/labeled |
| Opportunity preferences | 0.10 | preferred type/industry match; absent preferences are neutral |
| Recency | 0.05 | deterministic decay from posted date; missing date is neutral |

`overall = round(100 × Σ(weight × component))`; never let the LLM choose or alter this number. Response includes component scores, matched and missing **required/preferred** skills, reasons, score version, and next action. Explanations are deterministic templates first. A future LLM may reword only grounded facts and must not invent claims. Store model/weight version for reproducibility. Bias and relevance evaluations should include cold-start students and use relevance ratings, Precision@K/NDCG@K, save/apply signals, not clicks alone.

Full-text search is PostgreSQL `tsvector` plus filters. Later, add cached pgvector embeddings for descriptions, goals, projects, and interests; combine lexical and semantic retrieval behind one interface. Avoid per-feed LLM calls. Keep the first scorer fast enough for an interactive feed on a small indexed corpus; profile and score inputs should be observable without storing resumes in logs.

## 7. Ingestion and data quality

Each `OpportunitySource` implements `fetch → normalize → validate → save`. Begin with manual/seed data and permitted public APIs or feeds. Each row keeps source URL/name, fetched and verified dates, external ID when available, and demo flag. Deduplicate by canonical application/source URL, then normalized organization/title/location; review ambiguous matches rather than merging blindly. Passed deadlines become `EXPIRED`; disappeared sources become `UNVERIFIED`. Do not recommend either as active. Seed at least 20 internship, 10 research, 5 scholarship, and 5 hackathon **clearly fake/demo** listings for demos; live deployments should remove or separate them.

## 8. Security, privacy, and operations

- JWT verification and owner-scoped access for profile, resume, saves, applications, and events; rate limits on upload and write endpoints.
- Accept only PDFs within a configured size limit. Check signature/MIME, reject encrypted or malformed files, cap parsing work, sanitize extracted text, and keep objects private.
- Store secrets only in environment variables. `.env.example` has placeholders. Configure CORS to known frontend origins.
- Provide account/resume deletion and a privacy notice for any external AI provider. Default parsing should remain local until a provider and disclosure are chosen.
- Do not log resume text, tokens, passwords, or private profile fields. Separate public opportunity data from student records.
- Ship frontend to Vercel, API to Railway or Cloud Run, DB/Auth/Storage to Supabase when deployment is requested. Use migration and smoke check on each release; record operational costs and API limits.

## 9. Delivery roadmap

Milestones are ordered so each adds a usable capability. Status is changed only after evidence is logged in `process.md`.

| Phase | Deliverable | Acceptance gate | Status |
| --- | --- | --- | --- |
| 0 — Planning | This architecture, schema/API contracts, roadmap, process log and Git repository | docs internally consistent; first log entry committed | Planned |
| 1 — Foundation | Next.js/TypeScript/Tailwind shell, FastAPI API, config, DB connection, migration, `/health`, landing, README/.env.example | frontend builds; API starts; migration applies | Planned |
| 2 — Identity/profile | Supabase email + Google sign-in, owner auth, onboarding/edit profile, skills/courses/projects | owner isolation tests; editable profile end to end | Planned |
| 3 — Opportunity catalog | normalized schema, permitted/manual ingestion, demo seed, list/detail, provenance, duplicate and expiry rules | seed counts; API pagination; no stale/demo ambiguity | Planned |
| 4 — Recommendations/feed | normalized skills, configurable weighted scorer, explanation, match/skill gaps, personalized feed | scorer unit tests and feed UI; score wording correct | Planned |
| 5 — Resume | private PDF upload, local extraction, editable candidate confirmation and deletion | file validation and no direct save of parser output | Planned |
| 6 — Search/maps | full-text/filter search, geodistance and radius, Leaflet map | distance tests; map/list consistency; remote handling | Planned |
| 7 — Saved/tracker | save/hide, application Kanban, deadlines/follow-ups, event log | owner isolation and state-transition tests | Planned |
| 8 — AI enrichment | cached embeddings, semantic search, grounded short explanations, skill steps | offline relevance evaluation and cost ceiling | Planned |
| 9 — Research expansion | verified research feeds and professor/lab profiles | provenance/opening state shown; no fabricated status | Planned |
| 10 — ML research/pilot | cold-start dataset, consented evaluation, ablations, learning-to-rank experiment | baseline comparison with Precision@K/NDCG@K and human ratings | Planned |

### Build order for the initial implementation request

1. Finalize architecture and data flow (this document).
2. Design normalized PostgreSQL schema and migration contract (section 4).
3. Define endpoints and access contract (section 5).
4. Create repository structure.
5. Deliver running foundation with health check and landing page.
6. Add student profiles.
7. Add opportunity model and marked demo records.
8. Add deterministic ranking.
9. Add personalized feed.

Do these in small, coherent commits with the process log updated each time. After each major step, report what changed, the key decision, tests actually run, and the next step. Later phases remain explicit so the first release stays focused.

## 10. Definition of done

For each implemented phase: source and migration committed; API types documented; relevant business-logic/security tests pass; frontend build passes; manual smoke path works; empty/error/loading states are understandable; privacy and provenance behavior checked; README and `process.md` updated. A phase is not marked complete because files merely exist.
