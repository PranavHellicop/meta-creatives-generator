import { NextResponse } from "next/server";
import { buildAuthorizeUrl, createPkce, randomState, redirectUriFromRequest } from "@/lib/canva/client";
import { config } from "@/lib/env";

export const runtime = "nodejs";

// Start the Canva OAuth flow: stash PKCE verifier + state + return path in httpOnly
// cookies, then redirect the user to Canva's consent screen.
export async function GET(req: Request) {
  if (!config.canva.configured) {
    return NextResponse.json({ error: "Canva is not configured" }, { status: 501 });
  }

  const url = new URL(req.url);
  const returnToRaw = url.searchParams.get("returnTo") || "/";
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/"; // guard open redirect

  const { verifier, challenge } = createPkce();
  const state = randomState();
  // Derived from the live request origin so OAuth adapts to whatever port/host the
  // app runs on. Stashed in a cookie so the callback exchanges with the identical URI.
  const redirectUri = redirectUriFromRequest(req);

  const res = NextResponse.redirect(buildAuthorizeUrl(state, challenge, redirectUri));
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: redirectUri.startsWith("https"),
    path: "/",
    maxAge: 600, // 10 minutes to complete consent
  };
  res.cookies.set("canva_pkce_verifier", verifier, opts);
  res.cookies.set("canva_oauth_state", state, opts);
  res.cookies.set("canva_return_to", returnTo, opts);
  res.cookies.set("canva_redirect_uri", redirectUri, opts);
  return res;
}
