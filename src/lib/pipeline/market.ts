import { complete } from "@/lib/openai/client";
import { MarketProfileSchema, type MarketProfile, type BusinessProfile } from "@/lib/types";
import { matchNiche } from "@/lib/kb/niches";

export async function buildMarketProfile(
  niche: string,
  audience: string,
  profile: BusinessProfile
): Promise<MarketProfile> {
  const kb = matchNiche(niche);

  const system = `You are a performance-marketing strategist who deeply understands what makes Meta ads work for service businesses.
Produce a market intelligence report combining:
1. AUDIENCE understanding — the real psychology of who buys this service
2. AD CREATIVE DESIGN PATTERNS — what typography, visual style, and layout proportions win in Meta ads for this niche

For the design patterns, rely on the seeded niche knowledge as grounding and adapt it to this specific business.
Be concrete and actionable — this data directly controls how the ads are built.`;

  const user = `NICHE: ${niche}
AUDIENCE: ${audience}
BRAND: ${profile.brandName} — ${profile.service}
OFFER: ${profile.offer}
EXPERT AUTHORITY: ${profile.expertAuthority}
BRAND PERSONALITY: ${profile.brandPersonality}
USP: ${profile.usp}

SEEDED NICHE INTELLIGENCE (ground truth — adapt, do not just copy):
Pain points: ${kb.painPoints.join("; ")}
Desired outcomes: ${kb.desiredOutcomes.join("; ")}
Common objections: ${kb.objections.join("; ")}
Visual expectations: ${kb.visualExpectations}
Ad patterns: ${kb.adPatterns}

NICHE DESIGN PATTERNS FOR META ADS (use these as the baseline, adjust for this specific business):
Typography recommendation: ${kb.typographyRecommendation}
Founder image proportion: ${kb.founderProportionZone} (proportion of ad width — e.g. 0.48 means the founder occupies 48% of the 1080px canvas width)
Photography style: ${kb.photographyStyle}
Winning ad formats: ${kb.winningAdFormats.join("; ")}

Produce a personalized market and design intelligence profile for THIS business.
For founderProportionZone, use the seeded value (${kb.founderProportionZone}) unless this brand's personality strongly suggests a different proportion.`;

  return complete({
    system,
    user,
    schema: MarketProfileSchema,
    schemaName: "market_profile",
    temperature: 0.5,
  });
}
