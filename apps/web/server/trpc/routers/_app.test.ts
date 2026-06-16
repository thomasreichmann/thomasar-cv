import { describe, expect, it } from "vitest";

import {
  createCallerFactory,
  createTRPCContext,
  createTRPCRouter,
  protectedProcedure,
} from "../init";
import { appRouter } from "./_app";

const ctx = () => createTRPCContext({ headers: new Headers() });

describe("appRouter", () => {
  it("health returns ok", async () => {
    const caller = createCallerFactory(appRouter)(await ctx());
    const result = await caller.health();

    expect(result.status).toBe("ok");
    expect(result.time).toBeInstanceOf(Date);
  });
});

describe("protectedProcedure", () => {
  // Probe router so the stub is exercised without exposing a protected
  // endpoint on the real app router before auth lands.
  const probeRouter = createTRPCRouter({
    secret: protectedProcedure.query(() => "ok"),
  });

  it("rejects without a session", async () => {
    const caller = createCallerFactory(probeRouter)(await ctx());

    await expect(caller.secret()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
