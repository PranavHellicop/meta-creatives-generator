import { prisma } from "@/lib/db";
import { researchWebsite } from "./research";
import { buildBusinessProfile } from "./businessProfile";
import { buildMarketProfile } from "./market";
import { generateVisualAnchor } from "./visualAnchor";
import { generateAnglePool, selectAngles } from "./angles";
import { generateBriefs } from "./briefs";
import { buildFullAdPrompt } from "./imagePrompt";
import { scoreCreative } from "./score";
import { generateImage, editImage } from "@/lib/openai/client";
import { saveFile, readFile } from "@/lib/storage";
import { buildCtaVariants } from "@/lib/copyInput";
import { assessCtaCombinable } from "./ctaStrategy";
import { buildReferenceGuidance } from "./references";
import { deriveProjectBasics } from "./intake";
import { extractDesignDirectives } from "./designDirectives";
import type { ArtDirection, CreativeBrief, EditableText } from "@/lib/types";

async function setStatus(id: string, status: string, detail?: string) {
  await prisma.project.update({ where: { id }, data: { status, statusDetail: detail ?? null } });
}

// Thrown when the user requested a stop; caught at the top level to park the
// project as a "draft" (editable & regeneratable) rather than an error.
class PipelineStopped extends Error {
  constructor() {
    super("Pipeline stopped by user");
    this.name = "PipelineStopped";
  }
}

// Cancellation checkpoint: bail out of the pipeline if the user hit "Stop".
// Called between stages and before each render/score (where the time is spent).
async function assertNotStopped(projectId: string): Promise<void> {
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { stopRequested: true },
  });
  if (p?.stopRequested) throw new PipelineStopped();
}

function editableFromBrief(b: CreativeBrief): EditableText {
  return {
    headline: b.headline,
    subheadline: b.subheadline,
    supportingCopy: b.supportingCopy,
    offer: b.offer,
    cta: b.cta,
  };
}

