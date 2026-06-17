import type { CreativeBrief, LayoutType } from "@/lib/types";
import { founderSideFromLayout } from "@/lib/types";

// The image model renders the COMPLETE ad — backdrop, layout, and all text — as
// a single finished 1080×1080 image. The copy (headline, sub, CTA, offer) from
// the research pipeline is passed directly; the model decides placement and style.
// The generated PNG is the final output.
export function buildFullAdPrompt(
  brief: CreativeBrief,
  visualAnchor: string,
  founderProportionZone: number,
  mode: "founder" | "banner",
  ctas?: string[],
  referenceGuidance?: string,
  designDirectives?: string,
  logoRequested?: boolean,
  brandName?: string
): string {
  const layoutType = brief.layoutType as LayoutType;
  const side = founderSideFromLayout(layoutType);
  const pct = Math.round(founderProportionZone * 100);

  // CTA(s) to render: explicit override list if provided, else the brief's single CTA.
  const ctaList = ctas && ctas.length ? ctas : [brief.cta];
  const ctaLine =
    ctaList.length === 1
      ? `• CTA button (bold, high-contrast button): "${ctaList[0]}"`
      : `• CTA elements — feature ALL of these as distinct, prominent call-to-action elements (e.g. a primary CTA button plus a secondary button or lead-in line), each crisp and clearly legible: ${ctaList
          .map((c) => `"${c}"`)
          .join(" and ")}`;

  const personInstruction =
    mode === "founder"
      ? side === "center"
        ? `Use the REAL PERSON from the provided reference photograph as the expert/founder. Preserve their actual face, identity, and likeness exactly. Remove/replace their original background and integrate them naturally into the scene, occupying the central ${pct}% of the frame as a professional half-body portrait with consistent lighting.`
        : `Use the REAL PERSON from the provided reference photograph as the expert/founder. Preserve their actual face, identity, and likeness exactly. Remove/replace their original background and place them as a confident professional portrait on the ${side} ${pct}% of the frame, with lighting that matches the scene.`
      : `No people. This is a direct-response banner ad using bold typography, shapes, and graphic design elements.`;

  const textZone =
    mode === "founder"
      ? side === "center"
        ? `Place all text in clearly readable zones — headline and brand at the top third, CTA and offer at the bottom third. Ensure the text never overlaps the person.`
        : `Place all text on the ${side === "right" ? "left" : "right"} side of the image, clearly separated from the person.`
      : `Use a clean layout with the headline dominating the upper half and the CTA prominent at the bottom.`;

  // The operator may have stated explicit design requirements in their prompt (colors,
  // where the offer/CTA/headline go, layout, typography). These are AUTHORITATIVE and
  // override the generic defaults above wherever they conflict.
  const directivesLine = designDirectives?.trim()
    ? `OPERATOR DESIGN REQUIREMENTS — these are explicit instructions from the client and take PRIORITY over the generic guidance above; follow them exactly: ${designDirectives.trim()}.`
    : "";

  // Logo policy. By default NEVER show a logo and NEVER invent one. Only when the operator
  // explicitly asked for a logo do we allow the brand NAME as a clean typeset wordmark —
  // still never an invented graphic mark/emblem (we have no logo asset to reproduce).
  const logoLine = logoRequested
    ? `• Brand presence: render the brand name${brandName?.trim() ? ` "${brandName.trim()}"` : ""} as a clean, simple typeset text wordmark only. Do NOT invent or draw any graphic logo, emblem, icon-mark, or symbol — text wordmark only.`
    : `• ABSOLUTELY NO LOGO: do not include, draw, invent, or hallucinate any brand logo, emblem, wordmark, monogram, or symbol anywhere in the creative. Leave that space clean. This is a hard requirement.`;

  const lines = [
    `Create a complete, professional Meta ad creative (1080×1080 pixels, square format).`,
    visualAnchor,
    `Scene/backdrop: ${brief.visualConcept}.`,
    personInstruction,
    textZone,
    `Unless the brand or scene clearly indicates another country, assume an Indian market: any depicted people (other than a provided founder photo), settings, attire, and props should read as authentically Indian, and render any prices or money amounts in Indian Rupees (₹).`,
    referenceGuidance
      ? `Follow these proven structural/placement patterns for this niche (structure ONLY — do not copy any words or imagery from the references): ${referenceGuidance.replace(/\n/g, " ")}`
      : "",
    directivesLine,
    ``,
    `EXACT TEXT TO RENDER ON THE AD:`,
    `• Headline (large, bold, most prominent element): "${brief.headline}"`,
    `• Subheadline (secondary, smaller): "${brief.subheadline}"`,
    brief.supportingCopy ? `• Supporting copy (body text, smallest): "${brief.supportingCopy}"` : "",
    brief.offer ? `• Offer callout (highlighted, eye-catching): "${brief.offer}"` : "",
    ctaLine,
    ``,
    `DESIGN SPECS:`,
    `• Typography style: ${brief.artDirection.typographyStyle}`,
    `• Primary color: ${brief.artDirection.primaryColor}`,
    `• Accent/CTA color: ${brief.artDirection.accentColor}`,
    `• Mood: ${brief.artDirection.mood}`,
    logoLine,
    `• All text must be crisp, perfectly legible, and professionally typeset — no handwriting, no distortion.`,
    `• High-end commercial advertising quality. Agency-standard layout. Print-ready sharpness.`,
  ].filter(Boolean);

  return lines.join(" ");
}

// Tier-1 edit: re-feed a finished creative to the image edit endpoint and apply a
// SINGLE change while preserving everything else. Validated by spike — even a
// full headline rewrite preserves the rest of the ad with no mask.
export function buildEditPrompt(instruction: string): string {
  return [
    `Here is a finished, complete 1080×1080 square Meta ad creative.`,
    `Make ONLY this single change: ${instruction}`,
    `Keep EVERYTHING else pixel-for-pixel identical — the same layout, composition, fonts, font sizes and weights, colors, every photo and graphic, all badges, the offer, the CTA, the feature icons, and all other text.`,
    `Do not move, recolor, restyle, crop, or re-render any element other than the one specified. Match the existing typography and positioning of the changed element.`,
    `All text must remain crisp, perfectly legible, and professionally typeset.`,
  ].join(" ");
}
