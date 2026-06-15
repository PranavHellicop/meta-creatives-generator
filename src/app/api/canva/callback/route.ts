import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  storeInitialTokens,
  originFromRequest,
  redirectUriFromRequest,
} from "@/lib/canva/client";

export const runtime = "nodejs";

const COOKIES = ["canva_pkce_verifier", "canva_oauth_state", "canva_return_to", "canva_redirect_uri"];

function clearCookies(res: NextResponse) {
  for (const name of COOKIES) res.cookies.set(name, "", { path: "/", maxAge: 0 });
}

// Canva redirects here after consent. Validate state, exchange the code for tokens,
// persist them, then bounce back to the page the user started from.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const verifier = req.cookies.get("canva_pkce_verifier")?.value;
  const savedState = req.cookies.get("canva_oauth_state")?.value;
  const returnToRaw = req.cookies.get("canva_return_to")?.value || "/";
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/";
  // The exact redirect URI used at authorize time (must match for token exchange);
  // fall back to deriving from this request's origin.
  const redirectUri = req.cookies.get("canva_redirect_uri")?.value || redirectUriFromRequest(req);

  const back = (status: "connected" | "error") => {
    // Return to the same origin the user is on, not a hardcoded one.
    const dest = new URL(returnTo, originFromRequest(req));
    dest.searchParams.set("canva", status);
    const res = NextResponse.redirect(dest);
    clearCookies(res);
    return res;
  };

  if (oauthError || !code || !state || !verifier || !savedState || state !== savedState) {
    return back("error");
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier, redirectUri);
    await storeInitialTokens(tokens);
  } catch (err) {
    console.error("[canva] token exchange failed:", err);
    return back("error");
  }

  return back("connected");
}
