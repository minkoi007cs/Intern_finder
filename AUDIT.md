# OpportunityOS audit — 24 September 2026

## Scope and method

Reviewed the landing page, opportunity feed, listing detail, sign-in and profile pages; API routes, ranking and seed logic; and database migrations. Checked the mobile layout at a narrow viewport, ran the frontend typecheck and production build, and exercised public catalog and private profile routes through FastAPI TestClient with an isolated SQLite database.

## Findings resolved in this revision

| Severity | Area | Finding | Resolution |
| --- | --- | --- | --- |
| High | Demo catalog | Seeded deadlines eventually expire; rerunning the seed command previously left existing records expired, producing an empty feed. | Refresh dates for existing fictional records on each seed run; cover with API test. |
| High | Profile | A failed profile load left a blank editable form, risking an accidental overwrite of saved data. | Block editing on load failure and show the error. |
| Medium | Mobile UX | The category sidebar occupied the initial mobile viewport before any feed content. | Use compact horizontal category tabs on small screens and retain the sidebar on desktop. |
| Medium | Match clarity | The demo score badge said “Profile match,” which could suggest a visitor's own profile was used. | Distinguish sample and personal scores in cards and details. |
| Medium | Session flow | Profile saving reused a token captured when the page loaded; it could expire before submission. | Read the current session at save time; add explicit sign-out and error handling. |
| Medium | Search and filtering | Search skipped skill names; users could not limit to remote listings or sort by deadline. | Search skill names, add a remote filter, deadline sorting and filter reset. |
| Low | Accessibility and copy | Selected category buttons used page-current semantics, form typography was inconsistent, and the landing page advertised jobs absent from the demo catalog. | Use pressed-button semantics, consistent form fonts, clearer focus styles and accurate copy. |
| Low | Verification | Backend tests required an implicit import path, and builds had no automated CI gate. | Add pytest configuration, a lockfile and CI jobs for both apps. |

## Product state and remaining limitations

- This repository is still a **fictional demo catalog**, not a live internship aggregator. Every listing is labelled as an example, and there are no real application links.
- Personal ranking requires the owner to configure Supabase Auth and a database. It has no resume upload or job ingestion yet. The score describes alignment with simple weighted rules, not likelihood of admission or hiring.
- The location text field does not provide geocoding; distance scoring needs stored coordinates. The interface explains this limitation.
- A full browser journey with the API and hosted Supabase credentials was not available in this audit environment. API behavior was verified with integration tests, and the frontend was built and visually checked at a narrow viewport.

## Suggested next product milestone

Add a verified live source pipeline with freshness checks and clear application links, then deploy a staging environment with Supabase test credentials for browser tests covering sign-up, profile edits, filters and recommendations.
