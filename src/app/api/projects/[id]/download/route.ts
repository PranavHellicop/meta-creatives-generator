import { prisma } from "@/lib/db";
import { readFile } from "@/lib/storage";
import { buildZip, type ZipEntry } from "@/lib/zip";

export const dynamic = "force-dynamic";

// Bundle every rendered creative in a project into a single ZIP download.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { creatives: { orderBy: { index: "asc" } } },
  });
  if (!project) return new Response("Not found", { status: 404 });

  const rendered = project.creatives.filter((c) => c.finalPngPath);
  if (rendered.length === 0) {
    return new Response("No creatives ready", { status: 404 });
  }

  const entries: ZipEntry[] = [];
  for (const c of rendered) {
    try {
      const data = await readFile(c.finalPngPath!);
      entries.push({ name: `creative-${String(c.index).padStart(2, "0")}.png`, data });
    } catch {
      // Skip any file that has gone missing on disk rather than failing the whole zip.
    }
  }
  if (entries.length === 0) return new Response("No creatives ready", { status: 404 });

  const slug = (project.name || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "project";
  const zip = buildZip(entries);

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}-creatives.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
