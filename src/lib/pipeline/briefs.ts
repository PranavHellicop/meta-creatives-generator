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

// Per-angle copy & brief the user supplied that must be honored (aligned by index to `angles`).
// `requirement` is the operator's free-text prompt for this creative — it acts as the brief.
// `designDirectives` are the explicit design instructions mined from that prompt (+ notes).
export type CopyOverride = {
  headline?: string;
  subheadline?: string;
  ctas?: string[];
  requirement?: string;
  designDirectives?: string;
};

export async function generateBriefs(
  angles: Angle[],
  mode: "founder" | "banner",
  profile: BusinessProfile,
  market: MarketProfile,
  copyOverrides?: CopyOverride[],
  referenceGuidance?: string,
  designDirectives?: string
): Promise<CreativeBrief[]> {
  const allowed = mode === "founder" ? FOUNDER_LAYOUTS : BANNER_LAYOUTS;

  const system = `You are a senior Meta ads creative director + copywriter at a top performance agency.
For EACH angle, write a complete, production-ready creative brief for a 1:1 (1080×1080) Meta ad.

CRITICAL RULES:
- DEFAULT MARKET IS INDIA: unless the inputs clearly indicate another country, write for an Indian audience in Indian English and express any prices, discounts, or money amounts in Indian Rupees (₹).
- Copy is conversion-first, punchy, specific. No fluff, no clichés, no emojis.
- Headlines ≤ 8 words. CTA ≤ 4 words (e.g. "Book Now", "Get Started").
- visualConcept describes ONLY imagery/scene/mood — NEVER mention any text, words, or letters (text is rendered separately).
- ${mode === "founder"
      ? "These ads FEATURE the real founder/expert (photo provided separately). Compose around a person."
      : "NO people. Direct-response banner ads using typography, shapes, icons, stats, offer blocks."}
- layoutType MUST be one of: ${allowed.join(", ")}.
- MAXIMIZE diversity across the set: vary layoutType, headline structure, emotion, and color emphasis. Avoid two similar creatives.
- Keep colors on-brand using the brand palette, but vary which color leads each creative.
- Some angles below specify a REQUIRED HEADLINE, REQUIRED SUBHEADLINE, and/or REQUIRED CTA(s). For those, you MUST use that exact text verbatim, and write the remaining copy to fit and support it. For angles with no requirement, write your own per the rules above.
- If OPERATOR DESIGN REQUIREMENTS are given below, they are explicit client instructions and take PRIORITY: reflect any stated colors in artDirection (primaryColor/accentColor), honor stated typography in typographyStyle, and respect any stated layout/placement in layoutType and visualConcept. Never contradict them.`;

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
${angles
    .map((a, i) => {
      let line = `${i + 1}. [${a.type}] ${a.hook} — ${a.rationale}`;
      const ov = copyOverrides?.[i];
      if (ov?.requirement) {
        line += `\n   CLIENT BRIEF (this creative MUST fulfill this — let it DRIVE the angle, copy emphasis, and visualConcept; only invent what it leaves unspecified): "${ov.requirement}"`;
      }
      if (ov?.designDirectives) {
        line += `\n   DESIGN REQUIREMENTS FOR THIS CREATIVE (reflect in artDirection, typographyStyle, layoutType & visualConcept): ${ov.designDirectives}`;
      }
      if (ov?.headline) {
        line += `\n   REQUIRED HEADLINE (use this exact text, verbatim, as the headline): "${ov.headline}"`;
      }
      if (ov?.subheadline) {
        line += `\n   REQUIRED SUBHEADLINE (use this exact text, verbatim, as the subheadline): "${ov.subheadline}"`;
      }
      if (ov?.ctas?.length) {
        line +=
          ov.ctas.length === 1
            ? `\n   REQUIRED CTA (use this exact text, verbatim): "${ov.ctas[0]}"`
            : `\n   REQUIRED CTAs (feature ALL of these verbatim as call-to-action elements): ${ov.ctas
                .map((c) => `"${c}"`)
                .join(" and ")}`;
      }
      return line;
    })
    .join("\n")}

${referenceGuidance
      ? `\nREFERENCE LAYOUT PATTERNS (learned from example creatives in this niche — apply the STRUCTURE & PLACEMENT only; do NOT copy any words, brands, or imagery from them):\n${referenceGuidance}\n`
      : ""}
${designDirectives?.trim()
      ? `\nOPERATOR DESIGN REQUIREMENTS (explicit client instructions — honor these in every brief):\n${designDirectives.trim()}\n`
      : ""}
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
