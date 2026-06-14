import OpenAI, { toFile } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { config } from "@/lib/env";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: config.openaiApiKey });
  return _client;
}

/**
 * Structured completion: returns a typed object validated against a zod schema.
 * Uses OpenAI structured outputs so the model is constrained to the schema.
 */
export async function complete<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  schemaName: string;
  temperature?: number;
}): Promise<T> {
  const res = await client().beta.chat.completions.parse({
    model: config.reasoningModel,
    temperature: opts.temperature ?? 0.8,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    response_format: zodResponseFormat(opts.schema, opts.schemaName),
  });
  const parsed = res.choices[0]?.message?.parsed;
  if (!parsed) throw new Error("OpenAI returned no parsed content");
  return parsed;
}

/**
 * Generate a backdrop image. Returns raw PNG bytes.
 * The prompt must describe imagery ONLY — never headline/offer/CTA text.
 */
export async function generateImage(prompt: string): Promise<Buffer> {
  const model = config.imageModel;
  const params: Record<string, unknown> = {
    model,
    prompt,
    size: "1024x1024",
    n: 1,
  };
  // gpt-image-1 supports quality + returns b64 by default; dall-e-2 ignores quality.
  if (model.startsWith("gpt-image")) {
    params.quality = config.imageQuality;
  } else {
    params.response_format = "b64_json";
  }

  const res = await client().images.generate(params as never);
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image model returned no image data");
  return Buffer.from(b64, "base64");
}

/**
 * Edit/compose an image from one or more reference images + a prompt.
 * Used in founder mode: the real uploaded founder photo(s) are passed so the
 * image model integrates the actual person (and removes/replaces their background itself)
 * rather than inventing a fictional one. Requires a gpt-image-* model (dall-e-2 edit needs a mask).
 * Returns raw PNG bytes.
 */
export async function editImage(
  prompt: string,
  references: { bytes: Buffer; mime: string }[]
): Promise<Buffer> {
  const model = config.imageModel;
  const files = await Promise.all(
    references.map((r, i) =>
      toFile(r.bytes, `founder-${i}.${r.mime === "image/png" ? "png" : "jpg"}`, { type: r.mime })
    )
  );

  const params: Record<string, unknown> = {
    model,
    prompt,
    // gpt-image models accept an array of reference images; single image also fine.
    image: files.length === 1 ? files[0] : files,
    size: "1024x1024",
    n: 1,
  };
  if (model.startsWith("gpt-image")) {
    params.quality = config.imageQuality;
  }

  const res = await client().images.edit(params as never);
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image edit returned no image data");
  return Buffer.from(b64, "base64");
}

/**
 * Vision scoring of a finished creative PNG. Returns a typed score object.
 */
/**
 * Multi-image vision completion: feed several reference images plus a prompt and
 * get back a typed object. Used to distill structural/layout patterns from a
 * folder of example ad creatives.
 */
export async function analyzeImages<T>(opts: {
  system: string;
  user: string;
  images: { base64: string; mime: string }[];
  schema: z.ZodType<T>;
  schemaName: string;
}): Promise<T> {
  const res = await client().beta.chat.completions.parse({
    model: config.reasoningModel,
    temperature: 0.3,
    messages: [
      { role: "system", content: opts.system },
      {
        role: "user",
        content: [
          { type: "text", text: opts.user },
          ...opts.images.map((img) => ({
            type: "image_url" as const,
            image_url: { url: `data:${img.mime};base64,${img.base64}` },
          })),
        ],
      },
    ],
    response_format: zodResponseFormat(opts.schema, opts.schemaName),
  });
  const parsed = res.choices[0]?.message?.parsed;
  if (!parsed) throw new Error("OpenAI returned no parsed analysis");
  return parsed;
}

export async function scoreImage<T>(opts: {
  system: string;
  user: string;
  pngBase64: string;
  schema: z.ZodType<T>;
  schemaName: string;
}): Promise<T> {
  const res = await client().beta.chat.completions.parse({
    model: config.reasoningModel,
    temperature: 0.2,
    messages: [
      { role: "system", content: opts.system },
      {
        role: "user",
        content: [
          { type: "text", text: opts.user },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${opts.pngBase64}` },
          },
        ],
      },
    ],
    response_format: zodResponseFormat(opts.schema, opts.schemaName),
  });
  const parsed = res.choices[0]?.message?.parsed;
  if (!parsed) throw new Error("OpenAI returned no parsed score");
  return parsed;
}
