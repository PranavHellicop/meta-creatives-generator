// Centralized env/config. Image model + quality are swappable here without touching pipeline code.

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  get openaiApiKey() {
    return required("OPENAI_API_KEY");
  },
  reasoningModel: process.env.REASONING_MODEL || "gpt-4o-mini",
  imageModel: process.env.IMAGE_MODEL || "gpt-image-1",
  imageQuality: (process.env.IMAGE_QUALITY || "low") as "low" | "medium" | "high",
  dataDir: process.env.DATA_DIR || "data",
  appUrl: process.env.APP_URL || "http://localhost:3000",

  // Canva Connect API ("Export to Canva"). Optional — the feature is hidden if unset.
  canva: {
    get configured() {
      return Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);
    },
    get clientId() {
      return required("CANVA_CLIENT_ID");
    },
    get clientSecret() {
      return required("CANVA_CLIENT_SECRET");
    },
    // Optional explicit override (e.g. production behind a proxy). When unset, the
    // redirect URI is derived from the actual request origin at runtime so the
    // OAuth flow works on whatever host/port the app is currently served on.
    redirectUriOverride: process.env.CANVA_REDIRECT_URI || undefined,
  },
};
