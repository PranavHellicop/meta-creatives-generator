"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { parseHeadlineMarkdown } from "@/lib/copyInput";

const inputCls =
  "w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/50 focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelCls = "block text-sm font-medium mb-2";
const helpCls = "mt-2 text-xs leading-relaxed text-muted";
const cardCls = "rounded-2xl border border-border bg-surface p-6";

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
      {open && <div className="space-y-6 border-t border-border px-6 pb-6 pt-5">{children}</div>}
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
    name: "",
    niche: "",
    service: "",
    audience: "",
    offer: "",
    websiteUrl: "",
    notes: "",
    ctas: "",
  });
  const [featureFounder, setFeatureFounder] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [creativeCount, setCreativeCount] = useState(10);
  const [headlineFile, setHeadlineFile] = useState<File | null>(null);
  const [headlineCount, setHeadlineCount] = useState(0);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onHeadlineFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setHeadlineFile(file);
    setHeadlineCount(file ? parseHeadlineMarkdown(await file.text()).length : 0);
  }

  const step1Valid =
    form.name && form.niche && form.service && form.audience && form.offer;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("featureFounder", String(featureFounder === true));
      fd.append("creativeCount", String(creativeCount));
      if (featureFounder) photos.forEach((p) => fd.append("photos", p));
      if (headlineFile) fd.append("headlineFile", headlineFile);

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
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-10 flex items-center gap-3 text-sm">
          <StepDot n={1} step={step} label="Business" />
          <div className="h-px flex-1 bg-border" />
          <StepDot n={2} step={step} label="Featuring & batch" />
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <header>
              <h1 className="text-2xl font-semibold tracking-tight">Tell us about the business</h1>
              <p className="mt-1.5 text-sm text-muted">
                The essentials are all we need to start — everything else is optional.
              </p>
            </header>

            <section className={cardCls}>
              <div className="space-y-5">
                <Field label="Business name *">
                  <input className={inputCls} value={form.name} onChange={set("name")} placeholder="Bright Smile Dental" />
                </Field>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Niche / Industry *">
                    <input className={inputCls} value={form.niche} onChange={set("niche")} placeholder="Dentist" />
                  </Field>
                  <Field label="Primary service *">
                    <input className={inputCls} value={form.service} onChange={set("service")} placeholder="Teeth whitening" />
                  </Field>
                </div>
                <Field label="Target audience *">
                  <input className={inputCls} value={form.audience} onChange={set("audience")} placeholder="Adults 28-50 self-conscious about their smile" />
                </Field>
                <Field label="Offer *">
                  <input className={inputCls} value={form.offer} onChange={set("offer")} placeholder="Free smile consultation + £100 off whitening" />
                </Field>
              </div>
            </section>

            <Disclosure
              title="Bring your own copy"
              subtitle="Supply exact headlines and CTAs to use in the final ads"
              badge={headlineCount > 0 || form.ctas.trim() ? "Added" : null}
            >
              <Field label="Headline options">
                <FileField
                  accept=".md,.markdown,.txt"
                  onChange={onHeadlineFile}
                  fileLabel={headlineFile?.name ?? null}
                />
                <p className={helpCls}>
                  {headlineCount > 0
                    ? `${headlineCount} headline${headlineCount === 1 ? "" : "s"} detected. Used in order — extra ads get AI-written headlines.`
                    : "A .md / .txt file, one headline per line. Used in order; extra ads get AI-written headlines."}
                </p>
              </Field>
              <Field label="CTA(s)">
                <textarea
                  className={inputCls}
                  rows={2}
                  value={form.ctas}
                  onChange={set("ctas")}
                  placeholder="e.g. Book a Call"
                />
                <p className={helpCls}>
                  Separate multiple with commas. One CTA is used on every ad; multiple are spread across the
                  set — some on their own, some combined where it makes sense.
                </p>
              </Field>
            </Disclosure>

            <Disclosure
              title="Improve research quality"
              subtitle="Give the AI a website and notes to ground its research"
              badge={form.websiteUrl.trim() || form.notes.trim() ? "Added" : null}
            >
              <Field label="Website URL">
                <input className={inputCls} value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://..." />
              </Field>
              <Field label="Additional notes">
                <textarea className={inputCls} rows={3} value={form.notes} onChange={set("notes")} placeholder="Awards, testimonials, brand voice, anything useful..." />
              </Field>
            </Disclosure>

            <div className="flex justify-end pt-1">
              <button
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
              >
                Continue
              </button>
            </div>
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
              </section>
            )}

            {featureFounder !== null && (
              <section className={cardCls}>
                <div className="flex items-center justify-between">
                  <label className={labelCls + " mb-0"}>How many creatives?</label>
                  <span className="rounded-md bg-surface-2 px-2.5 py-1 text-sm font-semibold tabular-nums">{creativeCount}</span>
                </div>
                <input
                  type="range" min={1} max={15} value={creativeCount}
                  onChange={(e) => setCreativeCount(Number(e.target.value))}
                  className="mt-4 w-full accent-[var(--accent)]"
                />
                <div className="mt-1.5 flex justify-between text-xs text-muted">
                  <span>1</span><span>15</span>
                </div>
              </section>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex items-center justify-between pt-1">
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
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
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
