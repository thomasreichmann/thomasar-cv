import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// tooling/capture/src/paths.ts -> the repo root is three directories up.
const here = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = resolve(here, "../../..");
/** Where finished GIF / MP4 files land; the README and docs reference this dir. */
export const ASSETS_DIR = resolve(REPO_ROOT, "docs/assets");
/** Scratch space for raw video, palettes, and saved auth state (git-ignored). */
export const TMP_DIR = resolve(here, "..", ".tmp");
/** The web app's env: read only to learn the dev-login account's email. */
export const WEB_ENV = resolve(REPO_ROOT, "apps/web/.env.local");
/** The db package's env: the same DATABASE_URL drizzle migrations use. */
export const DB_ENV = resolve(REPO_ROOT, "packages/db/.env");
