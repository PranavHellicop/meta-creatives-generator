import type { ArtDirection, CreativeRenderProps, EditableText } from "@/lib/types";

export const CANVAS = 1080;
export const PAD = 80;
export type LayoutComponentProps = CreativeRenderProps;

// =====================================================================================
// COLOR SYSTEM — everything derives contrast-safe tokens so text is always readable.
// =====================================================================================

type RGB = { r: number; g: number; b: number };

function toRgb(hex: string): RGB {
  let h = (hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 30, g: 30, b: 30 };
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function toHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
export function hexA(hex: string, a: number): string {
  const { r, g, b } = toRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export function mix(a: string, b: string, t: number): string {
  const x = toRgb(a), y = toRgb(b);
  return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}
export function darken(hex: string, t: number): string {
  return mix(hex, "#0a0d12", t);
}
export function lighten(hex: string, t: number): string {
  return mix(hex, "#ffffff", t);
}
function relLum(hex: string): number {
  const { r, g, b } = toRgb(hex);
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a: string, b: string): number {
  const la = relLum(a), lb = relLum(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
export function pickText(bg: string): "#ffffff" | "#0d0f14" {
  return contrast("#ffffff", bg) >= contrast("#0d0f14", bg) ? "#ffffff" : "#0d0f14";
}
// Nudge a foreground color until it is readable on bg (>= target contrast), keeping its hue.
export function ensureReadable(fg: string, bg: string, target = 4.5): string {
  if (contrast(fg, bg) >= target) return fg;
  const bgDark = relLum(bg) < 0.4;
  let best = fg, bestC = contrast(fg, bg);
  for (let t = 0.1; t <= 1; t += 0.1) {
    const cand = bgDark ? lighten(fg, t) : darken(fg, t);
    const c = contrast(cand, bg);
    if (c > bestC) { best = cand; bestC = c; }
    if (c >= target) return cand;
  }
  return best;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// HSL saturation + lightness for vividness checks.
function satLum(hex: string): { s: number; l: number } {
  const { r, g, b } = toRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s, l };
}
function isVivid(hex: string): boolean {
  const { s, l } = satLum(hex);
  return s >= 0.28 && l >= 0.18 && l <= 0.82;
}
// Choose a vivid accent: first vivid candidate, else a saturated brand fallback.
function vividAccent(candidates: string[]): string {
  for (const c of candidates) if (isVivid(c)) return c;
  // derive from primary: push it into a usable mid-lightness
  const base = candidates.find(Boolean) || "#E8843A";
  const { l } = satLum(base);
  return l > 0.7 ? darken(base, 0.45) : l < 0.2 ? lighten(base, 0.35) : base;
}

export interface Tokens {
  accent: string;
  ink: string;            // deep brand-tinted near-black
  paper: string;          // light brand-tinted surface
  panelTheme: "dark" | "light";
  panelBg: string;
  panelText: string;
  panelSub: string;
  kicker: string;         // readable accent on the panel
  divider: string;
  chipBg: string;
  chipText: string;
  ctaBg: string;
  ctaText: string;
  // full-bleed background (banner / non-photo) tokens
  fieldBg: string;        // css background value
  fieldText: string;
  fieldSub: string;
  fieldKicker: string;
}

export function tokens(p: LayoutComponentProps): Tokens {
  const a = p.art;
  // Guard against washed-out accents (white/black/gray) the LLM sometimes emits:
  // fall back to the most vivid brand color so the CTA/kicker always pops.
  const accent = vividAccent([a.accentColor, a.secondaryColor, a.primaryColor]);
  const ink = mix(a.primaryColor, "#0a0d12", 0.82);
  const paper = lighten(a.primaryColor, 0.9);

  // Vary panel theme per creative for visual diversity, but always contrast-safe.
  const panelTheme: "dark" | "light" = hashStr(p.text.headline + p.layoutType) % 2 === 0 ? "dark" : "light";
  const panelBg = panelTheme === "dark" ? ink : paper;
  const panelText = panelTheme === "dark" ? "#ffffff" : ink;
  const panelSub = panelTheme === "dark" ? "rgba(255,255,255,0.82)" : hexA(ink, 0.7);
  const kicker = ensureReadable(accent, panelBg, 4.0);
  const chipBg = accent;
  const chipText = pickText(accent);
  const ctaBg = panelTheme === "dark" ? accent : ink;
  const ctaText = pickText(ctaBg);

  // Banner full-bleed: rich monochromatic field built from the brand color.
  let fieldBg: string, fieldText: string;
  if (a.backgroundStyle === "soft-shapes") {
    fieldBg = paper;
    fieldText = ink;
  } else if (a.backgroundStyle === "solid") {
    fieldBg = a.primaryColor;
    fieldText = pickText(a.primaryColor);
  } else {
    // gradient (default) — monochromatic primary → dark for depth
    fieldBg = `linear-gradient(135deg, ${a.primaryColor} 0%, ${darken(a.primaryColor, 0.45)} 100%)`;
    fieldText = pickText(darken(a.primaryColor, 0.25));
  }
  const fieldSub = fieldText === "#ffffff" ? "rgba(255,255,255,0.85)" : hexA(ink, 0.72);
  const fieldKicker = ensureReadable(accent, a.backgroundStyle === "soft-shapes" ? paper : darken(a.primaryColor, 0.3), 3.5);

  return {
    accent, ink, paper, panelTheme, panelBg, panelText, panelSub, kicker,
    divider: accent, chipBg, chipText, ctaBg, ctaText,
    fieldBg, fieldText, fieldSub, fieldKicker,
  };
}

// =====================================================================================
// TYPOGRAPHY — real font pairing + weight hierarchy + overflow-safe headline sizing.
// =====================================================================================

export interface Fonts {
  display: string;
  body: string;
  weight: number;
  upper: boolean;
  tracking: number;
  widthFactor: number; // approx glyph width / font-size for fit calculations
}

export function fonts(art: ArtDirection): Fonts {
  switch (art.typographyStyle) {
    case "elegant-serif":
      return { display: "var(--font-serif), Georgia, serif", body: "var(--font-geist-sans), sans-serif", weight: 800, upper: false, tracking: -0.5, widthFactor: 0.52 };
    case "bold-condensed":
      return { display: "var(--font-condensed), Impact, sans-serif", body: "var(--font-geist-sans), sans-serif", weight: 700, upper: true, tracking: 0.5, widthFactor: 0.46 };
    case "clean-geometric":
      return { display: "var(--font-geometric), sans-serif", body: "var(--font-geometric), sans-serif", weight: 800, upper: false, tracking: -0.5, widthFactor: 0.6 };
    default:
      return { display: "var(--font-geist-sans), system-ui, sans-serif", body: "var(--font-geist-sans), sans-serif", weight: 800, upper: false, tracking: -1, widthFactor: 0.56 };
  }
}

// Largest font size at which the headline fits: longest word must fit one line,
// and total text must fit the available height across wrapped lines.
export function fitHeadline(
  text: string,
  maxWidth: number,
  maxHeight: number,
  f: Fonts,
  maxSize = 78,
  minSize = 34
): number {
  const words = text.split(/\s+/).filter(Boolean);
  const longest = words.reduce((m, w) => Math.max(m, w.length), 1);
  // Constraint 1: the longest single word must not overflow the column width.
  const byWord = maxWidth / (longest * f.widthFactor);
  // Constraint 2: total glyphs wrapped into lines must fit the height box.
  const totalChars = text.replace(/\s+/g, " ").length;
  let size = Math.min(maxSize, byWord);
  for (; size > minSize; size -= 1) {
    const charsPerLine = Math.max(1, Math.floor(maxWidth / (size * f.widthFactor)));
    const lines = Math.ceil(totalChars / charsPerLine);
    const lineH = size * 1.04;
    if (lines * lineH <= maxHeight) break;
  }
  return Math.max(minSize, Math.floor(size));
}

// =====================================================================================
// PRIMITIVES
// =====================================================================================

export function Kicker({ label, color, font }: { label: string; color: string; font: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: font }}>
      <span style={{ width: 28, height: 4, background: color, borderRadius: 2 }} />
      <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color }}>{label}</span>
    </div>
  );
}

