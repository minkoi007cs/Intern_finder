# OpportunityOS

AI-assisted opportunity discovery for university students. The current prototype includes the architecture, API foundation, a responsive landing page, and a read-only demo opportunity feed with explainable compatibility scores. See [tech.md](./tech.md) for the complete design and roadmap, and [process.md](./process.md) for the commit log.

## Local development

Requirements: Node.js 20.9 or later, Python 3.9 or later. PostgreSQL is the target database; the default SQLite URL is for local development only.

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

Copy the variables from `.env.example`; never commit actual credentials. Set `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` in `frontend/.env.local` if you need to override the default. When using Supabase PostgreSQL, set `DATABASE_URL` to a PostgreSQL connection URL. Supabase Auth and Storage are planned for the profile/resume milestones.

## Privacy and data provenance

This project will keep resumes private and require review before any parsed data becomes a profile. Demo opportunities must be labeled and are not live offers. Compatibility scores describe profile alignment, not the chance of getting hired.

## Roadmap

The phased roadmap, schema, API, matching rules, and acceptance gates are in [tech.md](./tech.md). The first current milestone is a running frontend and backend foundation.
