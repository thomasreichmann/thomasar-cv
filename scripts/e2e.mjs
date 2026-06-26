#!/usr/bin/env node
/**
 * Local e2e orchestration: bring up the throwaway Postgres, migrate it, run
 * Playwright, then tear the database down. CI does these as separate workflow
 * steps against a service container, so this is local-only convenience. Every
 * child process inherits apps/web/.env.e2e, so the whole run points at the
 * ephemeral database and never touches the shared Supabase project.
 *
 * Everything after the script name is forwarded to Playwright, so its native
 * test selection is the whole interface (see apps/web/e2e/README.md for the
 * matrix). Two flags are consumed here instead of forwarded:
 *   --keep   leave the database up after the run (also E2E_KEEP_DB=1). The next
 *            run reuses it, skipping the cold container start - the fast path for
 *            iterating on a single spec. Safe because the `setup` project resets
 *            the database at the start of every run.
 *   --list   list matching tests without a database or server (Playwright's
 *            --list needs neither), so test discovery is instant.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compose = ["compose", "-f", "docker-compose.e2e.yml"];

// Load .env.e2e without overriding anything already set, so a value you exported
// (or CI's preset env) wins. Minimal parser: KEY=VALUE lines, # comments.
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line.trimStart().startsWith("#")) continue;
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    env: process.env,
  });
  if (result.status !== 0) {
    throw Object.assign(
      new Error(`${cmd} ${args.join(" ")} exited ${result.status}`),
      {
        code: result.status ?? 1,
      },
    );
  }
}

// Split our flags out of the args bound for Playwright.
const passthrough = process.argv.slice(2).filter((a) => a !== "--keep");
const keep = process.env.E2E_KEEP_DB === "1" || process.argv.includes("--keep");
const listOnly = passthrough.includes("--list");

loadEnv(resolve(root, "apps/web/.env.e2e"));

// `exec` runs Playwright's binary directly, so every passthrough arg reaches it
// verbatim. `run test:e2e -- <args>` would forward the `--` literally (pnpm
// recursive-run quirk), which Playwright then parses as a positional filter and
// silently mis-selects - the reason flag selection is done this way.
const playwright = ["--filter", "web", "exec", "playwright", "test"];

// Listing parses spec files only - no database, no server - so skip the whole
// container lifecycle and hand straight to Playwright.
if (listOnly) {
  const result = spawnSync("pnpm", [...playwright, ...passthrough], {
    stdio: "inherit",
    cwd: root,
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

// This wrapper is local-only (CI runs Playwright directly, bypassing it), so the
// database must be the throwaway Postgres on localhost. Refuse otherwise: an
// exported DATABASE_URL aimed at the shared Supabase project would be migrated and
// then truncated by this run (the `setup` project resets whatever DATABASE_URL
// resolves to). loadEnv has already applied apps/web/.env.e2e, so a non-local host
// here means something overrode it.
const dbHost = (
  process.env.DATABASE_URL?.match(/@([^:/?]+)/)?.[1] ?? ""
).toLowerCase();
if (dbHost !== "localhost" && dbHost !== "127.0.0.1") {
  console.error(
    `Refusing to run: e2e must target the throwaway Postgres on localhost, but DATABASE_URL resolves to "${dbHost || "(unset)"}". Unset DATABASE_URL so apps/web/.env.e2e applies.`,
  );
  process.exit(1);
}

// Fail fast with an actionable message instead of a raw compose error when Docker
// is unavailable - the one prerequisite this script can't provide.
const dockerInfo = spawnSync("docker", ["info"], { stdio: "ignore" });
if (dockerInfo.status !== 0) {
  console.error(
    dockerInfo.error?.code === "ENOENT"
      ? "Docker CLI not found. Install Docker, then re-run."
      : "Docker isn't running. Start Docker Desktop (or your daemon), then re-run.",
  );
  process.exit(1);
}

let exitCode = 0;
try {
  // `up --wait` is a fast no-op when the container is already healthy (the --keep
  // reuse path); migrate is idempotent, so running it every time costs nothing and
  // guarantees a reused database has any new migration applied.
  run("docker", [...compose, "up", "-d", "--wait"]);
  run("pnpm", ["--filter", "@thomasar-cv/db", "db:migrate"]);
  run("pnpm", [...playwright, ...passthrough]);
} catch (error) {
  exitCode = error.code ?? 1;
  console.error(error.message);
} finally {
  // Tear the database down so the next run starts clean and no container lingers,
  // unless --keep was asked for (leave it up for a fast next run). Ignore teardown
  // failure so it can't mask a real test result.
  if (!keep) {
    spawnSync("docker", [...compose, "down"], { stdio: "inherit", cwd: root });
  } else {
    console.log(
      "\nKept the e2e database up (--keep). Re-run reuses it; `docker compose -f docker-compose.e2e.yml down` stops it.",
    );
  }
}

process.exit(exitCode);
