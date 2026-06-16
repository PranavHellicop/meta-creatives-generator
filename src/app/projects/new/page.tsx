"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { parseLines } from "@/lib/copyInput";

const inputCls =
  "w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/50 focus:border-accent focus:ring-2 focus:ring-accent/20";
const COUNT_GREEN: React.CSSProperties = { color: "#059669" };
const labelCls = "block text-sm font-medium mb-2";
const helpCls = "mt-2 text-xs leading-relaxed text-muted";
const cardCls = "rounded-2xl border border-border bg-surface p-8";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function Disclosure({
  title, subtitle, badge, defaultOpen = false, children,
}: {
  title: string;
  subtitle?: string;
  badge?: string | null;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left transition hover:bg-surface-2/40"
      >
        <span className={`transition-colors ${open ? "text-accent" : "text-muted"}`}>
          <ChevronIcon open={open} />
        </span>
        <span className="flex-1">
          <span className="text-sm font-medium">{title}</span>
          {subtitle && <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>}
        </span>
        {badge && (
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">{badge}</span>
        )}
      </button>
      {open && <div className="grid gap-6 border-t border-border px-6 pb-6 pt-5 sm:grid-cols-2 lg:gap-8">{children}</div>}
    </div>
  );
}

function FileField({
  accept, multiple, onChange, fileLabel,
}: {
  accept: string;
  multiple?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileLabel: string | null;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-surface-2 px-3.5 py-3 transition hover:border-accent/50">
      <span className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white">Choose file</span>
      <span className={`truncate text-sm ${fileLabel ? "text-foreground" : "text-muted"}`}>
        {fileLabel ?? "No file chosen"}
      </span>
      <input type="file" accept={accept} multiple={multiple} onChange={onChange} className="hidden" />
    </label>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    headlines: "",
    subheadlines: "",
    prompt: "",
    ctas: "",
    audience: "",
    websiteUrl: "",
    notes: "",
  });
  const [featureFounder, setFeatureFounder] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [creativeCount, setCreativeCount] = useState(0);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Upload a .md/.txt file straight into a textarea (textarea stays the source of truth).
  function loadFileInto(k: keyof typeof form) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const text = await file.text();
        setForm((f) => ({ ...f, [k]: text }));
      }
      e.target.value = ""; // allow re-uploading the same file
    };
  }

  // Object-URL previews for the uploaded founder photos (revoked on change/unmount).
  const photoPreviews = useMemo(
    () => photos.map((p) => ({ name: p.name, url: URL.createObjectURL(p) })),
    [photos]
  );
  useEffect(() => () => photoPreviews.forEach((p) => URL.revokeObjectURL(p.url)), [photoPreviews]);

  function removePhoto(i: number) {
    setPhotos((ps) => ps.filter((_, idx) => idx !== i));
  }

  const headlineCount = parseLines(form.headlines).length;
  const subheadlineCount = parseLines(form.subheadlines).length;
  const ctaCount = parseLines(form.ctas).length;
  const step1Valid = headlineCount > 0;

  function goToStep2() {
    setCreativeCount(headlineCount); // default the batch size to the number of headlines
    setStep(2);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("featureFounder", String(featureFounder === true));
      fd.append("creativeCount", String(creativeCount));
      if (featureFounder) photos.forEach((p) => fd.append("photos", p));

      const res = await fetch("/api/projects", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create project");
      const { id } = await res.json();

      // Kick off the pipeline, then go to the project page (which polls progress).
      fetch(`/api/projects/${id}/generate`, { method: "POST" }).catch(() => {});
      router.push(`/projects/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-8 pt-10">
        <div className="mb-8 flex items-center gap-3 text-sm">
          <StepDot n={1} step={step} label="Business" />
          <div className="h-px flex-1 bg-border" />
          <StepDot n={2} step={step} label="Featuring & batch" />
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <header>
              <h1 className="text-2xl font-semibold tracking-tight">What are we advertising?</h1>
              <p className="mt-1.5 text-sm text-muted">
                Add your headlines and describe the business — the AI figures out the rest. Only the
                headline is required.
              </p>
            </header>

            <section className={cardCls}>
              <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
                <LinesField
                  label="Headlines"
                  required
                  value={form.headlines}
                  onChange={set("headlines")}
                  onFile={loadFileInto("headlines")}
                  count={headlineCount}
                  unit="headline"
                  rows={5}
                  placeholder={"One headline per line, e.g.\nSitting 8 hours a day? Your spine pays for it.\nBack pain isn't just age — it's posture."}
                  help="One ad each, in order. Add more in the next step for extra AI-written ones."
                />
                <Field label="Prompt">
                  <textarea
                    className={inputCls}
                    rows={5}
                    value={form.prompt}
                    onChange={set("prompt")}
                    placeholder="Describe the business and what you need — who they are, the service, the offer, the goal. e.g. 'Physiotherapy clinic for desk workers with back pain; promoting a free posture assessment + 20% off the first session.'"
                  />
                  {!form.prompt.trim() && (
                    <p className={helpCls}>
                      The more you describe, the more the AI extracts — business, niche, service, and
                      offer are all derived from this (and your website, if added).
                    </p>
                  )}
                </Field>
                <LinesField
                  label="Subheadlines"
                  value={form.subheadlines}
                  onChange={set("subheadlines")}
                  onFile={loadFileInto("subheadlines")}
                  count={subheadlineCount}
                  unit="subheadline"
                  rows={3}
                  placeholder={"Optional — one per line, paired to the headlines in order."}
                  help="Optional. Used in order with the headlines; the rest are AI-written."
                />
                <LinesField
                  label="CTA(s)"
                  value={form.ctas}
                  onChange={set("ctas")}
                  count={ctaCount}
                  unit="CTA"
                  rows={3}
                  placeholder={"One CTA per line, e.g.\nBook a Call\nDownload the Guide"}
                  help={
                    ctaCount > 1
                      ? "Spread across the set; distinct ones may be combined where it makes sense."
                      : "Optional, one per line. One CTA is used on every ad; multiple are spread across the set."
                  }
                />
              </div>
              <div className="mt-5">
                <Field label="Target audience">
                  <input className={inputCls} value={form.audience} onChange={set("audience")} placeholder="Optional — e.g. Adults 28-50 with desk jobs and chronic back pain" />
                </Field>
              </div>
            </section>

            <Disclosure
              title="Improve research quality"
              subtitle="Give the AI a website and notes to ground its research"
              badge={form.websiteUrl.trim() || form.notes.trim() ? "Added" : null}
            >
              <Field label="Website URL">
                <input className={inputCls} value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://..." />
              </Field>
              <Field label="Additional notes">
                <input className={inputCls} value={form.notes} onChange={set("notes")} placeholder="Awards, testimonials, brand voice, anything useful..." />
              </Field>
            </Disclosure>

            <StickyBar>
              <span className="text-xs text-muted">
                {step1Valid
                  ? `${headlineCount} headline${headlineCount === 1 ? "" : "s"} ready`
                  : "Add at least one headline to continue"}
              </span>
              <button
                disabled={!step1Valid}
                onClick={goToStep2}
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
              >
                Continue
              </button>
            </StickyBar>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <header>
              <h1 className="text-2xl font-semibold tracking-tight">Featuring &amp; batch</h1>
              <p className="mt-1.5 text-sm text-muted">
                Choose whether to feature a real person, then pick how many creatives to generate.
              </p>
            </header>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Choice
                active={featureFounder === true}
                onClick={() => setFeatureFounder(true)}
                title="Feature a person"
                desc="Upload photos. The real person is cut out and composited into the ads."
              />
              <Choice
                active={featureFounder === false}
                onClick={() => { setFeatureFounder(false); setPhotos([]); }}
                title="Banner ads"
                desc="Direct-response ads: headline, offer, CTA, icons & stats. No fake people."
              />
            </div>

            {featureFounder === true && (
              <section className={cardCls}>
                <label className={labelCls}>Upload founder / expert photos</label>
                <FileField
                  accept="image/*"
                  multiple
                  onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
                  fileLabel={photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected` : null}
                />
                <p className={helpCls}>Clear, well-lit photos work best — front-facing, minimal background clutter.</p>
                {photoPreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {photoPreviews.map((p, i) => (
                      <div
                        key={p.url}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={`Remove ${p.name}`}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {featureFounder !== null && (() => {
              const min = Math.max(1, headlineCount);
              const max = Math.max(min + 10, 15);
              return (
                <section className={cardCls}>
                  <div className="flex items-center justify-between">
                    <label className={labelCls + " mb-0"}>How many creatives?</label>
                    <span className="rounded-md bg-surface-2 px-2.5 py-1 text-sm font-semibold tabular-nums">{creativeCount}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} value={creativeCount}
                    onChange={(e) => setCreativeCount(Number(e.target.value))}
                    className="mt-4 w-full accent-[var(--accent)]"
                  />
                  <div className="mt-1.5 flex justify-between text-xs text-muted">
                    <span>{min}</span><span>{max}</span>
                  </div>
                  <p className={helpCls}>
                    Defaults to your {headlineCount} headline{headlineCount === 1 ? "" : "s"} — increase to add AI-written ones.
                  </p>
                </section>
              );
            })()}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <StickyBar>
              <button onClick={() => setStep(1)} className="text-sm text-muted transition hover:text-foreground">
                ← Back
              </button>
              <button
                disabled={featureFounder === null || submitting || (featureFounder === true && photos.length === 0)}
                onClick={submit}
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {submitting ? "Creating…" : "Generate creatives"}
              </button>
            </StickyBar>
          </div>
        )}
      </main>
    </>
  );
}

// Sticky action bar pinned to the bottom of the viewport so the primary button
// is always reachable without scrolling to the end of a long form.
function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-8 mt-2 border-t border-border bg-background/80 px-8 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// Textarea (one item per line) with a live count and an optional inline
// "Upload .md/.txt" that loads file text into the textarea (the textarea stays
// the single source of truth).
function LinesField({
  label, required, value, onChange, onFile, placeholder, help, count, unit, rows = 4,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFile?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  help: string;
  count: number;
  unit: string;
  rows?: number;
}) {
  return (
    <Field label={label} required={required}>
      <textarea className={inputCls} rows={rows} value={value} onChange={onChange} placeholder={placeholder} />
      <div className="mt-2 flex items-start justify-between gap-3">
        <p className="mt-0 text-xs leading-relaxed">
          {count > 0 ? (
            <span className="font-semibold" style={COUNT_GREEN}>
              {count} {unit}{count === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="text-muted">{help}</span>
          )}
        </p>
        {onFile && (
          <label className="shrink-0 cursor-pointer whitespace-nowrap text-xs font-medium text-accent hover:underline">
            ↑ Upload .md/.txt
            <input type="file" accept=".md,.markdown,.txt" className="hidden" onChange={onFile} />
          </label>
        )}
      </div>
    </Field>
  );
}

function StepDot({ n, step, label }: { n: number; step: number; label: string }) {
  const active = step >= n;
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${active ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}>
        {n}
      </span>
      <span className={active ? "font-medium" : "text-muted"}>{label}</span>
    </div>
  );
}

function Choice({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${active ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-accent/50"}`}
    >
      <p className="mb-1 font-medium">{title}</p>
      <p className="text-xs leading-relaxed text-muted">{desc}</p>
    </button>
  );
}
