import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";

import { REPO_ROOT } from "./paths";

export interface ServerHandle {
  baseUrl: string;
  stop: () => Promise<void>;
}

async function isUp(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    // A running Next app answers `/` with 200; 404/405 still prove it's listening.
    return res.ok || res.status === 404 || res.status === 405;
  } catch {
    return false;
  }
}

async function waitUntilUp(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function stopChild(child: ChildProcess): void {
  if (child.pid === undefined) return;
  // `next dev` spawns children; the negative pid signals the whole group.
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // Already exited - nothing to stop.
  }
}

/**
 * Resolve a dev server to record against:
 *   - CAPTURE_BASE_URL set -> use it as-is (external server, never managed).
 *   - else a server already up on CAPTURE_PORT / PORT / 3000 -> reuse it.
 *   - else, when `manage` is on, start `next dev` on that port and return a stop().
 * The started server uses a separate build dir so it coexists with a normal
 * `pnpm dev` on .next (Next's dev lock is per build dir), mirroring the e2e setup.
 */
export async function ensureServer(opts: {
  manage: boolean;
}): Promise<ServerHandle> {
  const explicit = process.env.CAPTURE_BASE_URL;
  if (explicit) {
    if (!(await isUp(explicit))) {
      throw new Error(`CAPTURE_BASE_URL ${explicit} is not reachable.`);
    }
    return { baseUrl: explicit, stop: async () => {} };
  }

  const port = process.env.CAPTURE_PORT ?? process.env.PORT ?? "3000";
  const baseUrl = `http://localhost:${port}`;

  if (await isUp(baseUrl)) return { baseUrl, stop: async () => {} };
  if (!opts.manage) {
    throw new Error(
      `No dev server at ${baseUrl}. Start one (pnpm dev) or drop --no-server to let the tool start it.`,
    );
  }

  // The longest phase of a cold run: next dev boots and compiles the first route
  // on demand. Without this line the tool sits silent for up to two minutes here,
  // looking hung, since the next log ("signing in") only fires once it's up.
  console.log(`• starting dev server at ${baseUrl} (cold compile, up to 120s)`);

  const child = spawn(
    "pnpm",
    ["--filter", "web", "exec", "next", "dev", "--port", port],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PORT: port,
        // Next resolves distDir relative to the web app (apps/web), not this
        // spawn's cwd, so this lands at apps/web/node_modules/.cache/next-capture.
        // A build dir separate from .next lets it coexist with a normal `pnpm dev`.
        NEXT_DIST_DIR: "node_modules/.cache/next-capture",
      },
      stdio: "ignore",
      detached: true,
    },
  );
  child.unref();

  const ready = await waitUntilUp(baseUrl, 120_000);
  if (!ready) {
    stopChild(child);
    throw new Error(
      `Dev server did not become ready at ${baseUrl} within 120s.`,
    );
  }

  return { baseUrl, stop: async () => stopChild(child) };
}
