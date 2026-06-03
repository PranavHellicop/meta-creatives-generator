import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { ProjectView } from "./ProjectView";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <ProjectView projectId={id} initialName={project.name} initialNiche={project.niche} />
      </main>
    </>
  );
}
