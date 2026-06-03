import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { CreativeEditor } from "./CreativeEditor";
import { fileUrl } from "@/lib/storage";
import type { EditableText, Score } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CreativeDetailPage({
  params,
}: {
  params: Promise<{ id: string; cid: string }>;
}) {
  const { id, cid } = await params;
  const creative = await prisma.creative.findUnique({
    where: { id: cid },
    include: { brief: { include: { angle: true } } },
  });
  if (!creative || creative.projectId !== id) notFound();

  const text = JSON.parse(creative.editableText) as EditableText;
  const score = creative.score ? (JSON.parse(creative.score) as Score) : null;

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link href={`/projects/${id}`} className="text-sm text-muted hover:text-foreground">
          ← Back to project
        </Link>
        <CreativeEditor
          cid={cid}
          initialText={text}
          initialPngUrl={creative.finalPngPath ? fileUrl(creative.finalPngPath) : null}
          meta={{
            index: creative.index,
            angle: creative.brief?.angle?.type ?? null,
            layoutType: creative.layoutType,
            mode: creative.mode,
            overallScore: creative.overallScore,
          }}
          score={score}
        />
      </main>
    </>
  );
}
