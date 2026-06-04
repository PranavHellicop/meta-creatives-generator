import Link from "next/link";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { ProjectCard } from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { creatives: true } } },
  });

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold mb-1">Projects</h1>
        <p className="text-muted mb-8 text-sm">
          A strategy-first engine: research → audience → angles → copy → art direction → creatives.
        </p>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <p className="text-muted mb-4">No projects yet.</p>
            <Link
              href="/projects/new"
              className="inline-block rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:opacity-90"
            >
              Start your first project
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                id={p.id}
                name={p.name}
                niche={p.niche}
                service={p.service}
                status={p.status}
                creativeCount={p._count.creatives}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
