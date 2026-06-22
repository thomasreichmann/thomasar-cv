#!/usr/bin/env node
/**
 * Local e2e orchestration: bring up the throwaway Postgres, migrate it, run
 * Playwright, then tear the database down. CI does these as separate workflow
 * steps against a service container, so this is local-only convenience. Every
 * child process inherits apps/web/.env.e2e, so the whole run points at the
 * ephemeral database and never touches the shared Supabase project.
 *
 * Extra args reach Playwright: `pnpm test:e2e --project=flows -g "save"`.
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
    throw Object.assign(new Error(`${cmd} ${args.join(" ")} exited ${result.status}`), {
      code: result.status ?? 1,
    });
  }
}

loadEnv(resolve(root, "apps/web/.env.e2e"));

let exitCode = 0;
try {
  run("docker", [...compose, "up", "-d", "--wait"]);
  run("pnpm", ["--filter", "@thomasar-cv/db", "db:migrate"]);
  run("pnpm", ["--filter", "web", "run", "test:e2e", "--", ...process.argv.slice(2)]);
} catch (error) {
  exitCode = error.code ?? 1;
  console.error(error.message);
} finally {
  // Always tear the database down so the next run starts clean and no container
  // lingers; ignore teardown failure so it can't mask a real test result.
  spawnSync("docker", [...compose, "down"], { stdio: "inherit", cwd: root });
}

process.exit(exitCode);
