import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { AppHeader } from "@/components/AppHeader";
import { ProjectForm } from "@/components/ProjectForm";

export const dynamic = "force-dynamic";

function lines(json: string | null): string {
  if (!json) return "";
  try {
    return (JSON.parse(json) as string[]).join("\n");
  } catch {
    return "";
  }
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { founderPhotos: true },
  });
  if (!project) notFound();

  return (
    <>
      <AppHeader />
      <ProjectForm
        mode="edit"
        projectId={id}
        initial={{
          headlines: lines(project.providedHeadlines),
          subheadlines: lines(project.providedSubheadlines),
          prompts: lines(project.providedPrompts),
          ctas: lines(project.providedCtas),
          audience: project.audience,
          websiteUrl: project.websiteUrl ?? "",
          notes: project.notes ?? "",
          featureFounder: project.featureFounder,
          creativeCount: project.creativeCount,
        }}
        existingPhotos={project.founderPhotos.map((p) => ({ id: p.id, url: fileUrl(p.originalPath) }))}
      />
    </>
  );
}
