import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveFile } from "@/lib/storage";
import { removeFounderBackground } from "@/lib/founder";
import { parseHeadlineMarkdown, parseCtaList } from "@/lib/copyInput";

export const runtime = "nodejs";

function str(form: FormData, key: string): string {
  return (form.get(key) as string | null)?.trim() ?? "";
}

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const name = str(form, "name");
  const niche = str(form, "niche");
  const service = str(form, "service");
  const audience = str(form, "audience");
  const offer = str(form, "offer");

  if (!name || !niche || !service || !audience || !offer) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const featureFounder = str(form, "featureFounder") === "true";
  const creativeCount = Math.min(15, Math.max(1, parseInt(str(form, "creativeCount") || "10", 10)));

  // User-provided copy: CTA text field (comma-separated) + optional headline .md file.
  const ctas = parseCtaList(str(form, "ctas"));
  const headlineFile = form.get("headlineFile");
  const providedHeadlines =
    headlineFile instanceof File && headlineFile.size > 0
      ? parseHeadlineMarkdown(await headlineFile.text())
      : [];

  const project = await prisma.project.create({
    data: {
      name,
      niche,
      service,
      audience,
      offer,
      websiteUrl: str(form, "websiteUrl") || null,
      notes: str(form, "notes") || null,
      featureFounder,
      creativeCount,
      providedHeadlines: providedHeadlines.length ? JSON.stringify(providedHeadlines) : null,
      providedCtas: ctas.length ? JSON.stringify(ctas) : null,
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
