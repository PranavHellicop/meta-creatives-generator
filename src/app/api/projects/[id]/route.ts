import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { prisma } from "@/lib/db";
import { resolveDataPath, saveFile } from "@/lib/storage";
import { removeFounderBackground } from "@/lib/founder";
import { parseLines } from "@/lib/copyInput";

export const runtime = "nodejs";

const MAX_CREATIVES = 30;

function str(form: FormData, key: string): string {
  return (form.get(key) as string | null)?.trim() ?? "";
}

// Edit a draft's inputs (and founder photos) and reset it so it can be regenerated.
// Mirrors POST /api/projects but updates an existing row instead of creating one.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();

  const audience = str(form, "audience");
  const providedPrompts = parseLines(str(form, "prompts"));
  const combinedPrompt = providedPrompts.join("\n\n");
  const providedHeadlines = parseLines(str(form, "headlines"));
  const providedSubheadlines = parseLines(str(form, "subheadlines"));
  const providedCtas = parseLines(str(form, "ctas"));

  if (providedHeadlines.length === 0) {
    return NextResponse.json({ error: "Add at least one headline (one per line)." }, { status: 400 });
  }

  const featureFounder = str(form, "featureFounder") === "true";
  const comboCount = providedPrompts.length > 0
    ? providedPrompts.length * providedHeadlines.length
    : providedHeadlines.length;
  const requested = parseInt(str(form, "creativeCount") || String(comboCount), 10);
  const creativeCount = Math.min(
    MAX_CREATIVES,
    Math.max(providedHeadlines.length, Number.isFinite(requested) ? requested : comboCount)
  );

  // Remove any founder photos the user deleted in the edit form (DB rows + files).
  const removeIds: string[] = (() => {
    try { return JSON.parse(str(form, "removePhotoIds") || "[]"); } catch { return []; }
  })();
  if (removeIds.length) {
    const toRemove = await prisma.founderPhoto.findMany({ where: { id: { in: removeIds }, projectId: id } });
    for (const p of toRemove) {
      for (const rel of [p.originalPath, p.cutoutPath].filter(Boolean) as string[]) {
        try { await fs.rm(resolveDataPath(rel), { force: true }); } catch { /* already gone */ }
      }
    }
    await prisma.founderPhoto.deleteMany({ where: { id: { in: removeIds }, projectId: id } });
  }

  await prisma.project.update({
    where: { id },
    data: {
      name: providedHeadlines[0], // provisional; intake overwrites it on regenerate
      audience,
      prompt: combinedPrompt || null,
      websiteUrl: str(form, "websiteUrl") || null,
      notes: str(form, "notes") || null,
      featureFounder,
      creativeCount,
      providedPrompts: providedPrompts.length ? JSON.stringify(providedPrompts) : null,
      providedHeadlines: JSON.stringify(providedHeadlines),
      providedSubheadlines: providedSubheadlines.length ? JSON.stringify(providedSubheadlines) : null,
      providedCtas: providedCtas.length ? JSON.stringify(providedCtas) : null,
      // Clean slate for the next run.
      status: "idle",
      statusDetail: null,
      error: null,
      stopRequested: false,
    },
  });

  // Add any newly-uploaded founder photos (background-removed cutout) in founder mode.
  if (featureFounder) {
    const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    const offset = await prisma.founderPhoto.count({ where: { projectId: id } });
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const originalPath = await saveFile(`projects/${id}/founder/original-${offset + i}.${ext}`, buf);
      const mime = file.type || (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");
      const { png } = await removeFounderBackground(buf, mime);
      const cutoutPath = await saveFile(`projects/${id}/founder/cutout-${offset + i}.png`, png);
      await prisma.founderPhoto.create({ data: { projectId: id, originalPath, cutoutPath } });
    }
  }

  return NextResponse.json({ id });
}

// Delete a project: its DB row (founder photos, profiles, angles, briefs and
// creatives cascade) plus all generated files under data/projects/<id>.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.delete({ where: { id } });

  // Best-effort removal of the project's files; ignore if the folder is absent.
  try {
    await fs.rm(resolveDataPath(`projects/${id}`), { recursive: true, force: true });
  } catch (err) {
    console.error("[projects] failed to remove data dir:", err);
  }

  return NextResponse.json({ ok: true });
}
