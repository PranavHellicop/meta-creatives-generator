import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runPipeline } from "@/lib/pipeline/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 800;

// Kick off the full strategy→render→score pipeline. Runs in the background;
// the client polls /api/projects/[id]/status for progress.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Clear any stale stop flag / prior error so a (re)generate starts from a clean slate.
  await prisma.project.update({
    where: { id },
    data: { stopRequested: false, status: "idle", statusDetail: null, error: null },
  });

  // Fire-and-forget: do not await — the long pipeline updates status in the DB.
  void runPipeline(id);

  return NextResponse.json({ ok: true, started: true });
}
