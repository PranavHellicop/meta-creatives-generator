import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "@/lib/storage";
import {
  getValidAccessToken,
  uploadAsset,
  createDesignFromAsset,
  clearStoredTokens,
} from "@/lib/canva/client";
import { config } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 120;

// Export a finished creative PNG to Canva: upload it as an asset, create a 1080×1080
// design from it, and return the editable Canva URL. If the user hasn't connected
// Canva yet, respond { needsAuth: true } so the client can kick off the OAuth flow.
export async function POST(_req: Request, { params }: { params: Promise<{ cid: string }> }) {
  if (!config.canva.configured) {
    return NextResponse.json({ error: "Canva is not configured" }, { status: 501 });
  }

  const { cid } = await params;
  const creative = await prisma.creative.findUnique({
    where: { id: cid },
    include: { project: true },
  });
  if (!creative) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!creative.finalPngPath) {
    return NextResponse.json({ error: "No image to export yet" }, { status: 400 });
  }

  const token = await getValidAccessToken();
  if (!token) return NextResponse.json({ needsAuth: true });

  try {
    const bytes = await readFile(creative.finalPngPath);
    const name = `${creative.project.name} #${creative.index}`;
    const assetId = await uploadAsset(token, bytes, name);
    const { editUrl } = await createDesignFromAsset(token, assetId, name);
    return NextResponse.json({ editUrl });
  } catch (err) {
    console.error("[canva] export failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    // If the stored token lacks a required scope or is unauthorized, forget it and
    // ask the client to re-authorize (e.g. after we add a scope like asset:read).
    if (/missing_scope|invalid_scope|\b401\b|\b403\b|unauthor/i.test(msg)) {
      await clearStoredTokens();
      return NextResponse.json({ needsAuth: true });
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
