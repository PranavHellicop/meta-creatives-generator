// Seeded niche knowledge base. Used to GROUND the market-understanding LLM step.
// The LLM personalizes/extends this for the specific business and fills gaps for unlisted niches.

export interface NicheKnowledge {
  keywords: string[];
  painPoints: string[];
  desiredOutcomes: string[];
  objections: string[];
  commonOffers: string[];
  visualExpectations: string;
  adPatterns: string;
  // Typography: what style and weight wins in Meta ads for this niche
  typographyRecommendation: string;
  // Founder image zone: proportion of 1080px width the person occupies in winning ads (0.38–0.62)
  founderProportionZone: number;
  // Photography: what backdrop environment, lighting and mood works for this niche
  photographyStyle: string;
  // Winning ad formats: proven creative formats for this niche
  winningAdFormats: string[];
}

export const NICHE_KB: Record<string, NicheKnowledge> = {
  dentist: {
    keywords: ["dentist", "dental", "orthodont", "smile", "teeth"],
    painPoints: ["Crooked or yellow teeth", "Fear of pain", "Embarrassed to smile", "Cost worries"],
    desiredOutcomes: ["A confident smile", "Painless treatment", "Affordable plans", "Fast results"],
    objections: ["Will it hurt?", "Is it expensive?", "Do I need multiple visits?"],
    commonOffers: ["Free smile consultation", "£X off whitening", "0% finance", "Free check-up + clean"],
    visualExpectations: "Clean, clinical, trustworthy. White/blue palette. Smiling patients, before/after, doctor authority.",
    adPatterns: "Before/after smiles, free consult hooks, finance availability, local trust badges.",
    typographyRecommendation: "Clean geometric sans-serif, 700-800 weight headline, generous letter-spacing, never condensed. Body at 400-500 weight. Professional and legible above all.",
    founderProportionZone: 0.44,
    photographyStyle: "Bright, high-key clinical environment. Clean whites and soft blues. Studio or modern dental practice setting. Crisp directional lighting with minimal shadows. Calm and trustworthy.",
    winningAdFormats: ["Before/after split with doctor authority", "Free consultation offer card", "Statistic headline + trust badges", "Fear hook + painless solution"],
  },
  nutritionist: {
    keywords: ["nutrition", "dietit", "diet", "weight", "fat loss"],
    painPoints: ["Weight gain", "Low energy", "Failed diets", "Confusion about what to eat"],
    desiredOutcomes: ["Sustainable weight loss", "More energy", "Confidence", "A clear plan"],
    objections: ["I've tried everything", "No time to cook", "Too expensive", "Will it last?"],
    commonOffers: ["Free discovery call", "7-day meal plan", "12-week transformation", "First session free"],
    visualExpectations: "Fresh, green, transformation-focused. Coach authority. Healthy lifestyle imagery.",
    adPatterns: "Transformation stories, myth-busting diet claims, coach credibility, free plan lead magnets.",
    typographyRecommendation: "Rounded or modern sans-serif, 700-800 weight headline. Warm and approachable. Mixed weight hierarchy — bold headline, light body. Never harsh or condensed.",
    founderProportionZone: 0.50,
    photographyStyle: "Warm, natural light environment. Kitchen, wellness studio, or outdoor greenery. Soft earthy or fresh green tones. Lifestyle feel, not clinical. Bright and energising.",
    winningAdFormats: ["Coach transformation story", "Myth-busting hook + solution", "Free meal plan lead magnet", "Before/after result with social proof"],
  },
  "health-coach": {
    keywords: ["health coach", "wellness", "holistic"],
    painPoints: ["Burnout", "Bad habits", "No accountability", "Overwhelm"],
    desiredOutcomes: ["Balance", "Sustainable habits", "Energy", "Accountability"],
    objections: ["Do I really need a coach?", "Cost", "Will I stick with it?"],
    commonOffers: ["Free clarity call", "30-day reset", "1:1 coaching", "Group program"],
    visualExpectations: "Warm, calming, aspirational lifestyle. Earthy or soft palettes. Coach presence.",
    adPatterns: "Future-self framing, accountability angle, free call lead magnet.",
    typographyRecommendation: "Clean modern sans-serif or soft geometric, 600-800 weight. Warm and inviting tone. No heavy condensed styles. Body text at generous size for readability.",
    founderProportionZone: 0.48,
    photographyStyle: "Warm ambient natural light. Minimalist wellness studio, home office, or nature setting. Earthy tones — cream, sage, warm beige. Calm, grounded, aspirational lifestyle feel.",
    winningAdFormats: ["Future-self lifestyle hook", "Accountability story + free call CTA", "3-step transformation framework", "Relatable pain point + solution reveal"],
  },
  "business-coach": {
    keywords: ["business coach", "consultant", "executive", "entrepreneur", "founder coach", "scale", "revenue"],
    painPoints: ["Stuck revenue", "Overworked", "No systems", "Imposter syndrome"],
    desiredOutcomes: ["Scale revenue", "Reclaim time", "Clear strategy", "Confidence"],
    objections: ["ROI?", "Is it worth it?", "I can figure it out myself"],
    commonOffers: ["Free strategy call", "Scale to 6-figures program", "Mastermind", "1:1 mentorship"],
    visualExpectations: "Premium, dark, gold accents. Authority. Clean corporate but bold.",
    adPatterns: "Case-study results, authority positioning, dollar-figure proof, free strategy call.",
    typographyRecommendation: "Strong bold condensed or heavy geometric sans-serif, 800-900 weight headline. Commands authority. Tight tracking, high visual impact. Body text clean and confident.",
    founderProportionZone: 0.46,
    photographyStyle: "Premium executive environments. Modern office, luxury co-working, or sleek studio. Deep navy, charcoal, or warm-dark tones with gold or amber accents. Directional dramatic lighting. Confident and authoritative.",
    winningAdFormats: ["Revenue result case study", "Authority positioning + free strategy call", "Pain hook + income breakthrough story", "Bold income claim + credibility proof"],
  },
  dermatologist: {
    keywords: ["derma", "skin", "aesthet", "cosmetic clinic", "botox", "filler", "laser"],
    painPoints: ["Acne / scarring", "Aging skin", "Pigmentation", "Failed products"],
    desiredOutcomes: ["Clear glowing skin", "Confidence", "Expert-backed results"],
    objections: ["Is it safe?", "Cost", "Downtime?"],
    commonOffers: ["Free skin consultation", "£X off first treatment", "Skin assessment"],
    visualExpectations: "Clean, premium medical-aesthetic. Soft neutral/blush palette. Glowing skin close-ups.",
    adPatterns: "Before/after skin, expert authority, free consult hooks.",
    typographyRecommendation: "Elegant light-weight or clean geometric sans-serif, 600-700 weight. Refined and premium. Generous white space around type. Letter-spaced for a luxury feel.",
    founderProportionZone: 0.44,
    photographyStyle: "Soft, high-key clinical-aesthetic environment. Blush, cream, and soft ivory tones. Minimal props. Studio-lit with diffused light. Premium medical spa aesthetic. Glowing and refined.",
    winningAdFormats: ["Before/after skin result + expert credibility", "Free consultation hook + safe-sounding CTA", "Specific treatment offer + no-downtime benefit", "Skin concern hook + solution reveal"],
  },
  salon: {
    keywords: ["salon", "hair", "beauty", "barber", "spa", "nails", "lash", "brow"],
    painPoints: ["Bad past experiences", "Boring look", "Want a refresh"],
    desiredOutcomes: ["Feel beautiful", "A fresh transformation", "Pampered experience"],
    objections: ["Price", "Will they get my style?", "Trust the stylist?"],
    commonOffers: ["X% off first visit", "Free consultation", "New-client package"],
    visualExpectations: "Stylish, aspirational, on-trend. Bold or luxe palette. Transformation imagery.",
    adPatterns: "Before/after looks, new-client discounts, lifestyle aspiration.",
    typographyRecommendation: "Elegant serif display for headlines paired with clean sans-serif body. 600-700 weight. Stylish and fashion-forward. Mix of light and bold weights for editorial feel.",
    founderProportionZone: 0.50,
    photographyStyle: "Stylish salon or studio environment. Warm spotlight lighting. Rich textures — marble, brass, soft fabrics. Aspirational and fashion-forward. Warm or moody editorial tones.",
    winningAdFormats: ["Hair transformation before/after", "New client offer with aspirational image", "Stylist authority + booking urgency", "Seasonal look reveal + discount CTA"],
  },
  "fitness-trainer": {
    keywords: ["fitness", "personal train", "gym", "pt", "strength", "bootcamp", "crossfit", "hiit"],
    painPoints: ["Out of shape", "No motivation", "Don't know how to train", "Tried and quit"],
    desiredOutcomes: ["Get lean/strong", "Confidence", "Accountability", "Visible results"],
    objections: ["No time", "Too expensive", "Will it work for me?"],
    commonOffers: ["Free trial session", "6-week challenge", "First week free", "1:1 coaching"],
    visualExpectations: "Energetic, bold, high-contrast. Transformation imagery. Coach presence.",
    adPatterns: "Transformation challenge hooks, social proof, urgency (limited spots).",
    typographyRecommendation: "Ultra-bold condensed or heavy impact-style sans-serif, 800-900 weight. High contrast, aggressive energy. Tight tracking. Body text at solid 600 weight — nothing light.",
    founderProportionZone: 0.55,
    photographyStyle: "Dynamic gym or outdoor training environment. High-contrast dramatic lighting with strong shadows. Dark greys, blacks with vivid accent tones. High-energy and motivational. Strong and athletic.",
    winningAdFormats: ["Body transformation challenge hook", "Limited spots urgency + social proof", "Pain point → 6-week result story", "Free trial session with bold before/after"],
  },
  "yoga-teacher": {
    keywords: ["yoga", "pilates", "meditation", "mindful", "breathwork"],
    painPoints: ["Stress", "Stiffness/pain", "No balance", "Disconnected"],
    desiredOutcomes: ["Calm", "Flexibility", "Strength", "Community"],
    objections: ["Am I flexible enough?", "Cost", "Will I fit in?"],
    commonOffers: ["Free first class", "Intro week", "New-student package", "Online membership"],
    visualExpectations: "Calm, natural light, soft earthy palette. Movement and serenity.",
    adPatterns: "Beginner-friendly framing, community angle, free first class.",
    typographyRecommendation: "Light to medium weight elegant sans-serif or humanist typeface, 400-600 weight. Airy spacing. Gentle, never heavy or condensed. Sometimes a handwritten accent for warmth.",
    founderProportionZone: 0.50,
    photographyStyle: "Serene natural or studio environment. Soft window light or candlelight. Warm whites, soft sage, blush and earth tones. Calm, minimal, meditative. Wide open negative space.",
    winningAdFormats: ["Beginner-friendly calm hook", "Community and belonging angle", "Free first class + low-risk CTA", "Stress/anxiety pain hook + serenity promise"],
  },
  "real-estate": {
    keywords: ["real estate", "realtor", "property", "estate agent", "homes", "lettings"],
    painPoints: ["Selling slowly", "Overpaying", "Confusing process", "Wrong agent"],
    desiredOutcomes: ["Sell fast for more", "Dream home", "Smooth process", "Expert guidance"],
    objections: ["High fees", "Will it sell?", "Trust the agent?"],
    commonOffers: ["Free home valuation", "Free buyer consult", "Sold-in-X-days guarantee"],
    visualExpectations: "Premium, aspirational, clean. Property hero imagery. Agent authority.",
    adPatterns: "Just-sold proof, free valuation hook, local market authority.",
    typographyRecommendation: "Clean elegant sans-serif or premium geometric, 600-700 weight. Professional and polished. Never condensed or heavy. Ample breathing room. Aspirational but trustworthy feel.",
    founderProportionZone: 0.42,
    photographyStyle: "Aspirational property or upscale neighbourhood environment. Warm golden-hour tones or clean bright daylight. Premium architectural feel. Uncluttered and spacious. Trust and prosperity.",
    winningAdFormats: ["Just-sold social proof + local authority", "Free valuation low-risk hook", "Sold-fast guarantee + agent credibility", "Dream home aspiration + consultation CTA"],
  },
  consultant: {
    keywords: ["consult", "advisor", "agency", "b2b", "freelance", "strategy", "management"],
    painPoints: ["Inefficiency", "Lost revenue", "No expertise in-house", "Slow growth"],
    desiredOutcomes: ["Measurable results", "Expert partner", "Faster growth", "Peace of mind"],
    objections: ["ROI?", "Why you?", "Cost"],
    commonOffers: ["Free audit", "Strategy call", "Done-for-you package"],
    visualExpectations: "Clean, corporate, credible. Restrained palette with one bold accent. Data/proof.",
    adPatterns: "Audit lead magnet, case-study proof, authority positioning.",
    typographyRecommendation: "Strong modern sans-serif or confident geometric, 700-800 weight headline. Business-credible. Clean hierarchy. Body text at 500 weight — substantial but not heavy.",
    founderProportionZone: 0.44,
    photographyStyle: "Clean modern corporate or co-working environment. Neutral greys, whites, with one strong accent. Soft professional lighting. Minimal and focused. Communicates competence and clarity.",
    winningAdFormats: ["Revenue/efficiency result case study", "Free audit lead magnet", "Specific pain point + measurable solution", "Authority credibility + strategy call CTA"],
  },
  generic: {
    keywords: [],
    painPoints: ["Current solution isn't working", "Wasting time/money", "Lack of trust", "Confusion"],
    desiredOutcomes: ["A reliable result", "Confidence", "Save time/money", "Expert help"],
    objections: ["Cost", "Does it work?", "Why choose you?"],
    commonOffers: ["Free consultation", "Intro offer", "Money-back guarantee", "First session free"],
    visualExpectations: "Clean, trustworthy, professional. Brand-led palette. Clear benefit-driven design.",
    adPatterns: "Clear offer, strong CTA, social proof, benefit-led headlines.",
    typographyRecommendation: "Clean modern sans-serif, 700 weight headline, 400-500 body weight. Clear hierarchy, highly legible. Professional and neutral — avoid extremes in either direction.",
    founderProportionZone: 0.48,
    photographyStyle: "Clean, professional, neutral environment. Bright natural or studio lighting. Restrained colour palette — whites, light greys, one brand accent. Uncluttered, trustworthy, approachable.",
    winningAdFormats: ["Clear offer + strong CTA", "Pain point hook + solution", "Social proof + authority", "Free intro offer + low-risk CTA"],
  },
};

export function matchNiche(niche: string): NicheKnowledge {
  const n = niche.toLowerCase();
  for (const entry of Object.values(NICHE_KB)) {
    if (entry.keywords.some((k) => n.includes(k))) return entry;
  }
  return NICHE_KB.generic;
}
