"use client";

import { useState } from "react";
import { ProjectCard } from "./ProjectCard";
import { Pagination } from "./Pagination";

const PAGE_SIZE = 9; // 3×3 grid keeps the page tidy and scroll short

type ProjectItem = {
  id: string;
  name: string;
  niche: string;
  service: string;
  status: string;
  creativeCount: number;
};

export function ProjectGrid({ projects }: { projects: ProjectItem[] }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));
  // Clamp so deleting the last item on a page doesn't strand us on an empty page.
  const current = Math.min(page, totalPages);
  const start = (current - 1) * PAGE_SIZE;
  const shown = projects.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <ProjectCard
            key={p.id}
            id={p.id}
            name={p.name}
            niche={p.niche}
            service={p.service}
            status={p.status}
            creativeCount={p.creativeCount}
          />
        ))}
      </div>
      <Pagination
        page={current}
        totalPages={totalPages}
        onChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </>
  );
}
