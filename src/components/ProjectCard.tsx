"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  idle: "Draft",
  done: "Complete",
  error: "Error",
};

export function ProjectCard({
  id,
  name,
  niche,
  service,
  status,
  creativeCount,
}: {
  id: string;
  name: string;
  niche: string;
  service: string;
  status: string;
  creativeCount: number;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault(); // don't navigate into the project
    e.stopPropagation();
    if (!confirm(`Delete "${name}"? This permanently removes the project and its creatives.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else setDeleting(false);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="relative h-full">
      <Link
        href={`/projects/${id}`}
        className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 hover:border-accent/60 transition group"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs uppercase tracking-wide text-muted line-clamp-2">{niche}</span>
          <span className="shrink-0 text-xs rounded-full bg-surface-2 px-2 py-0.5 text-muted">
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>
        <h2 className="font-semibold group-hover:text-accent transition pr-6 line-clamp-1">{name}</h2>
        <p className="text-sm text-muted mt-1 line-clamp-2">{service}</p>
        <p className="text-xs text-muted mt-auto pt-3">
          {creativeCount} creative{creativeCount === 1 ? "" : "s"}
        </p>
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete project"
        aria-label="Delete project"
        className="absolute bottom-3.5 right-3.5 rounded-md p-1.5 text-red-500 hover:bg-red-500/10 disabled:opacity-40 transition"
      >
        <TrashIcon className={deleting ? "animate-pulse" : ""} />
      </button>
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}
