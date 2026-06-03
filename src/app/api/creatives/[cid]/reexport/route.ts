import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderCreativePng, closeBrowser } from "@/lib/export";
import { saveFile, fileUrl } from "@/lib/storage";

export const runtime = "nodejs";

// Re-render the creative to PNG (text layer only — NO image-API call).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params;
  const creative = await prisma.creative.findUnique({ where: { id: cid } });
  if (!creative) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const png = await renderCreativePng(cid);
    const path = await saveFile(`projects/${creative.projectId}/final/${cid}.png`, png);
    await prisma.creative.update({ where: { id: cid }, data: { finalPngPath: path } });
    return NextResponse.json({ ok: true, url: `${fileUrl(path)}?t=${Date.now()}` });
  } finally {
    await closeBrowser();
  }
}
