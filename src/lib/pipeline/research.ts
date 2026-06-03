import * as cheerio from "cheerio";

export interface ResearchResult {
  text: string; // truncated readable text for the LLM
  colors: string[]; // hex colors found in the page (theme-color, inline styles)
  fetched: boolean;
}

const MAX_TEXT = 6000;

// Fetch + parse the business website. Best-effort: failures degrade gracefully.
export async function researchWebsite(url?: string | null): Promise<ResearchResult> {
  if (!url) return { text: "", colors: [], fetched: false };

  const target = url.startsWith("http") ? url : `https://${url}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(target, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MCG/1.0)" },
    });
    clearTimeout(t);
    if (!res.ok) return { text: "", colors: [], fetched: false };

    const html = await res.text();
    const $ = cheerio.load(html);

    $("script, style, noscript, svg").remove();

    const parts: string[] = [];
    const title = $("title").text().trim();
    const desc = $('meta[name="description"]').attr("content")?.trim();
    if (title) parts.push(`TITLE: ${title}`);
    if (desc) parts.push(`DESCRIPTION: ${desc}`);

    $("h1, h2, h3").each((_, el) => {
      const t = $(el).text().trim().replace(/\s+/g, " ");
      if (t) parts.push(`HEADING: ${t}`);
    });
    $("p, li").each((_, el) => {
      const t = $(el).text().trim().replace(/\s+/g, " ");
      if (t && t.length > 20) parts.push(t);
    });

    // Color hints: theme-color meta + hex colors in inline styles.
    const colors = new Set<string>();
    const theme = $('meta[name="theme-color"]').attr("content");
    if (theme) colors.add(theme);
    const hexRe = /#[0-9a-fA-F]{6}/g;
    (html.match(hexRe) ?? []).slice(0, 40).forEach((c) => colors.add(c.toLowerCase()));

    return {
      text: parts.join("\n").slice(0, MAX_TEXT),
      colors: Array.from(colors).slice(0, 12),
      fetched: parts.length > 0,
    };
  } catch (err) {
    console.error("[research] fetch failed:", err);
    return { text: "", colors: [], fetched: false };
  }
}
