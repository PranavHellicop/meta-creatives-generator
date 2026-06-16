# Meta Creatives Generator

A strategy-first creative engine that produces premium, client-ready Meta ad creatives for
service businesses. It works like a performance-marketing team — researching the business,
understanding the audience, generating angles, writing copy, art-directing, and **only then**
rendering finished ads.

## How it works (single-pass generation)

The image model (`gpt-image-2`) generates the **complete finished ad in one call** — imagery,
layout, **and** all text (headline, subheadline, supporting copy, offer, CTA) baked into a single
1080×1080 PNG. There is no separate HTML/CSS text layer and no screenshotting step. The entire
upstream pipeline exists to feed that final generation a precise, well-researched prompt.

- **Founder mode** (photos uploaded): the real uploaded photo is passed to the image **edit**
  endpoint, so `gpt-image` integrates the actual person — removing/replacing their original
  background itself. No AI-invented faces.
- **Banner mode** (no photos): a pure text-to-image call — direct-response ads built from
  typography, shapes, icons, stats and offer blocks. No people.

Pipeline (`src/lib/pipeline/orchestrator.ts`): research → business profile → market understanding
→ visual anchor → angle pool (3× then select) → creative briefs → render → vision scoring.

## Features

- **Bring your own copy** — upload a markdown file of headlines (used in order; AI fills any gap)
  and a comma-separated list of CTAs (spread across the batch; an LLM decides whether multiple
  CTAs are distinct enough to share one ad).
- **Reference swipe file** — drop example creatives into `data/references/<niche-or-service>/` and
  the pipeline learns their **structure & placement only** (never their words or imagery). Empty
  folder → behaves exactly as before. See `data/references/README.md`.
- **Edit a creative** — describe one change in plain English on the creative page; it re-feeds the
  finished PNG to the image edit endpoint ("change only X, keep everything else identical") and
  saves a new **version**. Full version history with one-click **revert** (the original is never
  overwritten).
- **Export to Canva** — push a finished PNG straight into a Canva design (OAuth + asset upload).
  Use Canva's *Grab Text* to make the baked-in copy editable.

## Setup

Requires **Node 20+**.

```bash
npm install
cp .env.example .env     # then add your OPENAI_API_KEY
npx prisma generate      # generate the Prisma client
npx prisma db push       # create the local SQLite DB (prisma/dev.db)
npm run dev
```

Open http://localhost:3000. The `data/` folder is created automatically on first use.

### Environment (`.env`)

| Var | Default | Notes |
|-----|---------|-------|
| `OPENAI_API_KEY` | — | **Required.** Powers reasoning, image generation, and vision scoring. |
| `REASONING_MODEL` | `gpt-4o-mini` | Strategy / copy / scoring model. |
| `IMAGE_MODEL` | `gpt-image-2` | Generates the full ad. Must be a `gpt-image-*` model for founder/edit mode. `gpt-image-1` is a cheaper fallback. |
| `IMAGE_QUALITY` | `high` | `low` / `medium` / `high`. High is ~3 min/image — lower it while iterating. |
| `DATA_DIR` | `data` | Where founder photos, references, and final PNGs are stored. |
| `APP_URL` | `http://127.0.0.1:3000` | Optional. |
| `CANVA_CLIENT_ID` / `CANVA_CLIENT_SECRET` | — | Optional — enables "Export to Canva". Leave blank to hide the feature. |
| `CANVA_REDIRECT_URI` | _(derived)_ | Optional override. By default the OAuth redirect adapts to the live request origin. Set only to force a fixed URI (e.g. prod behind a proxy). |

## Running on a different computer

The **code** is in git; your **work is not**. `prisma/dev.db` (projects, creatives, edit versions,
the Canva token) and the `data/` folder (generated PNGs, uploaded photos) are git-ignored and live
only on the machine that made them. So a fresh clone is a clean slate:

1. `git clone …` then `npm install`
2. `cp .env.example .env` and add your `OPENAI_API_KEY` (+ Canva keys if used)
3. `npx prisma generate && npx prisma db push` — creates a fresh empty database
4. `npm run dev`

To migrate existing work, copy **both** `prisma/dev.db` and the `data/` folder over manually — they
are a matched pair (the DB stores relative paths into `data/`).

### Canva (optional)

- Register your integration at https://www.canva.dev/ and add a redirect URL for the port you run
  on — e.g. `http://127.0.0.1:3000/api/canva/callback`. Use **`127.0.0.1`**, not `localhost`
  (Canva rejects `localhost`). Add one entry per port you use.
- The OAuth redirect adapts to whatever origin you browse on, but Canva only redirects to
  **pre-registered** URLs, so every origin/port must be on that allowlist.
- You connect (authorize) once per machine — the token is stored in the local DB.

## Commands

```bash
npm run dev            # dev server (Turbopack) at localhost:3000
npm run build          # production build
npm run lint           # eslint
npm run db:studio      # browse the SQLite DB
npx prisma db push     # apply schema.prisma to SQLite
npx prisma generate    # regenerate the client after editing schema.prisma
npx tsc --noEmit       # typecheck (no test suite)
```

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma + SQLite · OpenAI (`gpt-4o-mini` +
`gpt-image-2`) · `@imgly/background-removal-node` · cheerio · zod.

## Key paths

- `src/lib/pipeline/` — one module per pipeline stage; `orchestrator.ts` runs them in order.
- `src/lib/pipeline/imagePrompt.ts` — `buildFullAdPrompt` (full-ad prompt) and `buildEditPrompt` (edits).
- `src/lib/openai/client.ts` — structured completions, image generate/edit, multi-image vision.
- `src/lib/types.ts` — zod schemas + `LAYOUT_TYPES` / `ANGLE_TYPES` (the stage↔prompt contract).
- `src/lib/kb/niches.ts` — seeded niche knowledge base.
- `src/lib/canva/client.ts` — Canva Connect OAuth + asset upload + design creation.
- `data/projects/<id>/final/` — generated 1080×1080 PNGs (and `-vN.png` edit versions).
