import type { CreativeBrief, LayoutType } from "@/lib/types";
import { founderSideFromLayout } from "@/lib/types";

// The image model renders backdrop/environment ONLY — never text, never people.
// The visual anchor (generated once per project) is prepended to every call to keep
// the batch visually cohesive. Composition guidance tells the model exactly where to
// leave open negative space for the founder cutout.
export function buildBackdropPrompt(
  brief: CreativeBrief,
  visualAnchor: string,
  founderProportionZone: number
): string {
  const layoutType = brief.layoutType as LayoutType;
  const side = founderSideFromLayout(layoutType);
  const pct = Math.round(founderProportionZone * 100);

  const compositionGuide =
    side === "center"
      ? `Compose with the central ${pct}% of the frame naturally open and softly out of focus, with visual interest framing the left and right edges, leaving the centre clear for a subject standing in front.`
      : `Compose so the ${side === "right" ? "right" : "left"} ${pct}% of the frame is intentionally open, uncluttered, and in soft focus — this area will be occupied by a person in post-production. Place any environmental interest and depth on the ${side === "right" ? "left" : "right"} side.`;

  return [
    // Visual anchor locked per brand — maintains campaign consistency across all backdrops
    visualAnchor,
    // Scene-specific details from this creative's brief
    `Setting: ${brief.visualConcept}.`,
    // Composition instruction based on layout + niche proportion
    compositionGuide,
    // Hard constraints — no text, no people, no garbled content
    `Absolutely NO text, NO words, NO letters, NO numbers, NO signage, NO posters, NO screens, NO logos, NO watermarks anywhere in the image.`,
    `NO people, NO faces, NO human figures, NO mannequins, NO silhouettes.`,
    `Photorealistic, editorial commercial quality.`,
  ].join(" ");
}
