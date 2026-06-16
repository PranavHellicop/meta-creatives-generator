import { complete } from "@/lib/openai/client";
import { VisualAnchorSchema, type VisualAnchor, type BusinessProfile, type MarketProfile } from "@/lib/types";

// Generate a locked visual modifier for this brand — prepended to EVERY backdrop image
// generation prompt. Makes the entire creative batch feel like one cohesive campaign shoot
// rather than a collection of unrelated images.
export async function generateVisualAnchor(
  profile: BusinessProfile,
  market: MarketProfile
): Promise<VisualAnchor> {
  const system = `You are a top commercial photography art director.
Write a precise visual modifier that will be prepended to AI image generation prompts to lock in
a consistent photographic identity for an entire ad campaign.

The modifier must describe:
- The physical environment or setting (specific, not generic)
- Lighting style and quality (directional, diffused, golden-hour, studio, natural window light, etc.)
- Colour temperature and palette (warm/cool, specific tones)
- Overall photographic mood and atmosphere
- Quality descriptors (bokeh, depth of field, editorial, commercial, etc.)

The modifier must NOT mention:
- Text, words, letters, logos, or signage
- People, faces, or human figures (the founder is composited separately)
- The brand name or business name

Unless the brand context clearly indicates another country, assume an Indian market: choose
settings, environments, and visual cues that read as authentically Indian.

Keep it 50-75 words. Make it specific enough that all 5-10 images generated from it
look like they came from the same shoot.`;

  const user = `BRAND: ${profile.brandName}
NICHE: ${profile.industry}
EXPERT PERSONALITY: ${profile.brandPersonality}
VOICE: ${profile.voiceAdjectives.join(", ")}
CLIENT TRANSFORMATION: ${profile.clientTransformation}

PHOTOGRAPHY DIRECTION FOR THIS NICHE: ${market.photographyDirection}
VISUAL EXPECTATIONS: ${market.visualExpectations}
OVERALL MOOD NEEDED: ${market.buyerPsychology}

Write the visual anchor modifier for this brand's ad campaign.`;

  return complete({
    system,
    user,
    schema: VisualAnchorSchema,
    schemaName: "visual_anchor",
    temperature: 0.7,
  });
}
