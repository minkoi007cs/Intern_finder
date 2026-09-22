# OpportunityOS

AI-assisted opportunity discovery for university students. The first implementation increment includes the architecture, API foundation, and a responsive landing page. See [tech.md](./tech.md) for the complete design and roadmap, and [process.md](./process.md) for the commit log.

## Local development

Requirements: Node.js 20 or later, Python 3.9 or later. PostgreSQL is the target database; the default SQLite URL is for local development only.

```bash
cp .env.example .env
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The API health endpoint is `http://localhost:8000/api/v1/health`, and OpenAPI documentation is at `http://localhost:8000/docs`.

## Configuration

Copy the variables from `.env.example`; never commit actual credentials. When using Supabase PostgreSQL, set `DATABASE_URL` to a PostgreSQL connection URL. Supabase Auth and Storage will be added with the profile/resume milestones.

## Privacy and data provenance

This project will keep resumes private and require review before any parsed data becomes a profile. Demo opportunities must be labeled and are not live offers. Compatibility scores describe profile alignment, not the chance of getting hired.

## Roadmap

The phased roadmap, schema, API, matching rules, and acceptance gates are in [tech.md](./tech.md). The first current milestone is a running frontend and backend foundation.
