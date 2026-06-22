import type { Connection } from "@thomasar-cv/db";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildContext, createCallerFactory } from "../init";
import { appRouter } from "./_app";

// Both refusal paths short-circuit before any db or auth call, so a sentinel
// connection is enough: if the gate ever reached the db, this would explode
// instead of throwing the expected tRPC error.
const stubDb = { __stub: true } as unknown as Connection;
const caller = () => createCallerFactory(appRouter)(buildContext({ db: stubDb, session: null }));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dev.credentials", () => {
  it("is refused in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DEV_LOGIN_EMAIL", "dev@test.local");
    vi.stubEnv("DEV_LOGIN_PASSWORD", "dev-password-123");

    await expect(caller().dev.credentials()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("is refused outside production when no dev account is configured", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("DEV_LOGIN_EMAIL", "");
    vi.stubEnv("DEV_LOGIN_PASSWORD", "");

    await expect(caller().dev.credentials()).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});
