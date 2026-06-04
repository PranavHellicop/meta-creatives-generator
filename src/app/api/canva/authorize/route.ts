import { NextResponse } from "next/server";
import { buildAuthorizeUrl, createPkce, randomState } from "@/lib/canva/client";
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

  const res = NextResponse.redirect(buildAuthorizeUrl(state, challenge));
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.appUrl.startsWith("https"),
    path: "/",
    maxAge: 600, // 10 minutes to complete consent
  };
  res.cookies.set("canva_pkce_verifier", verifier, opts);
  res.cookies.set("canva_oauth_state", state, opts);
  res.cookies.set("canva_return_to", returnTo, opts);
  return res;
}