export function Headline({ text, size, color, f, align = "left" }: { text: string; size: number; color: string; f: Fonts; align?: "left" | "center" }) {
  return (
    <div
      style={{
        fontFamily: f.display,
        fontSize: size,
        fontWeight: f.weight,
        lineHeight: 1.02,
        letterSpacing: f.tracking,
        textTransform: f.upper ? "uppercase" : "none",
        color,
        textAlign: align,
        overflowWrap: "break-word",
        wordBreak: "break-word",
        textWrap: "balance",
      }}
    >
      {text}
    </div>
  );
}

export function Sub({ text, color, font, size = 31, align = "left" }: { text: string; color: string; font: string; size?: number; align?: "left" | "center" }) {
  if (!text) return null;
  return <div style={{ fontFamily: font, fontSize: size, fontWeight: 500, lineHeight: 1.32, color, textAlign: align, overflowWrap: "break-word" }}>{text}</div>;
}

export function Chip({ text, bg, color, font }: { text: string; bg: string; color: string; font: string }) {
  if (!text) return null;
  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "100%" }}>
      <span style={{ display: "inline-block", background: bg, color, fontFamily: font, fontSize: 25, fontWeight: 800, padding: "13px 24px", borderRadius: 10, lineHeight: 1.2 }}>
        {text}
      </span>
    </div>
  );
}

