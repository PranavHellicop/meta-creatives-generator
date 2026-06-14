// Parsing helpers for user-provided ad copy (headline file + CTA text field).
// Shared by the new-project form (live preview), the projects API (authoritative
// parse), and the pipeline orchestrator (CTA distribution).

// One headline option per non-empty line. Tolerant of common markdown: strips
// leading bullets (- * +), numbering (1. / 1)), heading marks (#), and blockquotes
// (>). Skips blank lines and horizontal rules (---, ***, ___).
export function parseHeadlineMarkdown(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*>+\s?/, "") // blockquote
        .replace(/^\s*#{1,6}\s+/, "") // heading
        .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "") // bullet / numbered list
        .trim()
    )
    .filter((line) => line.length > 0 && !/^[-*_]{3,}$/.test(line)); // drop empties + rules
}

// Comma-separated CTA options → trimmed, non-empty list.
export function parseCtaList(text: string): string[] {
  return text
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

// Build the set of CTA "variants" to spread across ads:
//   []        -> []                      (no override; AI writes the CTA)
//   [a]       -> [[a]]                    (single CTA used on every ad)
//   [a,b,...] -> [[a],[b],...,[a,b,...]]  (each single, plus the full combo)
// The orchestrator cycles these across creatives by index.
//
// `allowCombined` gates the all-in-one combo variant. The combo only makes sense
// when the CTAs are DISTINCT, COMPLEMENTARY actions; for synonymous CTAs (e.g.
// "Book Your Free Assessment" + "Claim Your Free Consultation") showing both on
// one ad is redundant and cluttered, so the orchestrator passes false and we emit
// singles only. (An LLM makes that judgment — see assessCtaCombinable.)
export function buildCtaVariants(ctas: string[], allowCombined = true): string[][] {
  if (ctas.length === 0) return [];
  if (ctas.length === 1) return [[ctas[0]]];
  const singles = ctas.map((c) => [c]);
  return allowCombined ? [...singles, [...ctas]] : singles;
}
