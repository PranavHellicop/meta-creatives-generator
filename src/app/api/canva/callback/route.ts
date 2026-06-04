import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, storeInitialTokens } from "@/lib/canva/client";
import { config } from "@/lib/env";

export const runtime = "nodejs";

const COOKIES = ["canva_pkce_verifier", "canva_oauth_state", "canva_return_to"];

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

  const back = (status: "connected" | "error") => {
    const dest = new URL(returnTo, config.appUrl);
    dest.searchParams.set("canva", status);
    const res = NextResponse.redirect(dest);
    clearCookies(res);
    return res;
  };

  if (oauthError || !code || !state || !verifier || !savedState || state !== savedState) {
    return back("error");
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier);
    await storeInitialTokens(tokens);
  } catch (err) {
    console.error("[canva] token exchange failed:", err);
    return back("error");
  }

  return back("connected");
}
