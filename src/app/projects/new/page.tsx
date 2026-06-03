"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

const inputCls =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent transition";
const labelCls = "block text-sm font-medium mb-1.5";

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
    igUrl: "",
    fbUrl: "",
    notes: "",
  });
  const [featureFounder, setFeatureFounder] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [creativeCount, setCreativeCount] = useState(10);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

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
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-center gap-2 mb-8 text-sm">
          <StepDot n={1} step={step} label="Business" />
          <div className="h-px flex-1 bg-border" />
          <StepDot n={2} step={step} label="Featuring & batch" />
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <h1 className="text-xl font-semibold">Tell us about the business</h1>

            <Field label="Business name *">
              <input className={inputCls} value={form.name} onChange={set("name")} placeholder="Bright Smile Dental" />
            </Field>
            <Field label="Niche / Industry *">
              <input className={inputCls} value={form.niche} onChange={set("niche")} placeholder="Dentist" />
            </Field>
            <Field label="Primary service *">
              <input className={inputCls} value={form.service} onChange={set("service")} placeholder="Cosmetic dentistry & teeth whitening" />
            </Field>
            <Field label="Target audience *">
              <input className={inputCls} value={form.audience} onChange={set("audience")} placeholder="Adults 28-50 self-conscious about their smile" />
            </Field>
            <Field label="Offer *">
              <input className={inputCls} value={form.offer} onChange={set("offer")} placeholder="Free smile consultation + £100 off whitening" />
            </Field>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted mb-3 mt-3">Optional — improves research quality</p>
              <Field label="Website URL">
                <input className={inputCls} value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://..." />
              </Field>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Instagram URL">
                  <input className={inputCls} value={form.igUrl} onChange={set("igUrl")} placeholder="https://instagram.com/..." />
                </Field>
                <Field label="Facebook URL">
                  <input className={inputCls} value={form.fbUrl} onChange={set("fbUrl")} placeholder="https://facebook.com/..." />
                </Field>
              </div>
              <Field label="Additional notes">
                <textarea className={inputCls} rows={3} value={form.notes} onChange={set("notes")} placeholder="Awards, testimonials, brand voice, anything useful..." />
              </Field>
            </div>

            <div className="flex justify-end pt-2">
              <button
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold">
              Do you want the owner / coach / expert featured in the creatives?
            </h1>

            <div className="grid grid-cols-2 gap-3">
              <Choice
                active={featureFounder === true}
                onClick={() => setFeatureFounder(true)}
                title="Yes — feature them"
                desc="Upload photos. The real person is cut out and composited into the ads."
              />
              <Choice
                active={featureFounder === false}
                onClick={() => { setFeatureFounder(false); setPhotos([]); }}
                title="No — banner ads"
                desc="Direct-response ads: headline, offer, CTA, icons & stats. No fake people."
              />
            </div>

            {featureFounder === true && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <label className={labelCls}>Upload founder / expert photos</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
                  className="text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-white"
                />
                {photos.length > 0 && (
                  <p className="text-xs text-muted mt-2">{photos.length} photo(s) selected</p>
                )}
              </div>
            )}

            {featureFounder !== null && (
              <div>
                <label className={labelCls}>How many creatives? (1–15)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min={1} max={15} value={creativeCount}
                    onChange={(e) => setCreativeCount(Number(e.target.value))}
                    className="flex-1 accent-[var(--accent)]"
                  />
                  <span className="w-10 text-center font-semibold">{creativeCount}</span>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="text-sm text-muted hover:text-foreground">
                ← Back
              </button>
              <button
                disabled={featureFounder === null || submitting || (featureFounder === true && photos.length === 0)}
                onClick={submit}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90"
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
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${active ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}>
        {n}
      </span>
      <span className={active ? "" : "text-muted"}>{label}</span>
    </div>
  );
}

function Choice({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition ${active ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-accent/50"}`}
    >
      <p className="font-medium mb-1">{title}</p>
      <p className="text-xs text-muted">{desc}</p>
    </button>
  );
}
