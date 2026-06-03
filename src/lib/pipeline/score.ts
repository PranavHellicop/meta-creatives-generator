import { scoreImage } from "@/lib/openai/client";
import { ScoreSchema, type Score } from "@/lib/types";

// Vision-score a finished creative PNG across the 10 quality criteria.
export async function scoreCreative(pngBase64: string): Promise<{ score: Score; overall: number }> {
  const system = `You are a senior Meta ads creative reviewer at a top performance agency.
Score the ad creative image strictly and honestly on each criterion from 0-10.
Judge it as a real client-facing Meta ad: readability, hierarchy, offer/CTA clarity, marketing strength,
Meta-ad suitability, design quality, professional appearance, trustworthiness, conversion potential.
Penalize garbled text, weak hierarchy, or amateur design. Keep notes to one short sentence.`;

  const score = await scoreImage({
    system,
    user: "Score this 1080x1080 Meta ad creative.",
    pngBase64,
    schema: ScoreSchema,
    schemaName: "creative_score",
  });

  const keys: (keyof Score)[] = [
    "readability", "visualHierarchy", "offerClarity", "ctaClarity", "marketingStrength",
    "metaAdSuitability", "designQuality", "professionalAppearance", "trustworthiness", "conversionPotential",
  ];
  const overall = keys.reduce((s, k) => s + (score[k] as number), 0) / keys.length;
  return { score, overall: Math.round(overall * 10) / 10 };
}
