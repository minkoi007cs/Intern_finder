[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.11-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_Postgres-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Alembic](https://img.shields.io/badge/Alembic-Migrations-red?style=for-the-badge)](https://alembic.sqlalchemy.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

# OpportunityOS

AI-assisted opportunity discovery for university students. The current prototype includes the architecture, API foundation, a responsive landing page, a demo opportunity feed with explainable compatibility scores, and a Supabase-backed private student profile. See [tech.md](./tech.md) for the complete design and roadmap, and [process.md](./process.md) for the commit log.

## Local development

Requirements: Node.js 22 or later, Python 3.11 or later. PostgreSQL is the target database; the default SQLite URL is for local development only.

```bash
cp .env.example .env
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.ingestion.seed_demo
uvicorn app.main:app --reload
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` for the landing page and `/opportunities` for the demo feed. The API health endpoint is `http://localhost:8000/api/v1/health`, and OpenAPI documentation is at `http://localhost:8000/docs`. The seed command is idempotent and adds 20 internship, 10 research, 5 scholarship, and 5 hackathon **fictional** records.

## Configuration

Copy the variables from `.env.example`; never commit actual credentials. Set `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `frontend/.env.local` to enable sign-in. The key must be a public/publishable key, never a service-role key. Set `SUPABASE_URL` in the backend `.env` to the same project's HTTPS URL. The backend verifies access tokens against that project's asymmetric JWT signing keys; projects still using an HS256 shared secret need a signing-key migration before private profile routes work. Configure email/password and Google in Supabase Auth, including `http://localhost:3000/profile` as an OAuth redirect URL. When using Supabase PostgreSQL, set `DATABASE_URL` to a `postgresql+psycopg://` connection URL. Private profile tables deny direct `anon` and `authenticated` Data API access; the FastAPI backend owns those queries.

The public demo works without Supabase credentials. After configuring Auth, sign in at `/login`, edit your profile at `/profile`, then open `/opportunities` to see scores based on your saved skills and interests. The opportunities themselves remain fictional demo records.

## Privacy and data provenance

This project will keep resumes private and require review before any parsed data becomes a profile. Demo opportunities must be labeled and are not live offers. Compatibility scores describe profile alignment, not the chance of getting hired.

## Roadmap

The phased roadmap, schema, API, matching rules, and acceptance gates are in [tech.md](./tech.md). The first current milestone is a running frontend and backend foundation.
