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
  // Base URL the server uses to reach its own /render route for Playwright export.
  appUrl: process.env.APP_URL || "http://localhost:3000",
  // Founder mode: generate an AI photo backdrop behind the cutout (premium environments).
  // Default on. Set FOUNDER_AI_BACKDROP=false to use clean CSS brand-color backgrounds instead.
  founderAiBackdrop: process.env.FOUNDER_AI_BACKDROP !== "false",
};
