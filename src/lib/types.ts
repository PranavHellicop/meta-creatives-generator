import { z } from "zod";

// ---- Layout identifiers — picked per brief; guide the founder's placement in the generated ad ----
export const LAYOUT_TYPES = [
  "FounderRight",
  "FounderLeft",
  "CenteredPortrait",
  "OfferCard",
  "Testimonial",
  "CaseStudy",
  "Authority",
  "Transformation",
  "Comparison",
  "MinimalPremium",
  "Luxury",
  "LocalBusiness",
] as const;
export type LayoutType = (typeof LAYOUT_TYPES)[number];

export const FOUNDER_LAYOUTS: LayoutType[] = [
  "FounderRight",
  "FounderLeft",
  "CenteredPortrait",
  "Authority",
  "Testimonial",
];
export const BANNER_LAYOUTS: LayoutType[] = [
  "OfferCard",
  "CaseStudy",
  "Transformation",
  "Comparison",
  "MinimalPremium",
  "Luxury",
  "LocalBusiness",
];

export const ANGLE_TYPES = [
  "pain",
  "transformation",
  "authority",
  "offer",
  "case-study",
  "urgency",
  "comparison",
  "myth-busting",
  "convenience",
  "social-proof",
  "community",
  "expert",
  "lifestyle",
  "future-self",
  "risk-reversal",
] as const;
export type AngleType = (typeof ANGLE_TYPES)[number];

// ---- Stage [2]: Business Profile ----
// Focused on understanding WHO this expert is and WHY they're credible — not colors/fonts.
export const BusinessProfileSchema = z.object({
  brandName: z.string(),
  industry: z.string(),
  service: z.string(),
  offer: z.string(),
  founder: z.string().describe("Founder/expert name if known, else empty string"),
  // Expert intelligence — the core of what makes this person credible and unique
  expertAuthority: z.string().describe("Credentials, years in practice, number of clients served, certifications, media appearances, awards — any signals of expertise found in the content"),
  clientTransformation: z.string().describe("The specific, concrete before→after this expert delivers for clients. What does life look like before vs after working with them?"),
  competitiveDifferentiator: z.string().describe("What claim, method, or positioning makes this expert different from every other practitioner in this niche"),
  voiceAdjectives: z.array(z.string()).describe("5 words that describe the brand personality and communication style, derived from the actual copy tone"),
  brandPersonality: z.string().describe("How this expert shows up: e.g. warm-and-relatable, clinical-and-authoritative, premium-and-exclusive, bold-and-energetic, calm-and-nurturing"),
  // Service fundamentals
  brandTone: z.string(),
  socialProof: z.array(z.string()),
  testimonials: z.array(z.string()),
  usp: z.string(),
  pricingSignals: z.string(),
});
export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;

// ---- Stage [3]: Market Profile ----
// Niche-level intelligence: what works in this category of ads, not specific to this client.
export const MarketProfileSchema = z.object({
  painPoints: z.array(z.string()),
  desiredOutcomes: z.array(z.string()),
  motivations: z.array(z.string()),
  objections: z.array(z.string()),
  commonOffers: z.array(z.string()),
  buyerPsychology: z.string(),
  visualExpectations: z.string(),
  adPatterns: z.string(),
  // Niche design intelligence — what patterns win in this category's Meta ads
  typographyRecommendation: z.string().describe("What typography style and weight works best in Meta ads for this niche. Font personality, headline weight, body weight, and feel."),
  founderProportionZone: z.number().min(0.35).max(0.65).describe("What proportion of the ad width the founder/expert image typically occupies in high-performing ads for this niche (0.35–0.65)"),
  photographyDirection: z.string().describe("What backdrop environment, lighting style, colour temperature and overall mood works best for ads in this niche"),
  winningAdFormats: z.array(z.string()).describe("Proven ad format patterns that consistently work in this niche"),
});
export type MarketProfile = z.infer<typeof MarketProfileSchema>;