export function CTA({ label, bg, color, font, radius = 12, align = "left" }: { label: string; bg: string; color: string; font: string; radius?: number; align?: "left" | "center" }) {
  return (
    <div style={{ display: "flex", justifyContent: align === "center" ? "center" : "flex-start" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 12, background: bg, color, fontFamily: font, fontSize: 28, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", padding: "20px 40px", borderRadius: radius }}>
        {label}
        <span style={{ fontSize: 26 }}>→</span>
      </span>
    </div>
  );
}

export function radiusFor(art: ArtDirection): number {
  return art.ctaStyle === "pill" ? 999 : art.ctaStyle === "rounded" ? 14 : 6;
}

export function TrustList({ items, color, font, accent }: { items: string[]; color: string; font: string; accent: string }) {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: font }}>
      {items.slice(0, 3).map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 23, fontWeight: 500, color }}>
          <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 999, background: accent, color: pickText(accent), display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900 }}>✓</span>
          {t}
        </div>
      ))}
    </div>
  );
}

// =====================================================================================
// BACKGROUND + FOUNDER
// =====================================================================================

export function Background({ p, t }: { p: LayoutComponentProps; t: Tokens }) {
  const a = p.art;
  if (a.backgroundStyle === "photo-backdrop" && p.bgImageUrl) {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.bgImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  if (a.backgroundStyle === "soft-shapes") {
    return (
      <div style={{ position: "absolute", inset: 0, background: t.paper }}>
        <div style={{ position: "absolute", width: 560, height: 560, borderRadius: 999, background: hexA(a.primaryColor, 0.16), top: -140, right: -120 }} />
        <div style={{ position: "absolute", width: 420, height: 420, borderRadius: 999, background: hexA(a.accentColor, 0.14), bottom: -120, left: -90 }} />
      </div>
    );
  }
  return <div style={{ position: "absolute", inset: 0, background: t.fieldBg }} />;
}

// Solid text panel occupying one side; guarantees contrast over a photo backdrop.
export function SidePanel({ side, widthFrac, bg, diagonal = true }: { side: "left" | "right"; widthFrac: number; bg: string; diagonal?: boolean }) {
  const w = Math.round(widthFrac * CANVAS);
  const clip = !diagonal
    ? undefined
    : side === "left"
    ? "polygon(0 0, 100% 0, calc(100% - 90px) 100%, 0 100%)"
    : "polygon(90px 0, 100% 0, 100% 100%, 0 100%)";
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: w + (diagonal ? 90 : 0),
        background: bg,
        clipPath: clip,
        boxShadow: side === "left" ? "30px 0 60px rgba(0,0,0,0.28)" : "-30px 0 60px rgba(0,0,0,0.28)",
      }}
    />
  );
}

export function FounderCutout({ url, side, zone = 0.52 }: { url?: string; side: "left" | "right" | "center"; zone?: number }) {
  if (!url) return null;
  const pos: React.CSSProperties =
    side === "center"
      ? { left: 0, right: 0, justifyContent: "center" }
      : side === "right"
      ? { right: 0, width: `${zone * 100}%`, justifyContent: "center" }
      : { left: 0, width: `${zone * 100}%`, justifyContent: "center" };
  return (
    <div style={{ position: "absolute", top: 0, bottom: 0, display: "flex", alignItems: "flex-end", ...pos }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        style={{
          height: side === "center" ? "96%" : "100%",
          maxWidth: "100%",
          objectFit: "contain",
          objectPosition: "bottom",
          filter: "drop-shadow(0 16px 36px rgba(0,0,0,0.45))",
        }}
      />
    </div>
  );
}

// Strong top+bottom darkening for centered-portrait text legibility.
export function VerticalScrim() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(8,10,14,0.82) 0%, rgba(8,10,14,0.15) 26%, rgba(8,10,14,0.05) 50%, rgba(8,10,14,0.55) 74%, rgba(8,10,14,0.9) 100%)",
      }}
    />
  );
}

export function Stars({ color }: { color: string }) {
  return <div style={{ color, fontSize: 28, letterSpacing: 4 }}>★★★★★</div>;
}

export type { EditableText };
