import crypto from "crypto";
import { prisma } from "@/lib/db";
import { config } from "@/lib/env";

// ── Canva Connect API ──────────────────────────────────────────────────────────
// OAuth 2.0 Authorization Code + PKCE (S256). Docs: https://www.canva.dev/docs/connect/
// Flow for "Export to Canva": authorize → upload the PNG as an asset → create a
// 1080×1080 design from that asset → open the design's edit_url in Canva.

const AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize";
const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const API_BASE = "https://api.canva.com/rest/v1";

// asset:write → upload assets; asset:read → poll the upload job for the asset id;
// design:content:write → create designs from them.
export const CANVA_SCOPES = ["asset:read", "asset:write", "design:content:write"];

// ── PKCE helpers ────────────────────────────────────────────────────────────────

export function createPkce(): { verifier: string; challenge: string } {
  // Verifier: 43–128 chars from the unreserved set. base64url of 64 random bytes fits.
  const verifier = crypto.randomBytes(64).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function randomState(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.canva.clientId,
    scope: CANVA_SCOPES.join(" "),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    redirect_uri: config.canva.redirectUri,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

// ── Token endpoint ──────────────────────────────────────────────────────────────

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number; // seconds
  scope?: string;
};

function basicAuthHeader(): string {
  const creds = `${config.canva.clientId}:${config.canva.clientSecret}`;
  return `Basic ${Buffer.from(creds).toString("base64")}`;
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canva token request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
  return postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: config.canva.redirectUri,
    })
  );
}

async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  );
}

// ── Token persistence (single-row CanvaAuth) ────────────────────────────────────

async function saveTokens(t: TokenResponse): Promise<void> {
  const expiresAt = new Date(Date.now() + t.expires_in * 1000);
  await prisma.canvaAuth.upsert({
    where: { id: "canva" },
    create: {
      id: "canva",
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt,
      scope: t.scope ?? null,
    },
    update: {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt,
      scope: t.scope ?? null,
    },
  });
}

/** Persist the tokens obtained from the OAuth callback. */
export async function storeInitialTokens(t: TokenResponse): Promise<void> {
  await saveTokens(t);
}

/** True if we have stored Canva tokens (the user has connected at least once). */
export async function isCanvaConnected(): Promise<boolean> {
  const row = await prisma.canvaAuth.findUnique({ where: { id: "canva" } });
  return Boolean(row);
}

/** Forget the stored tokens (e.g. after a scope change) so the next export re-authorizes. */
export async function clearStoredTokens(): Promise<void> {
  await prisma.canvaAuth.deleteMany({ where: { id: "canva" } });
}

/**
 * Return a valid access token, transparently refreshing if it is expired or about
 * to expire. Returns null if the user has never connected. Canva rotates refresh
 * tokens on every refresh, so the new refresh token is persisted.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const row = await prisma.canvaAuth.findUnique({ where: { id: "canva" } });
  if (!row) return null;

  const bufferMs = 60_000; // refresh a minute early
  if (row.expiresAt.getTime() - Date.now() > bufferMs) {
    return row.accessToken;
  }

  const refreshed = await refreshTokens(row.refreshToken);
  await saveTokens(refreshed);
  return refreshed.access_token;
}

// ── Asset upload + design creation ──────────────────────────────────────────────

/**
 * Upload PNG bytes as a Canva asset. Returns the asset id once the async upload job
 * completes. Polls the job until it reaches `success`.
 */
export async function uploadAsset(accessToken: string, bytes: Buffer, name: string): Promise<string> {
  const safeName = name.slice(0, 50); // Canva caps the unencoded name at 50 chars
  const metadata = JSON.stringify({ name_base64: Buffer.from(safeName).toString("base64") });

  const createRes = await fetch(`${API_BASE}/asset-uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": metadata,
    },
    body: new Uint8Array(bytes),
  });
  if (!createRes.ok) {
    throw new Error(`Canva asset upload failed (${createRes.status}): ${await createRes.text()}`);
  }

  let job = (await createRes.json()).job as { id: string; status: string; asset?: { id: string }; error?: { message: string } };

  // Poll until the upload job finishes.
  for (let attempt = 0; attempt < 30 && job.status === "in_progress"; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollRes = await fetch(`${API_BASE}/asset-uploads/${job.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!pollRes.ok) {
      throw new Error(`Canva asset poll failed (${pollRes.status}): ${await pollRes.text()}`);
    }
    job = (await pollRes.json()).job;
  }

  if (job.status !== "success" || !job.asset?.id) {
    throw new Error(`Canva asset upload did not succeed: ${job.error?.message ?? job.status}`);
  }
  return job.asset.id;
}

/**
 * Create a 1080×1080 design from an uploaded asset. Returns the editable design URL
 * (valid ~30 days) that opens the asset in the Canva editor.
 */
export async function createDesignFromAsset(
  accessToken: string,
  assetId: string,
  title: string
): Promise<{ editUrl: string; designId: string }> {
  const res = await fetch(`${API_BASE}/designs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "type_and_asset", // required discriminator when creating a design from an asset
      design_type: { type: "custom", width: 1080, height: 1080 },
      asset_id: assetId,
      title: title.slice(0, 255),
    }),
  });
  if (!res.ok) {
    throw new Error(`Canva create-design failed (${res.status}): ${await res.text()}`);
  }
  const { design } = (await res.json()) as { design: { id: string; urls: { edit_url: string } } };
  return { editUrl: design.urls.edit_url, designId: design.id };
}
