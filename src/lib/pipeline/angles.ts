import { complete } from "@/lib/openai/client";
import {
  AnglePoolSchema,
  type Angle,
  type BusinessProfile,
  type MarketProfile,
} from "@/lib/types";

// Generate a large pool of angles (≈3× the needed count), strongest-first.
export async function generateAnglePool(
  count: number,
  profile: BusinessProfile,
  market: MarketProfile
): Promise<Angle[]> {
  const poolSize = Math.min(40, Math.max(15, count * 3));

  const system = `You are a world-class direct-response creative strategist.
Generate a diverse pool of distinct advertising ANGLES for Meta ads.
Each angle must use a different strategic lever and feel genuinely different from the others.
Order them STRONGEST FIRST (the most likely to convert this audience).
Never repeat the same hook twice. Ground every angle in the real pains, desires, and offer below.`;

  const user = `BRAND: ${profile.brandName} — ${profile.service}
OFFER: ${profile.offer}
USP: ${profile.usp}
PAINS: ${market.painPoints.join("; ")}
DESIRES: ${market.desiredOutcomes.join("; ")}
OBJECTIONS: ${market.objections.join("; ")}
BUYER PSYCHOLOGY: ${market.buyerPsychology}

Generate exactly ${poolSize} distinct angles, strongest first.`;

  const { angles } = await complete({
    system,
    user,
    schema: AnglePoolSchema,
    schemaName: "angle_pool",
    temperature: 0.95,
  });

  // preScore by inverse rank (strongest first → highest score).
  return angles.map((a, i) => ({ ...a, preScore: (angles.length - i) / angles.length }) as Angle & { preScore: number });
}

// Select the N strongest while maximizing angle-TYPE diversity.
export function selectAngles<T extends Angle>(pool: T[], n: number): T[] {
  const selected: T[] = [];
  const usedTypes = new Set<string>();

  // First pass: take strongest of each unseen type.
  for (const a of pool) {
    if (selected.length >= n) break;
    if (!usedTypes.has(a.type)) {
      selected.push(a);
      usedTypes.add(a.type);
    }
  }
  // Second pass: fill remaining slots in strength order.
  for (const a of pool) {
    if (selected.length >= n) break;
    if (!selected.includes(a)) selected.push(a);
  }
  return selected.slice(0, n);
}
