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
npx playwright install chromium    # one-time, required for PNG export
npx tsc --noEmit                   # typecheck (no test suite exists)
```

There are no automated tests. Verify changes by running the pipeline end-to-end (see below) and visually reading the generated PNGs under `data/projects/<id>/final/`.

After editing `prisma/schema.prisma`, you MUST run `npx prisma generate` or `tsc` will fail on the stale client type. Adding a route file requires a dev-server restart for Turbopack to pick it up. Route folders starting with `_` are Next.js **private** folders (excluded from routing) — never name an API route with a leading underscore. `next.config.ts` sets `devIndicators: false` so the dev overlay never leaks into export screenshots.

## The one architectural rule: hybrid rendering

The image model generates **imagery/backdrops ONLY — never text**. Every word on a creative (headline, sub, copy, offer, CTA) is a pixel-perfect HTML/CSS layer rendered by a React layout component and screenshotted to PNG by Playwright. This is what separates agency-quality output from garbled "AI posters". Two consequences pervade the code:

- The backdrop image prompt (`src/lib/pipeline/imagePrompt.ts`) hard-forbids text/letters/people. The phrase "advertising/brand background" is deliberately avoided because it makes image models render signage.
- **Banner mode** (no founder photo) renders backgrounds with pure CSS gradients/shapes — it makes **zero image-API calls**. **Founder mode** generates an AI backdrop and composites the real, background-removed founder cutout on one side.

## Pipeline (the heart of the app)

`src/lib/pipeline/orchestrator.ts::runPipeline(projectId)` runs all stages sequentially, writing `project.status` + `statusDetail` to the DB after each. It is launched fire-and-forget by `POST /api/projects/[id]/generate` (not awaited — runs in the background on the long-lived Node server). The new-project UI redirects to the project page, which polls `GET /api/projects/[id]/status` every 2s and renders a live step tracker + gallery.

Stage order (each is one module in `src/lib/pipeline/`, each an LLM call via `src/lib/openai/client.ts`):
1. `research.ts` — fetch + cheerio-parse the website (content focus, not colors/fonts)
2. `businessProfile.ts` — **expert intelligence**: authority, client transformation, differentiator, voice adjectives, personality
3. `market.ts` — niche audience psychology **+ design patterns** (typography rec, `founderProportionZone`, photography direction, winning formats), grounded by `src/lib/kb/niches.ts`
4. `visualAnchor.ts` — a locked 50-75 word image-gen modifier generated ONCE per project and prepended to every backdrop prompt so the whole batch looks like one campaign shoot
5. `angles.ts` — generate a pool of 3× the requested count, then `selectAngles()` picks the strongest while maximizing angle-TYPE diversity
6. `briefs.ts` — one batched LLM call produces all N briefs (global view → less repetition) incl. embedded art direction; `enforceLayoutDiversity()` round-robins overused layouts
7. rendering — founder mode: build backdrop prompt (visual anchor + scene + composition guidance) → `generateImage()` → composite; then `renderCreativePng()` screenshots `/render/[id]`
8. `score.ts` — GPT-4o-mini vision scores the final PNG on 10 criteria

All LLM outputs are zod-validated structured outputs. Schemas + the `LAYOUT_TYPES`/`ANGLE_TYPES` enums live in `src/lib/types.ts` — this is the contract between every stage and the renderer; change a schema there first.

## Rendering & export

- `src/components/layouts/` — 12 layout components + `LAYOUT_REGISTRY`. `FOUNDER_LAYOUTS` vs `BANNER_LAYOUTS` (in `types.ts`) gate which are valid per mode. Shared primitives (Background, SideScrim, FounderCutout, CTAButton, color helpers) are in `shared.tsx`. Colors are applied via inline `style` (dynamic hex), not Tailwind.
- `founderZone` (0.35–0.65, from the market profile) is injected into `art.founderZone` by the orchestrator and controls how much canvas width the founder occupies; layouts compute the text-column width from it.
- `/render/[id]` (`src/app/render/`) is an isolated, chrome-free route that paints one creative at exactly 1080×1080. Both the live editor preview (an `<iframe>` scaled down) and the Playwright export consume it, so **preview === export**.
- `src/lib/export.ts::renderCreativePng()` reuses one Chromium instance per batch, waits for fonts + images, and screenshots `#creative-canvas`.
- Live editing: `PATCH /api/creatives/[cid]` updates the editable text JSON, then `POST .../reexport` re-screenshots — **no image-API call**, so text edits are free.

## Storage & config

- Generated files (founder originals, transparent cutouts, backdrops, final PNGs) live under `data/` and are served by `/api/files/[...path]` (not `/public`). Paths are stored relative in the DB.
- Founder cutouts use `@imgly/background-removal-node` (`src/lib/founder.ts`) — it requires a Blob with an explicit MIME type or it throws `Unsupported format:`. Falls back to the original image on failure.
- All models/keys are env-driven in `src/lib/env.ts`: `OPENAI_API_KEY`, `REASONING_MODEL` (gpt-4o-mini), `IMAGE_MODEL` (gpt-image-2; gpt-image-1/dall-e-2 are cheaper fallbacks), `IMAGE_QUALITY` (high is ~3 min/image — lower it while iterating), `FOUNDER_AI_BACKDROP` (default true), `APP_URL` (base URL Playwright screenshots).
