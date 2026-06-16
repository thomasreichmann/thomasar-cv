import type { Connection } from "@thomasar-cv/db";
import {
  createTestDb,
  seedResume,
  seedUser,
  type TestDb,
} from "@thomasar-cv/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildContext, createCallerFactory } from "../init";
import { appRouter } from "./_app";

// Two owners, seeded fresh before each test. The ids stand in for BetterAuth
// user ids; only `user.id` matters to ownership.
const USER_A = "user_a";
const USER_B = "user_b";

// A minimal BetterAuth-shaped session; the procedures only read `user.id`.
const session = (userId: string) =>
  ({ user: { id: userId, email: `${userId}@example.test` } }) as Parameters<
    typeof buildContext
  >[0]["session"];

// A caller wired to the real router and schema, signed in as `userId` (or
// anonymous when null) and backed by the in-process pglite database.
const callerFor = (db: Connection, userId: string | null) =>
  createCallerFactory(appRouter)(
    buildContext({ db, session: userId ? session(userId) : null }),
  );

describe("resume router ownership", () => {
  let testDb: TestDb;
  let db: Connection;

  beforeAll(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });
  afterAll(async () => {
    await testDb.close();
  });
  beforeEach(async () => {
    await testDb.truncate();
    await seedUser(db, { id: USER_A });
    await seedUser(db, { id: USER_B });
  });

  it("list returns only the caller's own résumés", async () => {
    await seedResume(db, { userId: USER_A, name: "A1" });
    await seedResume(db, { userId: USER_A, name: "A2" });
    await seedResume(db, { userId: USER_B, name: "B1" });

    const list = await callerFor(db, USER_B).resume.list();

    expect(list.map((r) => r.name)).toEqual(["B1"]);
    expect(list.every((r) => r.userId === USER_B)).toBe(true);
  });

  it("get of another user's résumé surfaces NOT_FOUND", async () => {
    const a = await seedResume(db, { userId: USER_A });

    await expect(
      callerFor(db, USER_B).resume.get({ id: a.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("get of a nonexistent résumé surfaces the same NOT_FOUND", async () => {
    // Same outcome as not-owned, so a caller can't probe which ids are real.
    await expect(
      callerFor(db, USER_B).resume.get({ id: crypto.randomUUID() }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("the owner can read their own résumé", async () => {
    const a = await seedResume(db, { userId: USER_A, name: "Mine" });

    const got = await callerFor(db, USER_A).resume.get({ id: a.id });

    expect(got.name).toBe("Mine");
  });

  it("protectedProcedure rejects an anonymous call", async () => {
    await expect(callerFor(db, null).resume.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
