import type { ComponentType } from "react";
import type { LayoutType } from "@/lib/types";
import {
  CANVAS,
  PAD,
  Background,
  SidePanel,
  FounderCutout,
  VerticalScrim,
  Kicker,
  Headline,
  Sub,
  Chip,
  CTA,
  TrustList,
  Stars,
  fonts,
  fitHeadline,
  tokens,
  radiusFor,
  pickText,
  hexA,
  darken,
  type LayoutComponentProps,
  type Tokens,
} from "./shared";

function Frame({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// =====================================================================================
// FOUNDER LAYOUTS — solid contrast-safe panel on one side, real person on the other.
// =====================================================================================

function FounderSide({ p, personSide }: { p: LayoutComponentProps; personSide: "left" | "right" }) {
  const t = tokens(p);
  const f = fonts(p.art);
  const textSide = personSide === "right" ? "left" : "right";
  const personFrac = p.art.founderZone ?? 0.5;
  const panelFrac = 1 - personFrac;
  const colW = Math.round(panelFrac * CANVAS) - PAD * 2;
  const hSize = fitHeadline(p.text.headline, colW, 320, f, 76, 40);

  return (
    <Frame>
      <Background p={p} t={t} />
      <FounderCutout url={p.founderCutoutUrl} side={personSide} zone={personFrac} />
      <SidePanel side={textSide} widthFrac={panelFrac} bg={t.panelBg} />
      <div
        style={{
          position: "absolute",
          top: PAD, bottom: PAD, [textSide]: PAD,
          width: colW,
          display: "flex", flexDirection: "column", justifyContent: "center", gap: 22,
        }}
      >
        <Kicker label={p.brandName} color={t.kicker} font={f.body} />
        <Headline text={p.text.headline} size={hSize} color={t.panelText} f={f} />
        <Sub text={p.text.subheadline} color={t.panelSub} font={f.body} />
        {p.text.offer && <Chip text={p.text.offer} bg={t.chipBg} color={t.chipText} font={f.body} />}
        <div style={{ marginTop: 4 }}>
          <CTA label={p.text.cta} bg={t.ctaBg} color={t.ctaText} font={f.body} radius={radiusFor(p.art)} />
        </div>
        {p.trustElements.length > 0 && <TrustList items={p.trustElements} color={t.panelSub} font={f.body} accent={t.accent} />}
      </div>
    </Frame>
  );
}

const FounderRight = (p: LayoutComponentProps) => <FounderSide p={p} personSide="right" />;
const FounderLeft = (p: LayoutComponentProps) => <FounderSide p={p} personSide="left" />;

const CenteredPortrait = (p: LayoutComponentProps) => {
  const t = tokens(p);
  const f = fonts(p.art);
  const colW = CANVAS - PAD * 2;
  const hSize = fitHeadline(p.text.headline, colW, 220, f, 74, 40);
  return (
    <Frame>
      <Background p={p} t={t} />
      <FounderCutout url={p.founderCutoutUrl} side="center" zone={0.62} />
      <VerticalScrim />
      <div style={{ position: "absolute", top: PAD, left: PAD, right: PAD, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Kicker label={p.brandName} color={t.accent} font={f.body} />
        <Headline text={p.text.headline} size={hSize} color="#ffffff" f={f} align="center" />
      </div>
      <div style={{ position: "absolute", bottom: PAD, left: PAD, right: PAD, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <Sub text={p.text.subheadline} color="rgba(255,255,255,0.92)" font={f.body} align="center" />
        {p.text.offer && <Chip text={p.text.offer} bg={t.chipBg} color={t.chipText} font={f.body} />}
        <CTA label={p.text.cta} bg={t.accent} color={pickText(t.accent)} font={f.body} radius={radiusFor(p.art)} align="center" />
      </div>
    </Frame>
  );
};

const Authority = (p: LayoutComponentProps) => {
  const t = tokens(p);
  const f = fonts(p.art);
  const personFrac = p.art.founderZone ?? 0.5;
  const panelFrac = 1 - personFrac;
  const colW = Math.round(panelFrac * CANVAS) - PAD * 2;
  const hSize = fitHeadline(p.text.headline, colW, 280, f, 70, 38);
  const proof = (p.socialProofElements.length ? p.socialProofElements : p.trustElements).slice(0, 3);
  return (
    <Frame>
      <Background p={p} t={t} />
      <FounderCutout url={p.founderCutoutUrl} side="right" zone={personFrac} />
      <SidePanel side="left" widthFrac={panelFrac} bg={t.panelBg} />
      <div style={{ position: "absolute", top: PAD, left: PAD, width: colW, display: "flex", flexDirection: "column", gap: 18 }}>
        <Kicker label={p.brandName} color={t.kicker} font={f.body} />
        <Headline text={p.text.headline} size={hSize} color={t.panelText} f={f} />
        <Sub text={p.text.subheadline} color={t.panelSub} font={f.body} />
      </div>
      <div style={{ position: "absolute", bottom: PAD, left: PAD, width: colW, display: "flex", flexDirection: "column", gap: 18 }}>
        {proof.length > 0 && <TrustList items={proof} color={t.panelText} font={f.body} accent={t.accent} />}
        <CTA label={p.text.cta} bg={t.ctaBg} color={t.ctaText} font={f.body} radius={radiusFor(p.art)} />
      </div>
    </Frame>
  );
};

const Testimonial = (p: LayoutComponentProps) => {
  const t = tokens(p);
  const f = fonts(p.art);
  const personFrac = p.art.founderZone ?? 0.48;
  const panelFrac = 1 - personFrac;
  const colW = Math.round(panelFrac * CANVAS) - PAD * 2;
  const hSize = fitHeadline(p.text.headline, colW, 180, f, 60, 36);
  const quote = p.socialProofElements[0] || p.text.supportingCopy;
  return (
    <Frame>
      <Background p={p} t={t} />
      <FounderCutout url={p.founderCutoutUrl} side="right" zone={personFrac} />
      <SidePanel side="left" widthFrac={panelFrac} bg={t.panelBg} />
      <div style={{ position: "absolute", top: PAD, bottom: PAD, left: PAD, width: colW, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
        <Kicker label={p.brandName} color={t.kicker} font={f.body} />
        <Headline text={p.text.headline} size={hSize} color={t.panelText} f={f} />
        <div style={{ background: "#ffffff", color: "#14171c", borderRadius: 16, padding: 26, boxShadow: "0 14px 34px rgba(0,0,0,0.32)" }}>
          <Stars color={t.accent} />
          <div style={{ fontFamily: f.body, fontSize: 25, marginTop: 10, fontStyle: "italic", lineHeight: 1.34 }}>“{quote}”</div>
        </div>
        <CTA label={p.text.cta} bg={t.ctaBg} color={t.ctaText} font={f.body} radius={radiusFor(p.art)} />
      </div>
    </Frame>
  );
};

// =====================================================================================
// BANNER LAYOUTS — no people; typography, shapes, stats, offer blocks.
// =====================================================================================

const OfferCard = (p: LayoutComponentProps) => {
  const t = tokens(p);
  const f = fonts(p.art);
  const colW = CANVAS - PAD * 2;
  const hSize = fitHeadline(p.text.headline, colW, 280, f, 96, 48);
  return (
    <Frame>
      <Background p={p} t={t} />
      <div style={{ position: "absolute", inset: PAD, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center" }}>
        <Kicker label={p.brandName} color={t.fieldKicker} font={f.body} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <Headline text={p.text.headline} size={hSize} color={t.fieldText} f={f} align="center" />
          <Sub text={p.text.subheadline} color={t.fieldSub} font={f.body} align="center" />
          <div style={{ marginTop: 8, background: t.accent, color: pickText(t.accent), fontFamily: f.body, fontSize: 38, fontWeight: 900, padding: "22px 40px", borderRadius: 16, textAlign: "center", maxWidth: colW }}>
            {p.text.offer}
          </div>
        </div>
        <CTA label={p.text.cta} bg={t.fieldText === "#ffffff" ? t.accent : t.ink} color={t.fieldText === "#ffffff" ? pickText(t.accent) : "#fff"} font={f.body} radius={radiusFor(p.art)} align="center" />
      </div>
    </Frame>
  );
};

const CaseStudy = (p: LayoutComponentProps) => {
  const t = tokens(p);
  const f = fonts(p.art);
  const colW = CANVAS - PAD * 2;
  const stat = p.socialProofElements[0] || p.text.offer;
  const hSize = fitHeadline(p.text.headline, colW, 180, f, 62, 38);
  const statSize = fitHeadline(stat, colW, 200, f, 132, 56);
  return (
    <Frame>
      <Background p={p} t={t} />
      <div style={{ position: "absolute", inset: PAD, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
        <Kicker label={p.brandName} color={t.fieldKicker} font={f.body} />
        <div style={{ fontFamily: f.display, fontSize: statSize, fontWeight: 900, lineHeight: 0.95, color: t.accent, letterSpacing: -1 }}>{stat}</div>
        <Headline text={p.text.headline} size={hSize} color={t.fieldText} f={f} />
        <Sub text={p.text.subheadline} color={t.fieldSub} font={f.body} />
        <div style={{ marginTop: 6 }}>
          <CTA label={p.text.cta} bg={t.accent} color={pickText(t.accent)} font={f.body} radius={radiusFor(p.art)} />
        </div>
      </div>
    </Frame>
  );
};

const Transformation = (p: LayoutComponentProps) => {
  const t = tokens(p);
  const f = fonts(p.art);
  const colW = CANVAS - PAD * 2;
  const hSize = fitHeadline(p.text.headline, colW, 180, f, 66, 40);
  const cardText = t.fieldText;
  return (
    <Frame>
      <Background p={p} t={t} />
      <div style={{ position: "absolute", inset: PAD, display: "flex", flexDirection: "column", gap: 28 }}>
        <Kicker label={p.brandName} color={t.fieldKicker} font={f.body} />
        <Headline text={p.text.headline} size={hSize} color={t.fieldText} f={f} />
        <div style={{ display: "flex", alignItems: "stretch", gap: 22 }}>
          <div style={{ flex: 1, background: hexA(cardText, 0.08), border: `2px solid ${hexA(cardText, 0.22)}`, borderRadius: 18, padding: 28 }}>
            <div style={{ fontFamily: f.body, fontSize: 21, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: hexA(cardText, 0.7) }}>Before</div>
            <div style={{ fontFamily: f.body, fontSize: 28, marginTop: 10, color: cardText, lineHeight: 1.3 }}>{p.text.subheadline}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 54, color: t.accent, fontWeight: 900 }}>→</div>
          <div style={{ flex: 1, background: t.accent, color: pickText(t.accent), borderRadius: 18, padding: 28 }}>
            <div style={{ fontFamily: f.body, fontSize: 21, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, opacity: 0.85 }}>After</div>
            <div style={{ fontFamily: f.body, fontSize: 28, marginTop: 10, lineHeight: 1.3 }}>{p.text.supportingCopy}</div>
          </div>
        </div>
        {p.text.offer && <Chip text={p.text.offer} bg={hexA(cardText, 0.12)} color={cardText} font={f.body} />}
        <div style={{ marginTop: "auto" }}>
          <CTA label={p.text.cta} bg={t.accent} color={pickText(t.accent)} font={f.body} radius={radiusFor(p.art)} />
        </div>
      </div>
    </Frame>
  );
};

const Comparison = (p: LayoutComponentProps) => {
  const t = tokens(p);
  const f = fonts(p.art);
  const colW = CANVAS - PAD * 2;
  const hSize = fitHeadline(p.text.headline, colW, 160, f, 60, 38);
  const us = p.trustElements.length ? p.trustElements : [p.text.supportingCopy, p.text.offer].filter(Boolean);
  const cardText = t.fieldText;
  return (
    <Frame>
      <Background p={p} t={t} />
      <div style={{ position: "absolute", inset: PAD, display: "flex", flexDirection: "column", gap: 24 }}>
        <Kicker label={p.brandName} color={t.fieldKicker} font={f.body} />
        <Headline text={p.text.headline} size={hSize} color={t.fieldText} f={f} />
        <div style={{ display: "flex", gap: 20, flex: 1 }}>
          <div style={{ flex: 1, background: hexA(cardText, 0.07), borderRadius: 18, padding: 26 }}>
            <div style={{ fontFamily: f.body, fontSize: 24, fontWeight: 800, color: hexA(cardText, 0.55) }}>The old way</div>
            <div style={{ fontFamily: f.body, fontSize: 25, marginTop: 16, color: hexA(cardText, 0.65), lineHeight: 1.45 }}>✗ {p.text.subheadline}</div>
          </div>
          <div style={{ flex: 1, background: t.accent, color: pickText(t.accent), borderRadius: 18, padding: 26 }}>
            <div style={{ fontFamily: f.body, fontSize: 24, fontWeight: 900 }}>{p.brandName}</div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {us.slice(0, 4).map((it, i) => (<div key={i} style={{ fontFamily: f.body, fontSize: 24, lineHeight: 1.3 }}>✓ {it}</div>))}
            </div>
          </div>
        </div>
        <CTA label={p.text.cta} bg={t.fieldText === "#ffffff" ? t.accent : t.ink} color={t.fieldText === "#ffffff" ? pickText(t.accent) : "#fff"} font={f.body} radius={radiusFor(p.art)} />
      </div>
    </Frame>
  );
};

const MinimalPremium = (p: LayoutComponentProps) => {
  const t = tokens(p);
  const f = fonts(p.art);
  const colW = CANVAS - (PAD + 20) * 2;
  const hSize = fitHeadline(p.text.headline, colW, 360, f, 92, 48);
  return (
    <Frame>
      <Background p={p} t={t} />
      <div style={{ position: "absolute", inset: PAD + 20, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30 }}>
        <Kicker label={p.brandName} color={t.fieldKicker} font={f.body} />
        <Headline text={p.text.headline} size={hSize} color={t.fieldText} f={f} />
        <Sub text={p.text.subheadline} color={t.fieldSub} font={f.body} size={33} />
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 8 }}>
          <CTA label={p.text.cta} bg={t.accent} color={pickText(t.accent)} font={f.body} radius={radiusFor(p.art)} />
          {p.text.offer && <span style={{ fontFamily: f.body, fontSize: 25, fontWeight: 600, color: t.fieldSub }}>{p.text.offer}</span>}
        </div>
      </div>
    </Frame>
  );
};

const Luxury = (p: LayoutComponentProps) => {
  const t = tokens(p);
  const f = fonts(p.art);
  const colW = CANVAS - (PAD + 40) * 2;
  const hSize = fitHeadline(p.text.headline, colW, 260, f, 76, 44);
  const gold = t.accent;
  return (
    <Frame>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${darken(p.art.primaryColor, 0.7)} 0%, #0c0d10 100%)` }} />
      <div style={{ position: "absolute", inset: 38, border: `2px solid ${hexA(gold, 0.7)}`, borderRadius: 4 }} />
      <div style={{ position: "absolute", inset: PAD + 30, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 24 }}>
        <div style={{ fontFamily: f.body, fontSize: 24, letterSpacing: 6, textTransform: "uppercase", color: gold }}>{p.brandName}</div>
        <Headline text={p.text.headline} size={hSize} color="#f6f1e7" f={f} align="center" />
        <div style={{ width: 90, height: 2, background: gold }} />
        <Sub text={p.text.subheadline} color="rgba(246,241,231,0.85)" font={f.body} align="center" />
        {p.text.offer && <div style={{ fontFamily: f.body, fontSize: 26, color: gold, fontWeight: 700 }}>{p.text.offer}</div>}
        <div style={{ marginTop: 8 }}>
          <CTA label={p.text.cta} bg={gold} color={pickText(gold)} font={f.body} radius={radiusFor(p.art)} align="center" />
        </div>
      </div>
    </Frame>
  );
};

const LocalBusiness = (p: LayoutComponentProps) => {
  const t = tokens(p);
  const f = fonts(p.art);
  const colW = CANVAS - PAD * 2;
  const hSize = fitHeadline(p.text.headline, colW, 220, f, 74, 42);
  const tags = (p.trustElements.length ? p.trustElements : [p.text.supportingCopy]).filter(Boolean);
  return (
    <Frame>
      <Background p={p} t={t} />
      <div style={{ position: "absolute", inset: PAD, display: "flex", flexDirection: "column", gap: 22 }}>
        <Kicker label={p.brandName} color={t.fieldKicker} font={f.body} />
        <Headline text={p.text.headline} size={hSize} color={t.fieldText} f={f} />
        <Sub text={p.text.subheadline} color={t.fieldSub} font={f.body} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
          {tags.slice(0, 3).map((tag, i) => (
            <span key={i} style={{ background: hexA(t.fieldText, 0.1), color: t.fieldText, fontFamily: f.body, borderRadius: 999, padding: "12px 20px", fontSize: 22, fontWeight: 600 }}>{tag}</span>
          ))}
        </div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <CTA label={p.text.cta} bg={t.accent} color={pickText(t.accent)} font={f.body} radius={radiusFor(p.art)} />
          {p.text.offer && <Chip text={p.text.offer} bg={hexA(t.fieldText, 0.12)} color={t.fieldText} font={f.body} />}
        </div>
      </div>
    </Frame>
  );
};

export const LAYOUT_REGISTRY: Record<LayoutType, ComponentType<LayoutComponentProps>> = {
  FounderRight,
  FounderLeft,
  CenteredPortrait,
  Authority,
  Testimonial,
  OfferCard,
  CaseStudy,
  Transformation,
  Comparison,
  MinimalPremium,
  Luxury,
  LocalBusiness,
};

// keep Tokens referenced for type-only consumers
export type { Tokens };
