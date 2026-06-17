"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/Pagination";
import { notificationsEnabled, showNotification, playPing } from "@/lib/notify";

const TERMINAL = ["done", "error", "draft", "idle"];

const CREATIVES_PER_PAGE = 12; // pagination only kicks in past a full batch

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
  name: string;
  niche: string;
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
  const [deleting, setDeleting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const prevStatusRef = useRef<string | null>(null); // last polled status (for completion detection)
  const notifiedRef = useRef(false); // fire the finish notification at most once

  async function handleDelete() {
    if (!confirm(`Delete "${initialName}"? This permanently removes the project and its creatives.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) router.push("/");
      else setDeleting(false);
    } catch {
      setDeleting(false);
    }
  }

  async function handleStop() {
    setStopping(true);
    try {
      await fetch(`/api/projects/${projectId}/stop`, { method: "POST" });
      // The pipeline parks the project as a draft at its next checkpoint; polling picks it up.
    } catch {
      setStopping(false);
    }
  }

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/projects/${projectId}/status`, { cache: "no-store" });
        const json: Status = await res.json();
        if (!active) return;

        // Fire a browser notification + ping when the run FINISHES (transition from an
        // in-progress status to done/error). Not on a user-initiated stop (draft), and
        // not when landing on an already-finished project (prev was null/terminal).
        const prev = prevStatusRef.current;
        const justFinished =
          prev !== null && !TERMINAL.includes(prev) && (json.status === "done" || json.status === "error");
        if (justFinished && !notifiedRef.current && notificationsEnabled()) {
          notifiedRef.current = true;
          if (json.status === "done") {
            showNotification(
              "Creatives ready ✅",
              `${json.name || "Your project"} — ${json.creatives.length} creative${json.creatives.length === 1 ? "" : "s"} generated.`
            );
          } else {
            showNotification("Generation failed", `${json.name || "Your project"} — something went wrong.`);
          }
          playPing();
        }
        prevStatusRef.current = json.status;

        setData(json);
        if (json.status !== "done" && json.status !== "error" && json.status !== "draft") {
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
  const isDraft = status === "draft";
  const inProgress = !["done", "error", "draft", "idle"].includes(status);
  const currentIdx = ORDER.indexOf(status);
  const readyCount = data?.creatives.filter((c) => c.finalUrl).length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          {(data?.niche || initialNiche) && (
            <span className="text-xs uppercase tracking-wide text-muted">{data?.niche || initialNiche}</span>
          )}
          <h1 className="text-2xl font-semibold">{data?.name || initialName}</h1>
        </div>
        <div className="flex items-center gap-3">
          {done && (
            <span className="text-sm rounded-full bg-green-500/15 text-green-400 px-3 py-1">
              {data?.creatives.length} creatives ready
            </span>
          )}
          {isDraft && (
            <span className="text-sm rounded-full bg-amber-500/15 text-amber-400 px-3 py-1">Draft</span>
          )}
          {readyCount > 0 && (
            <a
              href={`/api/projects/${projectId}/download`}
              className="text-sm rounded-lg border border-border px-3 py-1.5 text-foreground hover:border-accent/60 hover:text-accent transition"
            >
              Download all
            </a>
          )}
          {inProgress && (
            <button
              onClick={handleStop}
              disabled={stopping}
              className="text-sm rounded-lg border border-border px-3 py-1.5 text-muted hover:border-amber-500/60 hover:text-amber-400 disabled:opacity-40 transition"
            >
              {stopping ? "Stopping…" : "Stop"}
            </button>
          )}
          {isDraft && (
            <Link
              href={`/projects/${projectId}/edit`}
              className="text-sm rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:opacity-90 transition"
            >
              Edit & regenerate
            </Link>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm rounded-lg border border-border px-3 py-1.5 text-muted hover:border-red-500/60 hover:text-red-500 disabled:opacity-40 transition"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {errored && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 mb-6">
          <p className="font-medium text-red-400 mb-1">Generation failed</p>
          <p className="text-sm text-muted">{data?.error}</p>
        </div>
      )}

      {isDraft && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 mb-6">
          <p className="font-medium text-amber-400 mb-1">Generation stopped — saved as a draft</p>
          <p className="text-sm text-muted">
            {`Your inputs${data && data.creatives.length > 0 ? " and any creatives generated so far" : ""} are kept. Edit & regenerate to pick up where you left off, or delete the draft.`}
          </p>
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

      {data && data.creatives.length > 0 && (() => {
        const totalPages = Math.max(1, Math.ceil(data.creatives.length / CREATIVES_PER_PAGE));
        const current = Math.min(page, totalPages); // clamp if the list shrank
        const start = (current - 1) * CREATIVES_PER_PAGE;
        const shown = data.creatives.slice(start, start + CREATIVES_PER_PAGE);
        return (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((c) => (
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
            <Pagination page={current} totalPages={totalPages} onChange={setPage} />
          </>
        );
      })()}
    </div>
  );
}
