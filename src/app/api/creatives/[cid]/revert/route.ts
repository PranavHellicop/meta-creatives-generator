import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureOriginalVersion, versionsPayload } from "@/lib/versions";

export const runtime = "nodejs";

// Point a creative back at an earlier version: restores that version's PNG and its
// cached score. Non-destructive — every version's file stays on disk.
export async function POST(req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;

  let versionId = "";
  try {
    versionId = ((await req.json())?.versionId ?? "").toString();
  } catch {
    /* fall through */
  }
  if (!versionId) return NextResponse.json({ error: "Missing versionId" }, { status: 400 });

  const creative = await prisma.creative.findUnique({ where: { id: cid } });
  if (!creative) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ensureOriginalVersion(cid);

  const version = await prisma.creativeVersion.findUnique({ where: { id: versionId } });
  if (!version || version.creativeId !== cid) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  await prisma.creative.update({
    where: { id: cid },
    data: { finalPngPath: version.pngPath, score: version.score, overallScore: version.overallScore },
  });

  return NextResponse.json(await versionsPayload(cid));
}
