"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditableText, Score } from "@/lib/types";
import type { VersionItem, VersionsPayload } from "@/lib/versions";

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

function versionLabel(v: VersionItem): string {
  return v.index === 1 ? "Original" : `Edit ${v.index - 1}`;
}

export function CreativeEditor({
  cid,
  initialText,
  initialPngUrl,
  initialVersions,
  meta,
  score: initialScore,
}: {
  cid: string;
  initialText: EditableText;
  initialPngUrl: string | null;
  initialVersions: VersionItem[];
  meta: { index: number; angle: string | null; layoutType: string; mode: string; overallScore: number | null };
  score: Score | null;
}) {
  const [pngUrl, setPngUrl] = useState(initialPngUrl);
  const [versions, setVersions] = useState<VersionItem[]>(initialVersions);
  const [score, setScore] = useState<Score | null>(initialScore);
  const [overallScore, setOverallScore] = useState<number | null>(meta.overallScore);

  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [canvaError, setCanvaError] = useState<string | null>(null);

  const downloadUrl = pngUrl;

  // Apply an edit/revert payload to local state. Key the active image URL by the
  // active version id so the browser reloads when reverting back to an existing path.
  function applyPayload(p: VersionsPayload) {
    const activeId = p.versions.find((v) => v.isActive)?.id ?? "";
    setPngUrl(p.activePngUrl ? `${p.activePngUrl}?v=${activeId}` : null);
    setVersions(p.versions);
    setScore(p.score);
    setOverallScore(p.overallScore);
  }

  async function applyEdit() {
    const text = instruction.trim();
    if (!text || busy) return;
    setBusy(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/creatives/${cid}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Edit failed");
      applyPayload(json as VersionsPayload);
      setInstruction("");
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setBusy(false);
    }
  }

  async function revertTo(versionId: string) {
    if (busy) return;
    setBusy(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/creatives/${cid}/revert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Revert failed");
      applyPayload(json as VersionsPayload);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Revert failed");
    } finally {
      setBusy(false);
    }
  }

  // Upload the PNG to Canva and open the editable design. If Canva isn't connected
  // yet, bounce through OAuth (returning here afterwards). `sameTab` is used for the
  // post-OAuth auto-continue, since a new-tab popup would be blocked without a click.
  const exportToCanva = useCallback(
    async (sameTab = false) => {
      setExporting(true);
      setCanvaError(null);
      // Open the tab synchronously on the user's click. window.open() after an
      // await is treated as a non-user-initiated popup and gets blocked (Brave is
      // especially strict), so we open a blank tab now and redirect it once we
      // have the URL. The post-OAuth auto-continue uses sameTab instead.
      const popup = sameTab ? null : window.open("about:blank", "_blank");
      if (popup) {
        // Give the blank tab an animated spinner while the request runs (uploading
        // the asset + creating the design takes a few seconds). document.write ends
        // the page load, so the browser's own tab spinner stops — this keeps a
        // visible "working" indicator until we redirect to Canva.
        try {
          popup.document.write(
            `<title>Opening Canva…</title>
             <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
             <body style="font-family:sans-serif;background:#0b0d12;color:#e7eaf0;display:flex;flex-direction:column;gap:18px;align-items:center;justify-content:center;height:100vh;margin:0">
               <div style="width:38px;height:38px;border:3px solid rgba(255,255,255,0.18);border-top-color:#6366f1;border-radius:50%;animation:spin .8s linear infinite"></div>
               <div style="font-size:15px;color:#9aa3b2">Opening Canva…</div>
             </body>`
          );
        } catch {
          /* cross-origin guard — ignore */
        }
      }
      try {
        const res = await fetch(`/api/creatives/${cid}/export-canva`, { method: "POST" });
        const json = await res.json();
        if (json.needsAuth) {
          popup?.close();
          window.location.href = `/api/canva/authorize?returnTo=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        if (json.editUrl) {
          if (sameTab) window.location.href = json.editUrl;
          else if (popup) popup.location.replace(json.editUrl);
          else window.location.href = json.editUrl; // popup was blocked → fall back to same tab
        } else {
          popup?.close();
          setCanvaError(json.error || "Export to Canva failed.");
        }
      } catch {
        popup?.close();
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
          className="relative rounded-xl border border-border overflow-hidden bg-white"
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
          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <p className="text-sm font-medium">Re-rendering…</p>
            </div>
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
            disabled={!downloadUrl || exporting || busy}
            className={`text-sm rounded-lg bg-accent px-4 py-2 text-white ${!downloadUrl || exporting || busy ? "opacity-40" : "hover:opacity-90"}`}
          >
            {exporting ? "Exporting…" : "Export to Canva"}
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          Opens the ad in Canva. Use Canva&apos;s <span className="font-medium">Grab Text</span> to make the copy editable.
        </p>
        {canvaError && <p className="text-xs text-red-500 mt-1">{canvaError}</p>}

        {versions.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-muted mb-2">Versions</p>
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`flex items-center gap-3 rounded-lg border p-2 ${v.isActive ? "border-accent bg-accent/5" : "border-border"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.pngUrl}
                    alt={versionLabel(v)}
                    width={44}
                    height={44}
                    className="rounded object-cover shrink-0"
                    style={{ width: 44, height: 44 }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {versionLabel(v)}
                      {v.isActive && <span className="text-accent font-normal"> · current</span>}
                      {v.overallScore != null && (
                        <span className="text-muted font-normal"> · {v.overallScore}/10</span>
                      )}
                    </p>
                    {v.instruction && <p className="truncate text-xs text-muted">{v.instruction}</p>}
                  </div>
                  {!v.isActive && (
                    <button
                      onClick={() => revertTo(v.id)}
                      disabled={busy}
                      className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs transition hover:border-accent disabled:opacity-40"
                    >
                      Revert
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit panel + copy reference (baked into the image) + meta + score */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <span>#{meta.index}</span>
          <span className="text-border">/</span>
          <span>{meta.angle ?? meta.mode}</span>
          <span className="text-border">/</span>
          <span>{meta.layoutType}</span>
          {overallScore != null && (
            <span className="ml-auto text-accent font-semibold normal-case text-sm">Score {overallScore}/10</span>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm font-medium">Edit this creative</p>
          <p className="mt-1 mb-3 text-xs leading-relaxed text-muted">
            Describe one change in plain English — everything else stays the same. Re-renders the ad (~1–2 min) and
            saves a new version you can revert.
          </p>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={busy}
            rows={3}
            placeholder={'e.g. Change the headline to "Beat The Heat Before Summer Hits."  ·  Make the CTA button deep blue  ·  Remove the bottom feature icons'}
            className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/50 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={applyEdit}
              disabled={busy || !instruction.trim() || !downloadUrl}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Applying…" : "Apply edit"}
            </button>
            {editError && <span className="text-xs text-red-500">{editError}</span>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="text-sm font-medium">Ad copy</p>
            <span className="text-xs text-muted">Baked into the image</span>
          </div>
          <dl className="space-y-3">
            <CopyRow label="Headline" value={initialText.headline} />
            <CopyRow label="Subheadline" value={initialText.subheadline} />
            <CopyRow label="Supporting copy" value={initialText.supportingCopy} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1">
              <CopyRow label="Offer" value={initialText.offer} />
              <CopyRow label="CTA" value={initialText.cta} />
            </div>
          </dl>
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

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm leading-snug">{value || "—"}</dd>
    </div>
  );
}
