import { complete } from "@/lib/openai/client";
import { BusinessProfileSchema, type BusinessProfile } from "@/lib/types";

interface Input {
  name: string;
  niche: string;
  service: string;
  audience: string;
  offer: string;
  notes?: string | null;
  igUrl?: string | null;
  fbUrl?: string | null;
  research: { text: string };
}

export async function buildBusinessProfile(input: Input): Promise<BusinessProfile> {
  const system = `You are a senior brand strategist conducting a deep intelligence briefing on a service business.
Your job is to understand WHO this expert really is and WHY someone should choose them — not describe their website.

FOCUS ON:
- Expert authority: specific credentials, years of experience, client count, certifications, media, awards
- Client transformation: the concrete before→after this person delivers (be specific, not generic)
- What makes them genuinely different from every other practitioner in their niche
- Their personality and communication style (derived from actual copy tone, not assumed)
- Real social proof found in the content (do not fabricate testimonials or numbers)

DO NOT:
- Invent credentials, statistics, or testimonials not found in the content
- Write generic filler ("they are passionate about helping people")
- Focus on website colors or design — that is irrelevant here
- Assume information not present in the content

If information is genuinely unavailable, state it briefly rather than padding with generics.`;

  const user = `BUSINESS NAME: ${input.name}
NICHE: ${input.niche}
PRIMARY SERVICE: ${input.service}
TARGET AUDIENCE: ${input.audience}
OFFER: ${input.offer}
${input.notes ? `ADDITIONAL NOTES FROM USER: ${input.notes}` : ""}
${input.igUrl ? `INSTAGRAM: ${input.igUrl}` : ""}
${input.fbUrl ? `FACEBOOK: ${input.fbUrl}` : ""}

WEBSITE CONTENT (extract intelligence from this — hero copy, about page, services, testimonials):
${input.research.text || "(No website provided — work from the details above)"}

Build a complete expert intelligence profile for this business.`;

  return complete({
    system,
    user,
    schema: BusinessProfileSchema,
    schemaName: "business_profile",
    temperature: 0.4,
  });
}
