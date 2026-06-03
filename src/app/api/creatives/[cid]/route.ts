import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EditableTextSchema } from "@/lib/types";

export const runtime = "nodejs";

// Update the editable text layer (headline/sub/copy/offer/cta). No image-API call.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params;
  const body = await req.json();
  const parsed = EditableTextSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid text fields" }, { status: 400 });
  }
  await prisma.creative.update({
    where: { id: cid },
    data: { editableText: JSON.stringify(parsed.data) },
  });
  return NextResponse.json({ ok: true });
}
