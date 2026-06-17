import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Request a stop of an in-progress generation. The running pipeline checks
// `stopRequested` at its checkpoints and parks the project as a "draft".
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Already finished/stopped — nothing to stop.
  if (["done", "error", "draft", "idle"].includes(project.status)) {
    return NextResponse.json({ ok: true, status: project.status });
  }

  await prisma.project.update({
    where: { id },
    data: { stopRequested: true, statusDetail: "Stopping…" },
  });
  return NextResponse.json({ ok: true });
}
