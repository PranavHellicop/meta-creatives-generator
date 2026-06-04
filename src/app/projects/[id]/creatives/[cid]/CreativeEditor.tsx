"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditableText, Score } from "@/lib/types";

const SCORE_LABELS: { key: keyof Score; label: string }[] = [
  { key: "readability", label: "Readability" },
  { key: "visualHierarchy", label: "Visual hierarchy" },
  { key: "offerClarity", label: "Offer clarity" },
  { key: "ctaClarity", label: "CTA clarity" },
  { key: "marketingStrength", label: "Marketing strength" },
  { key: "metaAdSuitability", label: "Meta-ad suitability" },
  { key: "designQuality", label: "Design quality" },
  { key: "professionalAppearance", label: "Professional look" },
  { key: "trustworthiness", label: "Trustworthiness" },
  { key: "conversionPotential", label: "Conversion potential" },
];

export function CreativeEditor({
  cid,
  initialText,
  initialPngUrl,
  meta,
  score,
}: {
  cid: string;
  initialText: EditableText;
  initialPngUrl: string | null;
  meta: { index: number; angle: string | null; layoutType: string; mode: string; overallScore: number | null };
  score: Score | null;
}) {
  const downloadUrl = initialPngUrl;
  const [exporting, setExporting] = useState(false);
  const [canvaError, setCanvaError] = useState<string | null>(null);

  // Upload the PNG to Canva and open the editable design. If Canva isn't connected
  // yet, bounce through OAuth (returning here afterwards). `sameTab` is used for the
  // post-OAuth auto-continue, since a new-tab popup would be blocked without a click.
  const exportToCanva = useCallback(
    async (sameTab = false) => {
      setExporting(true);
      setCanvaError(null);
      try {
        const res = await fetch(`/api/creatives/${cid}/export-canva`, { method: "POST" });
        const json = await res.json();
        if (json.needsAuth) {
          window.location.href = `/api/canva/authorize?returnTo=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        if (json.editUrl) {
          if (sameTab) window.location.href = json.editUrl;
          else window.open(json.editUrl, "_blank", "noopener");
        } else {
          setCanvaError(json.error || "Export to Canva failed.");
        }
      } catch {
        setCanvaError("Export to Canva failed.");
      } finally {
        setExporting(false);
      }
    },
    [cid]
  );

  // After returning from Canva OAuth, auto-continue the export (or surface an error).
  // Deferred via a timer so we don't update state synchronously inside the effect.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("canva");
    if (!status) return;
    window.history.replaceState({}, "", window.location.pathname); // strip the flag
    const t = setTimeout(() => {
      if (status === "connected") exportToCanva(true);
      else if (status === "error") setCanvaError("Canva connection failed. Please try again.");
    }, 0);
    return () => clearTimeout(t);
  }, [exportToCanva]);

  return (
    <div className="grid lg:grid-cols-[480px_1fr] gap-8 mt-4">
      {/* The generated final PNG — imagery and all text are baked into this single image */}
      <div>
        <div
          className="rounded-xl border border-border overflow-hidden bg-white"
          style={{ width: 480, height: 480 }}
        >
          {downloadUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={downloadUrl}
              alt="creative"
              width={480}
              height={480}
              style={{ width: 480, height: 480, objectFit: "cover" }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">No image yet</div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <a
            href={downloadUrl ?? "#"}
            download
            className={`text-sm rounded-lg border border-border px-4 py-2 ${downloadUrl ? "hover:border-accent" : "opacity-40 pointer-events-none"}`}
          >
            ↓ Download PNG
          </a>
          <button
            onClick={() => exportToCanva()}
            disabled={!downloadUrl || exporting}
            className={`text-sm rounded-lg bg-accent px-4 py-2 text-white ${!downloadUrl || exporting ? "opacity-40" : "hover:opacity-90"}`}
          >
            {exporting ? "Exporting…" : "Export to Canva"}
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          Opens the ad in Canva. Use Canva&apos;s <span className="font-medium">Grab Text</span> to make the copy editable.
        </p>
        {canvaError && <p className="text-xs text-red-500 mt-1">{canvaError}</p>}
      </div>

      {/* Copy reference (baked into the image) + meta + score */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <span>#{meta.index}</span>
          <span>· {meta.angle ?? meta.mode}</span>
          <span>· {meta.layoutType}</span>
          {meta.overallScore != null && (
            <span className="ml-auto text-accent font-semibold normal-case text-sm">Score {meta.overallScore}/10</span>
          )}
        </div>

        <div className="space-y-3">
          <Field label="Headline" value={initialText.headline} />
          <Field label="Subheadline" value={initialText.subheadline} />
          <Field label="Supporting copy" value={initialText.supportingCopy} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Offer" value={initialText.offer} />
            <Field label="CTA" value={initialText.cta} />
          </div>
        </div>

        {score && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="font-medium mb-3 text-sm">Quality score</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {SCORE_LABELS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{label}</span>
                  <span className="font-medium">{score[key] as number}/10</span>
                </div>
              ))}
            </div>
            {score.notes && <p className="text-xs text-muted mt-3 italic">{score.notes}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <div className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
        {value || "—"}
      </div>
    </div>
  );
}