export async function runPipeline(projectId: string): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { founderPhotos: true },
    });
    if (!project) return;

    const hasPhotos = project.founderPhotos.some((p) => p.cutoutPath);
    const mode: "founder" | "banner" = project.featureFounder && hasPhotos ? "founder" : "banner";
    const cutouts = project.founderPhotos.map((p) => p.cutoutPath!).filter(Boolean);
    // Original (un-processed) uploads — passed to the image-edit endpoint in founder mode
    // so gpt-image integrates the real person itself (background removal included).
    const originals = project.founderPhotos.map((p) => p.originalPath).filter(Boolean);

    // User-provided copy. Headlines are assigned to ads in order (AI fills any gap).
    // CTA variants are cycled across ads: each single CTA, plus the all-combined variant.
    const providedPrompts: string[] = project.providedPrompts ? JSON.parse(project.providedPrompts) : [];
    const providedHeadlines: string[] = project.providedHeadlines ? JSON.parse(project.providedHeadlines) : [];
    const providedSubheadlines: string[] = project.providedSubheadlines ? JSON.parse(project.providedSubheadlines) : [];
    const providedCtas: string[] = project.providedCtas ? JSON.parse(project.providedCtas) : [];
    // Only pair multiple CTAs on one ad when the LLM judges them distinct &
    // complementary; synonymous CTAs stay on separate ads (no redundant combo).
    const ctasCombinable = await assessCtaCombinable(providedCtas);
    const ctaVariants = buildCtaVariants(providedCtas, ctasCombinable);

    // Each creative = one prompt × one headline-pair, enumerated PROMPT-MAJOR (prompt 1
    // paired with every headline-pair first, then prompt 2, …). So prompt 1 can drive
    // several creatives (one per headline-pair), giving varied options. With no prompts
    // it's simply one creative per headline-pair, preserving the prior behavior. Headline
    // and subheadline stay paired by their own index (copyIdx). Slots beyond the full
    // combination set (when the count is raised) get AI-written copy under a cycled prompt.
    const copyCount = providedHeadlines.length; // >= 1 (headlines are required)
    const promptCount = providedPrompts.length; // may be 0
    const comboCount = promptCount > 0 ? promptCount * copyCount : copyCount;
    const comboAt = (i: number) =>
      promptCount > 0
        ? { promptIdx: Math.floor(i / copyCount), copyIdx: i % copyCount }
        : { promptIdx: -1, copyIdx: i };

    const headlineFor = (i: number): string | undefined =>
      i < comboCount ? providedHeadlines[comboAt(i).copyIdx] : undefined;
    const subheadlineFor = (i: number): string | undefined =>
      i < comboCount ? providedSubheadlines[comboAt(i).copyIdx] : undefined;
    const promptIdxFor = (i: number): number =>
      promptCount === 0 ? -1 : i < comboCount ? comboAt(i).promptIdx : i % promptCount;
    const promptFor = (i: number): string | undefined => {
      const pi = promptIdxFor(i);
      return pi >= 0 ? providedPrompts[pi] : undefined;
    };
    const ctasFor = (i: number): string[] | undefined =>
      ctaVariants.length ? ctaVariants[i % ctaVariants.length] : undefined;

    // [1] Research — extract expert intelligence from website (content focus, not colors/fonts)
    await assertNotStopped(projectId);
    await setStatus(projectId, "researching", project.websiteUrl ? "Reading website" : "Skipping (no URL)");
    const research = await researchWebsite(project.websiteUrl);

    // [1.5] Intake — the form is prompt-first, so derive the business basics
    // (name / niche / service / offer / audience) from the prompt + provided copy +
    // research, and persist them so the rest of the pipeline, the UI, references,
    // and Canva all read real values.
    await setStatus(projectId, "profiling", "Understanding the business");
    const basics = await deriveProjectBasics({
      prompt: project.prompt,
      audience: project.audience,
      headlines: providedHeadlines,
      subheadlines: providedSubheadlines,
      ctas: providedCtas,
      notes: project.notes,
      research,
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { name: basics.name, niche: basics.niche, service: basics.service, offer: basics.offer, audience: basics.audience },
    });

    // [1.6] Design directives — mine EXPLICIT design instructions (colors, element placement,
    // layout, typography) and any logo request. Two layers: NOTES apply to every creative
    // (global), while each PROMPT's directives apply only to the creatives it drives. Logo
    // defaults to OFF everywhere unless a prompt/notes explicitly asks for one.
    const globalDesign = await extractDesignDirectives({ prompt: "", notes: project.notes });
    const promptDesign = await Promise.all(
      providedPrompts.map((p) => extractDesignDirectives({ prompt: p, notes: "" }))
    );
    // Prompt-only directives for a creative (the global/notes layer is added separately by
    // briefs as a batch-wide block, so we don't duplicate it here).
    const promptDirectivesFor = (i: number): string => {
      const pi = promptIdxFor(i);
      return pi >= 0 ? promptDesign[pi]?.directives ?? "" : "";
    };
    // Full effective directives (notes + this creative's prompt) for the final render.
    const effectiveDirectivesFor = (i: number): string =>
      [globalDesign.directives, promptDirectivesFor(i)].filter(Boolean).join(" | ");
    const logoFor = (i: number): boolean => {
      if (globalDesign.logoRequested) return true;
      const pi = promptIdxFor(i);
      return pi >= 0 ? promptDesign[pi]?.logoRequested ?? false : false;
    };
    const allDirectives = [globalDesign.directives, ...promptDesign.map((d) => d.directives)]
      .filter(Boolean)
      .join("  ||  ");
    await prisma.project.update({
      where: { id: projectId },
      data: {
        designDirectives: allDirectives || null,
        logoRequested: globalDesign.logoRequested || promptDesign.some((d) => d.logoRequested),
      },
    });

    // [2] Business profile — WHO is this expert and WHY should anyone choose them.
    // Pass the raw prompt so the deep-intelligence stage mines the user's own words too.
    await setStatus(projectId, "profiling");
    const profile = await buildBusinessProfile({
      name: basics.name, niche: basics.niche, service: basics.service,
      audience: basics.audience, offer: basics.offer, notes: project.notes,
      prompt: project.prompt, igUrl: project.igUrl, fbUrl: project.fbUrl, research,
    });
    await prisma.project.update({ where: { id: projectId }, data: { rawResearch: research.text || null } });
    await prisma.businessProfile.upsert({
      where: { projectId }, create: { projectId, data: JSON.stringify(profile) },
      update: { data: JSON.stringify(profile) },
    });

    // [3] Market understanding — niche audience psychology + design patterns (typography, proportion, photography)
    await setStatus(projectId, "market");
    const market = await buildMarketProfile(basics.niche, basics.audience, profile);
    await prisma.marketProfile.upsert({
      where: { projectId }, create: { projectId, data: JSON.stringify(market) },
      update: { data: JSON.stringify(market) },
    });

    // [3.5] Visual Anchor — locked brand-specific image generation modifier for the whole batch
    await setStatus(projectId, "anchoring", "Locking visual identity");
    const anchor = await generateVisualAnchor(profile, market);
    await prisma.project.update({ where: { id: projectId }, data: { visualAnchor: anchor.modifier } });

    // [3.6] Reference swipe file — if the user dropped example creatives into
    // data/references/<niche|service>/, learn their structure & placement (only).
    // Empty/missing folder → "" and everything proceeds exactly as before.
    const referenceGuidance = await buildReferenceGuidance(basics.niche, basics.service);
    if (referenceGuidance) {
      await setStatus(projectId, "anchoring", "Studying reference creatives");
      await prisma.project.update({ where: { id: projectId }, data: { referenceDigest: referenceGuidance } });
    }

    // [4] Angles — generate pool (3× needed), select strongest with type diversity
    await assertNotStopped(projectId);
    await setStatus(projectId, "angles", "Generating angle pool");
    const pool = await generateAnglePool(project.creativeCount, profile, market);
    const selected = selectAngles(pool, project.creativeCount);

    await prisma.angle.deleteMany({ where: { projectId } });
    const selectedHooks = new Set(selected.map((a) => a.hook));
    const angleRows = await Promise.all(
      pool.map((a) =>
        prisma.angle.create({
          data: {
            projectId, type: a.type, hook: a.hook, rationale: a.rationale,
            selected: selectedHooks.has(a.hook), preScore: (a as { preScore?: number }).preScore ?? 0,
          },
        })
      )
    );
    const selectedRows = angleRows.filter((r) => r.selected).slice(0, project.creativeCount);

    // [5] Briefs — full creative brief + art direction per angle (with market intelligence context).
    // Feed any user-provided headlines/CTAs so the LLM writes coherent copy around them.
    await assertNotStopped(projectId);
    await setStatus(projectId, "briefs", `Writing ${selectedRows.length} briefs`);
    const copyOverrides = selectedRows.map((_, i) => ({
      headline: headlineFor(i),
      subheadline: subheadlineFor(i),
      ctas: ctasFor(i),
      requirement: promptFor(i),
      designDirectives: promptDirectivesFor(i) || undefined,
    }));
    const briefs = await generateBriefs(
      selectedRows.map((r) => ({ type: r.type as never, hook: r.hook, rationale: r.rationale })),
      mode, profile, market, copyOverrides, referenceGuidance, globalDesign.directives
    );

    // [6] Art direction — save briefs + creatives. Inject founderZone from market profile into art direction.
    await setStatus(projectId, "art");
    await prisma.creativeBrief.deleteMany({ where: { projectId } });
    await prisma.creative.deleteMany({ where: { projectId } });

    type Prepared = { creativeId: string; brief: CreativeBrief };
    const prepared: Prepared[] = [];

    for (let i = 0; i < briefs.length; i++) {
      const brief = briefs[i];
      const angleRow = selectedRows[i] ?? selectedRows[0];

      // Enforce user-provided copy verbatim (the LLM was asked to use it, but we guarantee it).
      const assignedHeadline = headlineFor(i);
      const assignedSubheadline = subheadlineFor(i);
      const assignedCtas = ctasFor(i);
      if (assignedHeadline) brief.headline = assignedHeadline;
      if (assignedSubheadline) brief.subheadline = assignedSubheadline;
      if (assignedCtas) brief.cta = assignedCtas.join("  +  ");

      // Inject founderZone from niche market research into the stored art direction.
      // This controls how much of the canvas the founder occupies in the generated ad.
      const artWithZone: ArtDirection = {
        ...brief.artDirection,
        founderZone: market.founderProportionZone,
      };

      const briefRow = await prisma.creativeBrief.create({
        data: {
          projectId, angleId: angleRow.id, layoutType: brief.layoutType,
          data: JSON.stringify(brief),
        },
      });
      const creative = await prisma.creative.create({
        data: {
          projectId, briefId: briefRow.id, index: i + 1, mode, layoutType: brief.layoutType,
          founderCutoutPath: mode === "founder" ? cutouts[i % cutouts.length] : null,
          editableText: JSON.stringify(editableFromBrief(brief)),
          artDirection: JSON.stringify(artWithZone),
        },
      });
      prepared.push({ creativeId: creative.id, brief });
    }

    // [7] Rendering — the image model generates the COMPLETE ad (imagery + all text) as one
    // finished 1080×1080 PNG. The copy from the briefs pipeline is passed directly in the prompt.
    // Founder mode: the real uploaded photo is passed to the edit endpoint so gpt-image integrates
    // the actual person (it removes/replaces the original background itself). Banner mode: text-to-image.
    const visualAnchorText = anchor.modifier;
    for (let i = 0; i < prepared.length; i++) {
      await assertNotStopped(projectId); // honor a stop between (slow) renders
      const { creativeId, brief } = prepared[i];
      await setStatus(projectId, "rendering", `Rendering ${i + 1}/${prepared.length}`);

      try {
        const prompt = buildFullAdPrompt(brief, visualAnchorText, market.founderProportionZone, mode, ctasFor(i), referenceGuidance, effectiveDirectivesFor(i), logoFor(i), basics.name);

        let png: Buffer;
        if (mode === "founder" && originals.length > 0) {
          const refPath = originals[i % originals.length];
          const bytes = await readFile(refPath);
          const mime = refPath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
          png = await editImage(prompt, [{ bytes, mime }]);
        } else {
          png = await generateImage(prompt);
        }

        const finalPath = await saveFile(`projects/${projectId}/final/${creativeId}.png`, png);
        await prisma.creative.update({
          where: { id: creativeId },
          data: { finalPngPath: finalPath, imagePrompt: prompt },
        });
      } catch (err) {
        console.error("[pipeline] render failed:", err);
      }
    }

    // [8] Vision scoring
    for (let i = 0; i < prepared.length; i++) {
      await assertNotStopped(projectId);
      const { creativeId } = prepared[i];
      await setStatus(projectId, "scoring", `Scoring ${i + 1}/${prepared.length}`);
      const c = await prisma.creative.findUnique({ where: { id: creativeId } });
      if (!c?.finalPngPath) continue;
      try {
        const buf = await readFile(c.finalPngPath);
        const { score, overall } = await scoreCreative(buf.toString("base64"));
        await prisma.creative.update({
          where: { id: creativeId },
          data: { score: JSON.stringify(score), overallScore: overall },
        });
      } catch (err) {
        console.error("[pipeline] scoring failed:", err);
      }
    }

    await setStatus(projectId, "done");
  } catch (err) {
    // A user-requested stop parks the project as an editable draft, not an error.
    if (err instanceof PipelineStopped) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "draft", statusDetail: "Stopped — saved to drafts", error: null, stopRequested: false },
      });
      return;
    }
    console.error("[pipeline] failed:", err);
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "error", error: err instanceof Error ? err.message : String(err) },
    });
  }
}
