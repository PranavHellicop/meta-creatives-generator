# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A personal-use local web app that behaves like a **creative-strategy engine which renders Meta ad images at the final step** — NOT a "niche → image" generator. From a one-line business input it researches, profiles the expert, understands the niche market, generates strategic angles, writes copy, art-directs, and only then renders finished 1080×1080 client-ready ads.

## Commands

```bash
npm run dev                        # dev server (Turbopack) at localhost:3000
npm run build                      # production build
npm run lint                       # eslint
npx prisma db push                 # apply schema.prisma to SQLite (prisma/dev.db)
npx prisma generate                # regenerate client AFTER editing schema.prisma (do this before tsc)
npm run db:studio                  # browse the DB
npx tsc --noEmit                   # typecheck (no test suite exists)
```

There are no automated tests. Verify changes by running the pipeline end-to-end (see below) and visually reading the generated PNGs under `data/projects/<id>/final/`.

After editing `prisma/schema.prisma`, you MUST run `npx prisma generate` or `tsc` will fail on the stale client type. Adding a route file requires a dev-server restart for Turbopack to pick it up. Route folders starting with `_` are Next.js **private** folders (excluded from routing) — never name an API route with a leading underscore.

## The one architectural rule: the image model generates the whole ad

The image model (gpt-image-2) generates the **complete finished ad in a single generation** — imagery, layout, AND all text (headline, sub, copy, offer, CTA) baked into one 1080×1080 PNG. There is no HTML/CSS text layer and no screenshotting step. The whole point of the upstream pipeline is to feed this final generation a precise, well-researched prompt. Two consequences pervade the code:

- The prompt builder (`src/lib/pipeline/imagePrompt.ts::buildFullAdPrompt`) passes the exact copy strings plus design specs (typography style, colors, mood) and placement guidance, and instructs the model to typeset all text crisply.
- **Banner mode** (no founder photo) is a pure **text-to-image** call (`generateImage`). **Founder mode** passes the **real uploaded founder photo** to the image **edit** endpoint (`editImage` → `images.edit`) so gpt-image integrates the actual person — removing/replacing their original background itself — rather than inventing a fictional one.

> **History:** an earlier "hybrid" approach generated a text-free backdrop and rendered text as an HTML/CSS layer screenshotted by Playwright. That was fully removed (layout components, `/render` route, `src/lib/export.ts`, the text-edit/re-export endpoints, the `playwright` + `lucide-react` deps). Because text is now baked into the image, **it is NOT editable as a separate layer** — the creative detail page is a read-only viewer. Re-deriving an editable text overlay is a known open question.

## Pipeline (the heart of the app)

`src/lib/pipeline/orchestrator.ts::runPipeline(projectId)` runs all stages sequentially, writing `project.status` + `statusDetail` to the DB after each. It is launched fire-and-forget by `POST /api/projects/[id]/generate` (not awaited — runs in the background on the long-lived Node server). The new-project UI redirects to the project page, which polls `GET /api/projects/[id]/status` every 2s and renders a live step tracker + gallery.

Stage order (each is one module in `src/lib/pipeline/`, each an LLM call via `src/lib/openai/client.ts`):
1. `research.ts` — fetch + cheerio-parse the website (content focus, not colors/fonts)
2. `businessProfile.ts` — **expert intelligence**: authority, client transformation, differentiator, voice adjectives, personality
3. `market.ts` — niche audience psychology **+ design patterns** (typography rec, `founderProportionZone`, photography direction, winning formats), grounded by `src/lib/kb/niches.ts`
4. `visualAnchor.ts` — a locked 50-75 word image-gen modifier generated ONCE per project and prepended to every ad prompt so the whole batch looks like one campaign shoot
5. `angles.ts` — generate a pool of 3× the requested count, then `selectAngles()` picks the strongest while maximizing angle-TYPE diversity
6. `briefs.ts` — one batched LLM call produces all N briefs (global view → less repetition) incl. embedded art direction; `enforceLayoutDiversity()` round-robins overused layouts
7. rendering — build the full-ad prompt (`buildFullAdPrompt`: visual anchor + scene + exact copy + design specs + placement) → **founder mode**: `editImage(prompt, [real photo])`; **banner mode**: `generateImage(prompt)`. The returned PNG is saved directly as the final creative — no post-processing.
8. `score.ts` — GPT-4o-mini vision scores the final PNG on 10 criteria

All LLM outputs are zod-validated structured outputs. Schemas + the `LAYOUT_TYPES`/`ANGLE_TYPES` enums live in `src/lib/types.ts` — this is the contract between every stage and the prompt builder; change a schema there first. `LAYOUT_TYPES`/`FOUNDER_LAYOUTS`/`BANNER_LAYOUTS` no longer map to React components — they now constrain which layout the brief may pick and feed `founderSideFromLayout()`, which tells the image prompt where to place the person.

## Rendering

- `src/lib/pipeline/imagePrompt.ts::buildFullAdPrompt()` is the only prompt builder. It composes the visual anchor, scene, the exact copy strings, design specs, and a placement instruction derived from `founderSideFromLayout(layoutType)`.
- `src/lib/openai/client.ts` exposes `generateImage(prompt)` (text-to-image, banner mode) and `editImage(prompt, references[])` (image edit with the real founder photo, founder mode). `editImage` requires a `gpt-image-*` model (dall-e-2 edit needs a mask).
- `founderZone` (0.35–0.65, from the market profile) is stored on `art.founderZone` and converted to a percentage in the prompt to tell the model how much of the frame the founder should occupy.
- The creative detail page (`src/app/projects/[id]/creatives/[cid]/`) is **read-only** — it shows the generated PNG, the copy as reference text, and the score. There is no live editing or re-export.

## Storage & config

- Generated files (founder originals, transparent cutouts, final PNGs) live under `data/` and are served by `/api/files/[...path]` (not `/public`). Paths are stored relative in the DB.
- Founder photos: `@imgly/background-removal-node` (`src/lib/founder.ts`) still runs at upload and produces a cutout — it requires a Blob with an explicit MIME type or it throws `Unsupported format:`. The cutout's presence is what flips a project into founder mode; note that the **original** photo (not the cutout) is what's passed to `editImage` at render time.
- All models/keys are env-driven in `src/lib/env.ts`: `OPENAI_API_KEY`, `REASONING_MODEL` (gpt-4o-mini), `IMAGE_MODEL` (gpt-image-2; gpt-image-1 is a cheaper fallback — must be a `gpt-image-*` model for founder/edit mode), `IMAGE_QUALITY` (high is ~3 min/image — lower it while iterating), `DATA_DIR`.
