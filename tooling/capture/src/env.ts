import { existsSync, readFileSync } from "node:fs";

/**
 * Read KEY=VALUE pairs from a dotenv-style file. Minimal on purpose - `#`
 * comments, no interpolation, strips one layer of surrounding quotes - matching
 * the parser scripts/e2e.mjs and the Playwright config already use, so the
 * capture tool reads env the same way the rest of the repo does. Missing file
 * yields an empty map rather than throwing, so callers decide what is required.
 */
export function readEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line.trimStart().startsWith("#")) continue;
    const match = /^\s*([\w.]+)\s*=\s*(.*?)\s*$/.exec(line);
    const key = match?.[1];
    if (!key) continue;
    let value = match[2] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}
