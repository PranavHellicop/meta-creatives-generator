import { z } from "zod";
import { complete } from "@/lib/openai/client";

const BasicsSchema = z.object({
  name: z.string(),
  niche: z.string(),
  service: z.string(),
  offer: z.string(),
  audience: z.string(),
});
export type ProjectBasics = z.infer<typeof BasicsSchema>;

type Input = {
  prompt?: string | null;
  audience?: string | null;
  headlines: string[];
  subheadlines: string[];
  ctas: string[];
  notes?: string | null;
  research: { text: string };
};

// The new form is prompt-first: it no longer asks for business name / niche / service
// / offer. This step derives them so the rest of the pipeline (and the UI/Canva/
// references that read these Project fields) keeps working unchanged.
//
// It mines EVERYTHING the user provided — the free-text prompt is the primary source
// of intent, combined with the headlines/subheadlines/CTAs, notes, and any website
// research — to extract the most faithful business details possible. It only invents
// where the inputs are genuinely silent.
export async function deriveProjectBasics(input: Input): Promise<ProjectBasics> {
  const system = `You are a senior brand strategist setting up an ad campaign from minimal input.
From everything the operator provided, extract the core business facts. Mine ALL of it — the prompt
is the primary statement of intent; the headlines, subheadlines, CTAs, notes, and website content
are rich additional signal. Extract:
- name: the business/brand name. Use the real name if it appears anywhere in the inputs. ONLY if no
  name is evident, invent a concise, fitting, professional brand name for this business.
- niche: the industry / category (e.g. "Dentist", "Physiotherapy clinic", "SaaS for realtors").
- service: the primary service or product being advertised.
- offer: the core promotion/offer/hook — pull any pricing, discount, free trial, or guarantee
  mentioned ANYWHERE in the inputs. If none is stated, infer a reasonable lead offer for this niche.
- audience: the target audience. If the operator supplied one, use it VERBATIM; otherwise infer it.

Prefer concrete details the user actually wrote over generic guesses. Do not fabricate credentials,
statistics, or claims. Keep each field short and specific.

Default market is India: unless the inputs clearly indicate another country, assume an Indian
audience and express any inferred prices/offers in Indian Rupees (₹).`;

  const user = `OPERATOR PROMPT (primary intent): ${input.prompt?.trim() || "(none provided)"}
PROVIDED AUDIENCE: ${input.audience?.trim() || "(none — infer it)"}
HEADLINES:
${input.headlines.map((h) => `- ${h}`).join("\n") || "(none)"}
SUBHEADLINES:
${input.subheadlines.map((s) => `- ${s}`).join("\n") || "(none)"}
CTAS:
${input.ctas.map((c) => `- ${c}`).join("\n") || "(none)"}
${input.notes ? `NOTES: ${input.notes}` : ""}

WEBSITE CONTENT (if any):
${input.research.text?.slice(0, 6000) || "(no website provided)"}

Extract the business basics.`;

  return complete({
    system,
    user,
    schema: BasicsSchema,
    schemaName: "project_basics",
    temperature: 0.2,
  });
}
