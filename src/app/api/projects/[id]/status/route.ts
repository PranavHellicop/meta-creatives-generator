import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import type { EditableText } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      creatives: {
        orderBy: { index: "asc" },
        include: { brief: { include: { angle: true } } },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    status: project.status,
    statusDetail: project.statusDetail,
    error: project.error,
    // name/niche are derived by the intake step mid-run, so surface them for the live header.
    name: project.name,
    niche: project.niche,
    creatives: project.creatives.map((c) => {
      const text = JSON.parse(c.editableText) as EditableText;
      return {
        id: c.id,
        index: c.index,
        layoutType: c.layoutType,
        mode: c.mode,
        angleType: c.brief?.angle?.type ?? null,
        finalUrl: c.finalPngPath ? fileUrl(c.finalPngPath) : null,
        text: {
          headline: text.headline,
          subheadline: text.subheadline,
          offer: text.offer,
          cta: text.cta,
        },
        overallScore: c.overallScore,
      };
    }),
  });
}
