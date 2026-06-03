import { promises as fs } from "fs";
import path from "path";
import { config } from "@/lib/env";

// Absolute root of the data directory (e.g. <project>/data).
export function dataRoot(): string {
  return path.resolve(process.cwd(), config.dataDir);
}

// Resolve a relative data path (stored in DB) to an absolute path, guarding traversal.
export function resolveDataPath(relPath: string): string {
  const abs = path.resolve(dataRoot(), relPath);
  if (!abs.startsWith(dataRoot())) throw new Error("Path traversal blocked");
  return abs;
}

// Save bytes under data/<relPath>, creating dirs. Returns the relative path.
export async function saveFile(relPath: string, data: Buffer): Promise<string> {
  const abs = resolveDataPath(relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
  return relPath;
}

export async function readFile(relPath: string): Promise<Buffer> {
  return fs.readFile(resolveDataPath(relPath));
}

// Public URL (served by /api/files route) for a stored relative path.
export function fileUrl(relPath: string): string {
  return `/api/files/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}
