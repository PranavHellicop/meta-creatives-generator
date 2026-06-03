import { z } from "zod";
import { complete } from "@/lib/openai/client";
import {
  CreativeBriefSchema,
  FOUNDER_LAYOUTS,
  BANNER_LAYOUTS,
  type CreativeBrief,
  type Angle,
  type BusinessProfile,
  type MarketProfile,
  type LayoutType,
} from "@/lib/types";

const BriefBatchSchema = z.object({ briefs: z.array(CreativeBriefSchema) });

export async function generateBriefs(
  angles: Angle[],
  mode: "founder" | "banner",
  profile: BusinessProfile,
  market: MarketProfile
): Promise<CreativeBrief[]> {
  const allowed = mode === "founder" ? FOUNDER_LAYOUTS : BANNER_LAYOUTS;

  const system = `You are a senior Meta ads creative director + copywriter at a top performance agency.
For EACH angle, write a complete, production-ready creative brief for a 1:1 (1080×1080) Meta ad.

CRITICAL RULES:
- Copy is conversion-first, punchy, specific. No fluff, no clichés, no emojis.
- Headlines ≤ 8 words. CTA ≤ 4 words (e.g. "Book Now", "Get Started").
- visualConcept describes ONLY imagery/scene/mood — NEVER mention any text, words, or letters (text is rendered separately).
- ${mode === "founder"
      ? "These ads FEATURE the real founder/expert (photo provided separately). Compose around a person."
      : "NO people. Direct-response banner ads using typography, shapes, icons, stats, offer blocks."}
- layoutType MUST be one of: ${allowed.join(", ")}.
- MAXIMIZE diversity across the set: vary layoutType, headline structure, emotion, and color emphasis. Avoid two similar creatives.
- Keep colors on-brand using the brand palette, but vary which color leads each creative.`;

  const user = `BRAND: ${profile.brandName} — ${profile.service}
OFFER: ${profile.offer}
USP: ${profile.usp}
BRAND TONE: ${profile.brandTone}
EXPERT AUTHORITY: ${profile.expertAuthority}
CLIENT TRANSFORMATION: ${profile.clientTransformation}
COMPETITIVE DIFFERENTIATOR: ${profile.competitiveDifferentiator}
BRAND PERSONALITY: ${profile.brandPersonality}
SOCIAL PROOF: ${profile.socialProof.join("; ") || "(none — do not fabricate)"}
TESTIMONIALS: ${profile.testimonials.join(" | ") || "(none — do not fabricate)"}

MARKET INTELLIGENCE:
Pains: ${market.painPoints.join("; ")}
Desires: ${market.desiredOutcomes.join("; ")}
Objections to pre-empt: ${market.objections.join("; ")}
Buyer psychology: ${market.buyerPsychology}
Typography that wins in this niche: ${market.typographyRecommendation}
Photography direction: ${market.photographyDirection}

ANGLES (write one brief per angle, in this exact order):
${angles.map((a, i) => `${i + 1}. [${a.type}] ${a.hook} — ${a.rationale}`).join("\n")}

Produce exactly ${angles.length} briefs in the same order. Use only allowed layouts: ${allowed.join(", ")}.
Choose typographyStyle based on the niche recommendation above.`;

  const { briefs } = await complete({
    system,
    user,
    schema: BriefBatchSchema,
    schemaName: "creative_brief_batch",
    temperature: 0.85,
  });

  return enforceTypographyDiversity(enforceLayoutDiversity(briefs, allowed));
}

// Clamp layouts to the allowed set and reduce repetition (round-robin spread).
function enforceLayoutDiversity(briefs: CreativeBrief[], allowed: LayoutType[]): CreativeBrief[] {
  const counts = new Map<LayoutType, number>();
  const cap = Math.ceil(briefs.length / allowed.length) + 1; // max times any one layout may appear

  return briefs.map((b) => {
    let layout = (allowed.includes(b.layoutType) ? b.layoutType : allowed[0]) as LayoutType;
    if ((counts.get(layout) ?? 0) >= cap) {
      // pick the least-used allowed layout instead
      layout = allowed.reduce((best, l) =>
        (counts.get(l) ?? 0) < (counts.get(best) ?? 0) ? l : best
      , allowed[0]);
    }
    counts.set(layout, (counts.get(layout) ?? 0) + 1);
    return { ...b, layoutType: layout };
  });
}

// Spread typography styles so the batch doesn't render in one monotonous font.
// The model often picks the same style for every brief; we round-robin overused ones.
const TYPO_STYLES = ["modern-sans", "elegant-serif", "bold-condensed", "clean-geometric"] as const;
function enforceTypographyDiversity(briefs: CreativeBrief[]): CreativeBrief[] {
  if (briefs.length < 2) return briefs;
  const counts = new Map<string, number>();
  const cap = Math.max(1, Math.ceil(briefs.length / TYPO_STYLES.length));

  return briefs.map((b) => {
    let style = b.artDirection.typographyStyle;
    if ((counts.get(style) ?? 0) >= cap) {
      style = TYPO_STYLES.reduce((best, s) =>
        (counts.get(s) ?? 0) < (counts.get(best) ?? 0) ? s : best
      , TYPO_STYLES[0]);
    }
    counts.set(style, (counts.get(style) ?? 0) + 1);
    return { ...b, artDirection: { ...b.artDirection, typographyStyle: style } };
  });
}
