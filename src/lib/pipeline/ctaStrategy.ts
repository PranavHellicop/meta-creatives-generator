import { z } from "zod";
import { complete } from "@/lib/openai/client";

const CombinabilitySchema = z.object({
  combinable: z.boolean(),
  reason: z.string(),
});

// Decide whether the user's provided CTAs can sensibly share ONE ad.
// They can ONLY combine when they're distinct, complementary actions (e.g. a
// primary "Book a Call" plus a different secondary "Download the Guide"). When
// they're synonyms / ask for the same action in different words (e.g. "Book Your
// Free Assessment" + "Claim Your Free Consultation"), putting both on one ad is
// redundant and cluttered — so we keep them on separate ads instead.
// Returns false (no combining) on <2 CTAs or if the judgment call fails.
export async function assessCtaCombinable(ctas: string[]): Promise<boolean> {
  if (ctas.length < 2) return false;
  try {
    const { combinable } = await complete({
      system: `You are a senior direct-response advertising strategist. You decide whether a set of call-to-action (CTA) phrases can sensibly appear TOGETHER on a single static ad creative.

They ARE combinable only if they represent DISTINCT, COMPLEMENTARY actions — a clear primary action plus a genuinely different secondary action (e.g. "Book a Call" + "Download the Free Guide", or "Shop Now" + "Join the Waitlist").

They are NOT combinable if they are synonyms, mean essentially the same thing, or ask for the same underlying action in different words (e.g. "Book Your Free Assessment" + "Claim Your Free Consultation"). Showing two redundant CTAs on one ad looks cluttered and confuses the response.

Be strict: when in doubt, treat them as NOT combinable.`,
      user: `CTAs:\n${ctas.map((c) => `- "${c}"`).join("\n")}\n\nCan these appear together on a SINGLE ad without being redundant or competing? Answer combinable true/false with a one-line reason.`,
      schema: CombinabilitySchema,
      schemaName: "cta_combinability",
      temperature: 0,
    });
    return combinable;
  } catch {
    // On any failure, prefer the safe choice: don't combine.
    return false;
  }
}
