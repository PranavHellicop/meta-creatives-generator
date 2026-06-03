import Link from "next/link";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  idle: "Draft",
  done: "Complete",
  error: "Error",
};

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="rounded-xl border border-border bg-surface p-5 hover:border-accent/60 transition group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-muted">{p.niche}</span>
                  <span className="text-xs rounded-full bg-surface-2 px-2 py-0.5 text-muted">
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
                <h2 className="font-semibold group-hover:text-accent transition">{p.name}</h2>
                <p className="text-sm text-muted mt-1 line-clamp-2">{p.service}</p>
                <p className="text-xs text-muted mt-3">
                  {p._count.creatives} creative{p._count.creatives === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
