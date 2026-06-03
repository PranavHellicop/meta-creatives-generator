import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { LAYOUT_REGISTRY } from "@/components/layouts";
import { CANVAS } from "@/components/layouts/shared";
import type { ArtDirection, EditableText, LayoutType, CreativeRenderProps } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creative = await prisma.creative.findUnique({
    where: { id },
    include: { brief: true, project: true },
  });
  if (!creative) notFound();

  const text = JSON.parse(creative.editableText) as EditableText;
  const art = JSON.parse(creative.artDirection) as ArtDirection;
  const brief = creative.brief ? (JSON.parse(creative.brief.data) as { trustElements: string[]; socialProofElements: string[] }) : { trustElements: [], socialProofElements: [] };

  const layoutType = creative.layoutType as LayoutType;
  const Layout = LAYOUT_REGISTRY[layoutType] ?? LAYOUT_REGISTRY.OfferCard;

  const props: CreativeRenderProps = {
    layoutType,
    mode: creative.mode as "founder" | "banner",
    text,
    art,
    founderCutoutUrl: creative.founderCutoutPath ? fileUrl(creative.founderCutoutPath) : undefined,
    bgImageUrl: creative.bgImagePath ? fileUrl(creative.bgImagePath) : undefined,
    trustElements: brief.trustElements ?? [],
    socialProofElements: brief.socialProofElements ?? [],
    brandName: creative.project.name,
  };

  return (
    <div
      id="creative-canvas"
      style={{
        width: CANVAS,
        height: CANVAS,
        position: "relative",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <Layout {...props} />
    </div>
  );
}
