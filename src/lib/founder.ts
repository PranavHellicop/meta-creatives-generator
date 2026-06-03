// Founder photo background removal (local, no API key).
// @imgly decodes via `sharp`, but ONLY if the Blob carries an explicit MIME type —
// an untyped Blob throws "Unsupported format:". So we always pass a typed Blob.
// On any failure we fall back to the original image so the pipeline never hard-stops.

export async function removeFounderBackground(
  input: Buffer,
  mime = "image/jpeg"
): Promise<{ png: Buffer; removed: boolean }> {
  try {
    const { removeBackground } = await import("@imgly/background-removal-node");
    const blob = new Blob([new Uint8Array(input)], { type: mime });
    const out = await removeBackground(blob, { output: { format: "image/png" } });
    const arrayBuf = await out.arrayBuffer();
    return { png: Buffer.from(arrayBuf), removed: true };
  } catch (err) {
    console.error("[founder] background removal failed, using original:", err);
    return { png: input, removed: false };
  }
}
