# Meta Creatives Generator

A strategy-first creative engine that produces premium, client-ready Meta ad creatives for
service businesses. It works like a performance-marketing team — researching the business,
understanding the audience, generating angles, writing copy, art-directing, and **only then**
rendering images.

## How it works (hybrid rendering)

The AI image model generates **imagery/backdrops only — never text**. All ad text (headline,
subheadline, supporting copy, offer, CTA) is rendered as a **pixel-perfect HTML/CSS layer** by
React layout components and exported to PNG with Playwright. This is what makes the output look
like an agency made it instead of an AI poster.

- **Founder mode** (photos uploaded): the real person is background-removed and composited onto
  an AI-generated backdrop. No AI-invented faces.
- **Banner mode** (no photos): direct-response ads built from typography, shapes, icons, stats and
  offer blocks — backgrounds are pure CSS, so **no image-API call is made** (cheaper + crisper).

Pipeline: research → business profile → market understanding → angle pool (3× then select) →
creative briefs → art direction → layout pick → (backdrop image) → render → vision scoring.

## Setup

```bash
npm install
npx playwright install chromium   # one-time, for PNG export
cp .env.example .env              # then add your OpenAI key
npx prisma db push                # create the local SQLite DB
npm run dev
```

Open http://localhost:3000.

### Environment (`.env`)

| Var | Default | Notes |
|-----|---------|-------|
| `OPENAI_API_KEY` | — | Required. Powers reasoning, image gen, and vision scoring. |
| `REASONING_MODEL` | `gpt-4o-mini` | Strategy/copy/scoring model. |
| `IMAGE_MODEL` | `gpt-image-2` | Backdrop image model. `gpt-image-1` / `dall-e-2` are cheaper fallbacks. |
| `IMAGE_QUALITY` | `high` | `low`/`medium`/`high` (gpt-image models). Lower it to cut cost while testing. |
| `FOUNDER_AI_BACKDROP` | `true` | Generate premium AI backdrops behind the founder cutout. Set `false` for clean CSS backgrounds (free, no image-API call). |
| `DATA_DIR` | `data` | Where founder photos, backdrops and final PNGs are stored. |
| `APP_URL` | `http://localhost:3000` | Base URL the server screenshots for export. |

> Founder backdrops are intentionally **blurred, text-free environments** so the real cutout
> integrates cleanly and no garbled AI text appears. Founder photos are background-removed via
> `@imgly/background-removal-node` (pass a typed Blob — an untyped Blob throws "Unsupported format").

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma + SQLite · OpenAI · Playwright ·
`@imgly/background-removal-node` · lucide-react · cheerio · zod.

## Key paths

- `src/lib/pipeline/` — one module per pipeline stage; `orchestrator.ts` runs them in order.
- `src/lib/openai/client.ts` — structured completions, image gen, vision scoring.
- `src/lib/types.ts` — zod schemas + `LAYOUT_TYPES` / `ANGLE_TYPES`.
- `src/components/layouts/` — the 12 layout components + registry.
- `src/lib/kb/niches.ts` — seeded niche knowledge base.
- `src/app/render/[id]` — isolated 1080×1080 render route used by preview and export.