// ---- Stage [4]: Angle pool ----
export const AngleSchema = z.object({
  type: z.enum(ANGLE_TYPES),
  hook: z.string().describe("The strategic idea / promise of this angle in one line"),
  rationale: z.string().describe("Why this angle works for this audience"),
});
export const AnglePoolSchema = z.object({ angles: z.array(AngleSchema) });
export type Angle = z.infer<typeof AngleSchema>;

// ---- Stage [6]: Art direction ----
export const ArtDirectionSchema = z.object({
  primaryColor: z.string().describe("Hex"),
  secondaryColor: z.string().describe("Hex"),
  accentColor: z.string().describe("Hex, used for CTA / highlights"),
  textOnPrimary: z.string().describe("Hex, readable text color on the primary color"),
  typographyStyle: z.enum(["modern-sans", "elegant-serif", "bold-condensed", "clean-geometric"]),
  backgroundStyle: z.enum(["solid", "gradient", "soft-shapes", "photo-backdrop"]),
  iconStyle: z.enum(["line", "solid", "duotone"]),
  ctaStyle: z.enum(["pill", "rounded", "block"]),
  mood: z.string(),
});
// founderZone is not LLM-generated — it's injected by the orchestrator from the market profile.
export type ArtDirection = z.infer<typeof ArtDirectionSchema> & { founderZone?: number };

// ---- Stage [4.5]: Visual Anchor ----
// A locked, brand-specific visual modifier prepended to EVERY backdrop image generation prompt.
// Generated once per project. Makes the whole batch feel like one cohesive campaign.
export const VisualAnchorSchema = z.object({
  modifier: z.string().describe("50-75 word visual modifier: lighting, environment type, colour palette, mood, atmosphere — prepended to every backdrop generation prompt to ensure visual consistency across the batch"),
  rationale: z.string().describe("Why these visual choices fit this specific brand and expert"),
});
export type VisualAnchor = z.infer<typeof VisualAnchorSchema>;

// ---- Stage [5/6]: Creative brief (one per selected angle) ----
export const CreativeBriefSchema = z.object({
  goal: z.string(),
  emotion: z.string(),
  headline: z.string().describe("Punchy, <= 8 words"),
  subheadline: z.string().describe("Supporting line, <= 14 words"),
  supportingCopy: z.string().describe("One short benefit line, <= 16 words"),
  offer: z.string().describe("The concrete offer, e.g. 'Free 30-min consult'"),
  cta: z.string().describe("Button text, <= 4 words, e.g. 'Book Now'"),
  visualConcept: z.string().describe("Imagery/backdrop concept — scene/environment only, no text. Be specific about the setting."),
  trustElements: z.array(z.string()),
  authorityElements: z.array(z.string()),
  socialProofElements: z.array(z.string()),
  layoutType: z.enum(LAYOUT_TYPES),
  designStyle: z.string(),
  artDirection: ArtDirectionSchema,
});
export type CreativeBrief = z.infer<typeof CreativeBriefSchema>;

// Editable text snapshot stored on each creative.
export const EditableTextSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  supportingCopy: z.string(),
  offer: z.string(),
  cta: z.string(),
});
export type EditableText = z.infer<typeof EditableTextSchema>;

// ---- Stage [11]: Quality score ----
export const ScoreSchema = z.object({
  readability: z.number().min(0).max(10),
  visualHierarchy: z.number().min(0).max(10),
  offerClarity: z.number().min(0).max(10),
  ctaClarity: z.number().min(0).max(10),
  marketingStrength: z.number().min(0).max(10),
  metaAdSuitability: z.number().min(0).max(10),
  designQuality: z.number().min(0).max(10),
  professionalAppearance: z.number().min(0).max(10),
  trustworthiness: z.number().min(0).max(10),
  conversionPotential: z.number().min(0).max(10),
  notes: z.string(),
});
export type Score = z.infer<typeof ScoreSchema>;

// Which side the founder appears on for a given layout — used to guide the founder's
// placement in the generated ad.
export function founderSideFromLayout(layoutType: LayoutType): "left" | "right" | "center" {
  if (["FounderLeft"].includes(layoutType)) return "left";
  if (["CenteredPortrait"].includes(layoutType)) return "center";
  return "right"; // FounderRight, Authority, Testimonial
}
