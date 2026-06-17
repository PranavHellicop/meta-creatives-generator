import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveFile } from "@/lib/storage";
import { removeFounderBackground } from "@/lib/founder";
import { parseLines } from "@/lib/copyInput";

export const runtime = "nodejs";

const MAX_CREATIVES = 30;

function str(form: FormData, key: string): string {
  return (form.get(key) as string | null)?.trim() ?? "";
}

export async function POST(req: NextRequest) {
  const form = await req.formData();

  // Prompt-first intake: headlines are the mandatory core input. Headlines,
  // subheadlines and CTAs are all one-per-line. name/niche/service/offer are no
  // longer entered — they're derived by the pipeline's intake step.
  const audience = str(form, "audience");
  // Prompts are one-per-line; each is a per-creative brief. They're also combined into a
  // single `prompt` string so the global stages (intake, business profile) see full context.
  const providedPrompts = parseLines(str(form, "prompts"));
  const combinedPrompt = providedPrompts.join("\n\n");
  const providedHeadlines = parseLines(str(form, "headlines"));
  const providedSubheadlines = parseLines(str(form, "subheadlines"));
  const providedCtas = parseLines(str(form, "ctas"));

  if (providedHeadlines.length === 0) {
    return NextResponse.json({ error: "Add at least one headline (one per line)." }, { status: 400 });
  }

  const featureFounder = str(form, "featureFounder") === "true";
  // Each creative = one prompt × one headline-pair (prompt-major). With no prompts it's one
  // per headline. Count defaults to that full combination set and can be raised (extra slots
  // get AI-written copy) but never below the headline count.
  const comboCount = providedPrompts.length > 0
    ? providedPrompts.length * providedHeadlines.length
    : providedHeadlines.length;
  const requested = parseInt(str(form, "creativeCount") || String(comboCount), 10);
  const creativeCount = Math.min(
    MAX_CREATIVES,
    Math.max(providedHeadlines.length, Number.isFinite(requested) ? requested : comboCount)
  );

  const project = await prisma.project.create({
    data: {
      // Provisional placeholders — the intake step overwrites name/niche/service/offer.
      name: providedHeadlines[0],
      niche: "",
      service: "",
      offer: "",
      audience, // may be "" — intake infers it
      prompt: combinedPrompt || null,
      websiteUrl: str(form, "websiteUrl") || null,
      notes: str(form, "notes") || null,
      featureFounder,
      creativeCount,
      providedPrompts: providedPrompts.length ? JSON.stringify(providedPrompts) : null,
      providedHeadlines: JSON.stringify(providedHeadlines),
      providedSubheadlines: providedSubheadlines.length ? JSON.stringify(providedSubheadlines) : null,
      providedCtas: providedCtas.length ? JSON.stringify(providedCtas) : null,
    },
  });

  // Save founder photos + background-removed cutouts (founder mode only).
  if (featureFounder) {
    const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const originalPath = await saveFile(`projects/${project.id}/founder/original-${i}.${ext}`, buf);

      const mime = file.type || (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");
      const { png } = await removeFounderBackground(buf, mime);
      const cutoutPath = await saveFile(`projects/${project.id}/founder/cutout-${i}.png`, png);

      await prisma.founderPhoto.create({
        data: { projectId: project.id, originalPath, cutoutPath },
      });
    }
  }

  return NextResponse.json({ id: project.id });
}
