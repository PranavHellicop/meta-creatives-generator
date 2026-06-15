import { prisma } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import type { Score } from "@/lib/types";

// Shape returned to the client after any edit/revert (and used to seed the page).
export type VersionItem = {
  id: string;
  index: number;
  instruction: string | null;
  pngUrl: string;
  overallScore: number | null;
  isActive: boolean;
};
export type VersionsPayload = {
  activePngUrl: string | null;
  overallScore: number | null;
  score: Score | null;
  versions: VersionItem[];
};

// Record the current render as version 1 the first time a creative is edited, so
// the original is always revertible. No-op if versions already exist or there's
// no image yet. The original PNG path is never overwritten (edits write new files).
export async function ensureOriginalVersion(creativeId: string): Promise<void> {
  const creative = await prisma.creative.findUnique({
    where: { id: creativeId },
    include: { versions: { select: { id: true } } },
  });
  if (!creative || !creative.finalPngPath || creative.versions.length > 0) return;
  await prisma.creativeVersion.create({
    data: {
      creativeId,
      index: 1,
      pngPath: creative.finalPngPath,
      instruction: null,
      score: creative.score,
      overallScore: creative.overallScore,
    },
  });
}

// The full version list + which one is active (matches Creative.finalPngPath).
export async function versionsPayload(creativeId: string): Promise<VersionsPayload | null> {
  const creative = await prisma.creative.findUnique({
    where: { id: creativeId },
    include: { versions: { orderBy: { index: "asc" } } },
  });
  if (!creative) return null;
  return {
    activePngUrl: creative.finalPngPath ? fileUrl(creative.finalPngPath) : null,
    overallScore: creative.overallScore,
    score: creative.score ? (JSON.parse(creative.score) as Score) : null,
    versions: creative.versions.map((v) => ({
      id: v.id,
      index: v.index,
      instruction: v.instruction,
      pngUrl: fileUrl(v.pngPath),
      overallScore: v.overallScore,
      isActive: v.pngPath === creative.finalPngPath,
    })),
  };
}
