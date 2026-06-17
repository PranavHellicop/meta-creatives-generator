import { z } from "zod";
import { complete } from "@/lib/openai/client";

const DirectivesSchema = z.object({
  colors: z.string(),     // explicit color / palette instructions, "" if none stated
  placement: z.string(),  // where specific elements must go (offer, CTA, headline, founder, etc.), "" if none
  layout: z.string(),     // overall composition / layout / format requests, "" if none
  typography: z.string(), // font / text-style requests, "" if none
  other: z.string(),      // any other explicit design instruction, "" if none
  logoRequested: z.boolean(), // TRUE only if the operator explicitly asked to include a logo
});

export type DesignDirectives = { directives: string; logoRequested: boolean };

// Mine the operator's free-text prompt (+ notes) for EXPLICIT design instructions so
// the briefs and final render honor them: color requirements, where elements should be
// placed (offer/CTA/headline/founder), layout/format requests, typography, etc. It also
// detects whether a logo was explicitly requested — by default NO logo is ever rendered.
//
// This extracts ONLY what the operator actually stated. If they gave no design guidance,
// every field is "" and we return an empty directive set (and skip the LLM entirely).
export async function extractDesignDirectives(input: {
  prompt?: string | null;
  notes?: string | null;
}): Promise<DesignDirectives> {
  const prompt = input.prompt?.trim() || "";
  const notes = input.notes?.trim() || "";
  if (!prompt && !notes) return { directives: "", logoRequested: false };

  const system = `You analyze an ad operator's free-text brief and extract ONLY the EXPLICIT design
instructions they actually stated about how the creative should look or be laid out. Do NOT invent,
infer, or add anything they did not state — if they said nothing about a category, return "" for it.

Extract into these categories (each a short imperative instruction, or "" if the operator said nothing):
- colors: any color / palette requirements (e.g. "use navy and gold", "green brand color").
- placement: where specific elements must be positioned (e.g. "offer in a badge top-right", "CTA at
  the bottom", "headline up top", "founder on the left").
- layout: overall composition / format requests (e.g. "minimal", "split layout", "lots of whitespace").
- typography: font / text-style requests (e.g. "bold condensed headlines", "elegant serif").
- other: any other explicit visual instruction that doesn't fit above.

Also set logoRequested = true ONLY if the operator EXPLICITLY asked to include/show a brand logo or
wordmark. If they did not mention a logo at all, set it false.

Quote or closely paraphrase the operator's own words. Never fabricate brand colors or placements.`;

  const user = `OPERATOR PROMPT:
${prompt || "(none)"}

ADDITIONAL NOTES:
${notes || "(none)"}

Extract the explicit design directives.`;

  const result = await complete({
    system,
    user,
    schema: DirectivesSchema,
    schemaName: "design_directives",
    temperature: 0,
  });

  // Format only the non-empty categories into a clean, render-ready directive list.
  const parts: string[] = [];
  const add = (label: string, val: string) => {
    const v = val.trim();
    if (v) parts.push(`${label}: ${v}`);
  };
  add("Colors", result.colors);
  add("Element placement", result.placement);
  add("Layout/composition", result.layout);
  add("Typography", result.typography);
  add("Other", result.other);

  return { directives: parts.join(" | "), logoRequested: result.logoRequested };
}
