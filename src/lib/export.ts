import { chromium, type Browser } from "playwright";
import { config } from "@/lib/env";

// Reuse a single browser across a batch for speed.
let _browser: Browser | null = null;
async function getBrowser(): Promise<Browser> {
  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({ args: ["--no-sandbox"] });
  }
  return _browser;
}

export async function closeBrowser() {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

// Render /render/<creativeId> and screenshot the 1080×1080 canvas as PNG bytes.
export async function renderCreativePng(creativeId: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  try {
    await page.goto(`${config.appUrl}/render/${creativeId}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    // Ensure web fonts + images are fully ready before capture.
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) =>
          img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); })
        )
      );
    });
    const el = await page.waitForSelector("#creative-canvas", { timeout: 10000 });
    const buf = await el.screenshot({ type: "png" });
    return buf;
  } finally {
    await page.close();
  }
}
