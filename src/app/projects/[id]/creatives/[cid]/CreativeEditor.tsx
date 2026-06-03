"use client";

import { useRef, useState } from "react";
import type { EditableText, Score } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent transition";

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
  const [text, setText] = useState<EditableText>(initialText);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(initialPngUrl);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const field = (k: keyof EditableText) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setText((t) => ({ ...t, [k]: e.target.value }));
    setDirty(true);
  };

  // Save text → re-render the preview iframe instantly (no image-API call) → re-export PNG.
  async function apply() {
    setSaving(true);
    try {
      await fetch(`/api/creatives/${cid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(text),
      });
      setPreviewKey((k) => k + 1); // reload iframe to show new text
      const res = await fetch(`/api/creatives/${cid}/reexport`, { method: "POST" });
      const json = await res.json();
      if (json.url) setDownloadUrl(json.url);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[480px_1fr] gap-8 mt-4">
      {/* Live preview — the exact /render output scaled to fit */}
      <div>
        <div
          className="rounded-xl border border-border overflow-hidden bg-white"
          style={{ width: 480, height: 480 }}
        >
          <iframe
            key={previewKey}
            ref={iframeRef}
            src={`/render/${cid}`}
            title="preview"
            scrolling="no"
            style={{ width: 1080, height: 1080, border: 0, transform: "scale(0.4444)", transformOrigin: "top left" }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          <a
            href={downloadUrl ?? "#"}
            download
            className={`text-sm rounded-lg border border-border px-4 py-2 ${downloadUrl ? "hover:border-accent" : "opacity-40 pointer-events-none"}`}
          >
            ↓ Download PNG
          </a>
          <span className="text-xs text-muted self-center">
            {dirty ? "Unsaved changes" : "Preview matches export"}
          </span>
        </div>
      </div>

      {/* Editable text + meta + score */}
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
            <span>#{meta.index}</span>
            <span>· {meta.angle ?? meta.mode}</span>
            <span>· {meta.layoutType}</span>
            {meta.overallScore != null && (
              <span className="ml-auto text-accent font-semibold normal-case text-sm">Score {meta.overallScore}/10</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Labeled label="Headline">
            <input className={inputCls} value={text.headline} onChange={field("headline")} />
          </Labeled>
          <Labeled label="Subheadline">
            <input className={inputCls} value={text.subheadline} onChange={field("subheadline")} />
          </Labeled>
          <Labeled label="Supporting copy">
            <input className={inputCls} value={text.supportingCopy} onChange={field("supportingCopy")} />
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Offer">
              <input className={inputCls} value={text.offer} onChange={field("offer")} />
            </Labeled>
            <Labeled label="CTA">
              <input className={inputCls} value={text.cta} onChange={field("cta")} />
            </Labeled>
          </div>
        </div>

        <button
          onClick={apply}
          disabled={saving || !dirty}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90"
        >
          {saving ? "Re-rendering…" : "Apply & re-export"}
        </button>

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

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}
