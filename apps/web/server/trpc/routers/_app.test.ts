import type { Connection } from "@thomasar-cv/db";
import { describe, expect, it } from "vitest";

import {
  buildContext,
  createCallerFactory,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../init";
import { appRouter } from "./_app";

// The procedures under test never run a query, so a sentinel stands in for the
// real connection; identity is all we assert.
const stubDb = { __stub: true } as unknown as Connection;
const ctx = (session: Parameters<typeof buildContext>[0]["session"] = null) =>
  buildContext({ db: stubDb, session });

describe("appRouter", () => {
  it("health returns ok", async () => {
    const caller = createCallerFactory(appRouter)(ctx());
    const result = await caller.health();

    expect(result.status).toBe("ok");
    expect(result.time).toBeInstanceOf(Date);
  });
});

describe("context", () => {
  // Probe router so context plumbing is exercised without adding endpoints to
  // the real app router before they are needed.
  const probeRouter = createTRPCRouter({
    db: publicProcedure.query(({ ctx }) => ctx.db),
    secret: protectedProcedure.query(() => "ok"),
  });
  const caller = () => createCallerFactory(probeRouter)(ctx());

  it("flows db through to procedures", async () => {
    expect(await caller().db()).toBe(stubDb);
  });

  it("protectedProcedure rejects without a session", async () => {
    await expect(caller().secret()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
