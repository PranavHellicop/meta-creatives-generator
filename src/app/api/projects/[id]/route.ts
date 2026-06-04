import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { prisma } from "@/lib/db";
import { resolveDataPath } from "@/lib/storage";

export const runtime = "nodejs";

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
