import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { dataRoot } from "@/lib/storage";
import { analyzeImages } from "@/lib/openai/client";

// A user-curated swipe file of strong example Meta creatives, organized by
// service/niche. Drop images into:
//   data/references/<your-niche-or-service>/*.png|jpg|webp   (niche-specific)
//   data/references/*.png|jpg|webp                            (global — every project)
// The pipeline looks at these and learns ONLY structure & placement — never the
// copy, brand, offer, or specific imagery. Empty folder → behaves exactly as before.

const REFERENCES_DIR = "references";
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const MAX_IMAGES = 6; // cap cost/latency of the vision call

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function mimeFor(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

// Read up to MAX_IMAGES example creatives relevant to this project.
// Sources, in priority order: a folder matching the service slug, a folder
// matching the niche slug, then root-level (global) images.
export async function loadReferenceImages(
  niche: string,
  service: string
): Promise<{ base64: string; mime: string }[]> {
  const root = path.join(dataRoot(), REFERENCES_DIR);
  const dirs = [
    path.join(root, slugify(service)),
    path.join(root, slugify(niche)),
    root, // global examples sitting directly in data/references/
  ];

  const seen = new Set<string>();
  const out: { base64: string; mime: string }[] = [];

  for (const dir of dirs) {
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue; // folder doesn't exist — skip
    }
    for (const name of entries.sort()) {
      if (out.length >= MAX_IMAGES) return out;
      const ext = path.extname(name).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      const abs = path.join(dir, name);
      if (seen.has(abs)) continue;
      seen.add(abs);
      try {
        const bytes = await fs.readFile(abs);
        out.push({ base64: bytes.toString("base64"), mime: mimeFor(ext) });
      } catch {
        // unreadable file — skip
      }
    }
  }
  return out;
}

const DigestSchema = z.object({
  layoutPatterns: z.string(),
  textPlacement: z.string(),
  ctaTreatment: z.string(),
  subjectPlacement: z.string(),
  summary: z.string(),
});

// Distill STRUCTURE & PLACEMENT patterns from the reference set. Returns "" when
// there are no reference images so the pipeline carries on unchanged.
export async function buildReferenceGuidance(
  niche: string,
  service: string
): Promise<string> {
  const images = await loadReferenceImages(niche, service);
  if (images.length === 0) return "";

  const system = `You are an art director analyzing example Meta ad creatives to extract REUSABLE LAYOUT STRUCTURE only.

STRICT RULES:
- Learn ONLY structure, composition, and placement: grid/zoning, where the headline vs subheadline vs body vs offer vs CTA sit, visual hierarchy, use of whitespace and color-blocking AS STRUCTURE, how a person/product is framed and positioned, and balance.
- IGNORE and NEVER reproduce the actual words, brand names, offers, products, photos, or specific imagery. Do not quote any text you see.
- Describe patterns abstractly and generically so they could apply to a DIFFERENT business in this niche.
- If the examples disagree, describe the dominant pattern and note the useful variations.`;

  const user = `These ${images.length} image(s) are strong example ad creatives for this niche. Extract the structural/placement patterns worth reusing — abstractly, content-free.`;

  try {
    const d = await analyzeImages({
      system,
      user,
      images,
      schema: DigestSchema,
      schemaName: "reference_layout_digest",
    });
    return [
      `Layout/composition: ${d.layoutPatterns}`,
      `Text placement & hierarchy: ${d.textPlacement}`,
      `CTA treatment: ${d.ctaTreatment}`,
      `Subject/person placement: ${d.subjectPlacement}`,
      `Overall: ${d.summary}`,
    ].join("\n");
  } catch {
    return ""; // on any failure, carry on as if no references existed
  }
}
