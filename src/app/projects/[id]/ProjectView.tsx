"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STAGES = [
  { key: "researching", label: "Researching the business" },
  { key: "profiling", label: "Building expert intelligence profile" },
  { key: "market", label: "Analysing niche market & design patterns" },
  { key: "anchoring", label: "Locking visual identity" },
  { key: "angles", label: "Generating creative angles" },
  { key: "briefs", label: "Writing creative briefs" },
  { key: "art", label: "Art directing" },
  { key: "rendering", label: "Rendering creatives" },
  { key: "scoring", label: "Scoring quality" },
];
const ORDER = STAGES.map((s) => s.key).concat("done");

type Creative = {
  id: string;
  index: number;
  layoutType: string;
  mode: string;
  angleType: string | null;
  finalUrl: string | null;
  text: { headline: string; subheadline: string; offer: string; cta: string };
  overallScore: number | null;
};

type Status = {
  status: string;
  statusDetail: string | null;
  error: string | null;
  creatives: Creative[];
};

export function ProjectView({
  projectId,
  initialName,
  initialNiche,
}: {
  projectId: string;
  initialName: string;
  initialNiche: string;
}) {
  const [data, setData] = useState<Status | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/projects/${projectId}/status`, { cache: "no-store" });
        const json: Status = await res.json();
        if (!active) return;
        setData(json);
        if (json.status !== "done" && json.status !== "error") {
          timer = setTimeout(poll, 2000);
        }
      } catch {
        if (active) timer = setTimeout(poll, 3000);
      }
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [projectId]);

  const status = data?.status ?? "idle";
  const done = status === "done";
  const errored = status === "error";
  const currentIdx = ORDER.indexOf(status);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs uppercase tracking-wide text-muted">{initialNiche}</span>
          <h1 className="text-2xl font-semibold">{initialName}</h1>
        </div>
        {done && (
          <span className="text-sm rounded-full bg-green-500/15 text-green-400 px-3 py-1">
            {data?.creatives.length} creatives ready
          </span>
        )}
      </div>

      {errored && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 mb-6">
          <p className="font-medium text-red-400 mb-1">Generation failed</p>
          <p className="text-sm text-muted">{data?.error}</p>
        </div>
      )}

      {!done && !errored && (
        <div className="rounded-xl border border-border bg-surface p-6 mb-8">
          <ol className="space-y-3">
            {STAGES.map((s, i) => {
              const stageIdx = ORDER.indexOf(s.key);
              const state =
                currentIdx > stageIdx ? "done" : currentIdx === stageIdx ? "active" : "pending";
              return (
                <li key={s.key} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      state === "done"
                        ? "bg-green-500 text-white"
                        : state === "active"
                        ? "bg-accent text-white animate-pulse"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span className={state === "pending" ? "text-muted" : ""}>{s.label}</span>
                  {state === "active" && data?.statusDetail && (
                    <span className="text-muted text-xs">· {data.statusDetail}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {data && data.creatives.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.creatives.map((c) => (
            <Link
              key={c.id}
              href={`/projects/${projectId}/creatives/${c.id}`}
              className="rounded-xl border border-border bg-surface overflow-hidden hover:border-accent/60 transition group"
            >
              <div className="aspect-square bg-surface-2">
                {c.finalUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.finalUrl} alt={c.text.headline} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted text-xs animate-pulse">
                    rendering…
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    #{c.index} · {c.angleType ?? c.mode}
                  </span>
                  {c.overallScore != null && (
                    <span className="text-xs font-semibold text-accent">{c.overallScore.toFixed(1)}</span>
                  )}
                </div>
                <p className="font-medium text-sm line-clamp-1">{c.text.headline}</p>
                <p className="text-xs text-muted line-clamp-1">{c.text.offer}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
