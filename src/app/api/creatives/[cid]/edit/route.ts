import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile, saveFile } from "@/lib/storage";
import { editImage } from "@/lib/openai/client";
import { buildEditPrompt } from "@/lib/pipeline/imagePrompt";
import { scoreCreative } from "@/lib/pipeline/score";
import { ensureOriginalVersion, versionsPayload } from "@/lib/versions";

export const runtime = "nodejs";
export const maxDuration = 300;

// Tier-1 edit: apply a single prompt-based change to a finished creative, saved
// as a new version (the original is preserved & revertible). Re-feeds the current
// PNG to the image edit endpoint — no mask — then re-scores the result.
export async function POST(req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;

  let instruction = "";
  try {
    instruction = ((await req.json())?.instruction ?? "").toString().trim();
  } catch {
    /* fall through to validation */
  }
  if (!instruction) {
    return NextResponse.json({ error: "Describe the change you want." }, { status: 400 });
  }

  const creative = await prisma.creative.findUnique({ where: { id: cid } });
  if (!creative) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!creative.finalPngPath) {
    return NextResponse.json({ error: "No image to edit yet" }, { status: 400 });
  }

  // Make sure the original is recorded as version 1 before we add the edit.
  await ensureOriginalVersion(cid);

  try {
    const bytes = await readFile(creative.finalPngPath);
    const png = await editImage(buildEditPrompt(instruction), [{ bytes, mime: "image/png" }]);

    const last = await prisma.creativeVersion.findFirst({
      where: { creativeId: cid },
      orderBy: { index: "desc" },
    });
    const nextIndex = (last?.index ?? 1) + 1;
    const newPath = await saveFile(`projects/${creative.projectId}/final/${cid}-v${nextIndex}.png`, png);

    // Re-score the edited image (best effort — keep the prior score on failure).
    let scoreJson: string | null = null;
    let overall: number | null = null;
    let scored = false;
    try {
      const { score, overall: o } = await scoreCreative(png.toString("base64"));
      scoreJson = JSON.stringify(score);
      overall = o;
      scored = true;
    } catch (e) {
      console.error("[edit] scoring failed:", e);
    }

    await prisma.creativeVersion.create({
      data: { creativeId: cid, index: nextIndex, pngPath: newPath, instruction, score: scoreJson, overallScore: overall },
    });
    await prisma.creative.update({
      where: { id: cid },
      data: scored
        ? { finalPngPath: newPath, score: scoreJson, overallScore: overall }
        : { finalPngPath: newPath },
    });

    return NextResponse.json(await versionsPayload(cid));
  } catch (err) {
    console.error("[edit] failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
