import type { Connection } from "@thomasar-cv/db";
import {
  defaultResumeTheme,
  emptyResume,
  exampleResume,
  type ResumeTheme,
} from "@thomasar-cv/db/schema";
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

// A minimal BetterAuth-shaped session; procedures read `user.id`, and `create`
// reads `user.isAnonymous` to apply the guest one-résumé cap (ADR 0008).
const session = (userId: string, isAnonymous = false) =>
  ({
    user: { id: userId, email: `${userId}@example.test`, isAnonymous },
  }) as Parameters<typeof buildContext>[0]["session"];

// A caller wired to the real router and schema, signed in as `userId` (or
// signed out when null) and backed by the in-process pglite database. Pass
// `isAnonymous` to sign in as a guest rather than a full account.
const callerFor = (db: Connection, userId: string | null, isAnonymous = false) =>
  createCallerFactory(appRouter)(
    buildContext({
      db,
      session: userId ? session(userId, isAnonymous) : null,
    }),
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

  it("create stamps the caller as owner and defaults to the empty document", async () => {
    // No content supplied, so the row should hold the minimal valid document -
    // not null or a half-formed shape - owned by the caller, reachable only by them.
    const created = await callerFor(db, USER_A).resume.create({ name: "Blank" });

    expect(created.userId).toBe(USER_A);
    expect(created.content).toEqual(emptyResume);
    expect(await callerFor(db, USER_B).resume.list()).toHaveLength(0);
  });

  it("create persists a supplied content document", async () => {
    const created = await callerFor(db, USER_A).resume.create({
      name: "Filled",
      content: exampleResume,
    });

    expect(created.content).toEqual(exampleResume);
  });

  it("create refuses a malformed content document before it reaches the column", async () => {
    await expect(
      callerFor(db, USER_A).resume.create({
        name: "Bad",
        // schemaVersion must be the literal 1; the input schema refuses the bad
        // document, so a malformed write can never reach the jsonb column.
        content: { schemaVersion: 2, header: { name: "x" } } as never,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(await callerFor(db, USER_A).resume.list()).toHaveLength(0);
  });

  it("a guest can create their first résumé", async () => {
    const created = await callerFor(db, USER_A, true).resume.create({
      name: "Draft",
    });

    expect(created.userId).toBe(USER_A);
  });

  it("a guest who already owns a résumé is refused a second create (ADR 0008)", async () => {
    await seedResume(db, { userId: USER_A, name: "Only one" });

    await expect(
      callerFor(db, USER_A, true).resume.create({ name: "Second" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // The refusal creates nothing and touches nothing: the guest still owns
    // exactly the one résumé they started with.
    const still = await callerFor(db, USER_A, true).resume.list();
    expect(still.map((r) => r.name)).toEqual(["Only one"]);
  });

  it("the one-résumé cap is a guest rule: a full account can create many", async () => {
    await callerFor(db, USER_A).resume.create({ name: "One" });
    await callerFor(db, USER_A).resume.create({ name: "Two" });

    expect(await callerFor(db, USER_A).resume.list()).toHaveLength(2);
  });

  it("the owner can update their own résumé's name and content", async () => {
    const a = await seedResume(db, { userId: USER_A, name: "Old" });

    const updated = await callerFor(db, USER_A).resume.update({
      id: a.id,
      name: "New",
      content: exampleResume,
    });

    expect(updated.name).toBe("New");
    expect(updated.content).toEqual(exampleResume);
  });

  it("update of another user's résumé surfaces NOT_FOUND and leaves it intact", async () => {
    const a = await seedResume(db, { userId: USER_A, name: "Original" });

    await expect(
      callerFor(db, USER_B).resume.update({ id: a.id, name: "Hijacked" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const still = await callerFor(db, USER_A).resume.get({ id: a.id });
    expect(still.name).toBe("Original");
  });

  it("update of a nonexistent id surfaces the same NOT_FOUND", async () => {
    await expect(
      callerFor(db, USER_A).resume.update({
        id: crypto.randomUUID(),
        name: "x",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("update that sets neither name, content nor theme is refused", async () => {
    const a = await seedResume(db, { userId: USER_A });

    await expect(
      callerFor(db, USER_A).resume.update({ id: a.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // The theme is presentation, stored beside content (ADR 0006). These prove it
  // travels the same owned read/write path: defaulted on create, persisted, and
  // reloadable - the "saved with the résumé and reloaded on open" acceptance bar.
  const customTheme: ResumeTheme = {
    density: "compact",
    spacing: "relaxed",
    scale: "large",
    accent: "rust",
  };

  it("create defaults the theme to the neutral baseline", async () => {
    const created = await callerFor(db, USER_A).resume.create({ name: "Blank" });

    expect(created.theme).toEqual(defaultResumeTheme);
  });

  it("a row written without a theme reads back the baseline (column default)", async () => {
    // `seedResume` omits theme, so the INSERT carries none and the row is filled
    // by the column DEFAULT - the path every résumé predating this column took.
    // This pins migration 0004's hardcoded literal to `defaultResumeTheme`, the
    // backfill the schema promises (`resume.ts`), which `resume.create` would
    // otherwise mask by always supplying a theme itself.
    const seeded = await seedResume(db, { userId: USER_A });

    const got = await callerFor(db, USER_A).resume.get({ id: seeded.id });

    expect(got.theme).toEqual(defaultResumeTheme);
  });

  it("create persists a supplied theme", async () => {
    const created = await callerFor(db, USER_A).resume.create({
      name: "Themed",
      theme: customTheme,
    });

    expect(created.theme).toEqual(customTheme);
  });

  it("create refuses a malformed theme before it reaches the column", async () => {
    await expect(
      callerFor(db, USER_A).resume.create({
        name: "Bad theme",
        // `accent` is a closed enum; an unlisted token is refused by the input
        // schema, so a freeform color can never reach the jsonb column.
        theme: { accent: "#ff0000" } as never,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(await callerFor(db, USER_A).resume.list()).toHaveLength(0);
  });

  it("a theme-only update persists and leaves the content untouched", async () => {
    const a = await seedResume(db, { userId: USER_A, content: exampleResume });

    const updated = await callerFor(db, USER_A).resume.update({
      id: a.id,
      theme: customTheme,
    });

    expect(updated.theme).toEqual(customTheme);
    // Content is left intact: a theme save touches only the theme column.
    expect(updated.content).toEqual(exampleResume);

    // Durable, not just returned: a fresh read sees the saved theme.
    const reloaded = await callerFor(db, USER_A).resume.get({ id: a.id });
    expect(reloaded.theme).toEqual(customTheme);
  });

  it("the owner can remove their own résumé", async () => {
    const a = await seedResume(db, { userId: USER_A });

    await callerFor(db, USER_A).resume.remove({ id: a.id });

    expect(await callerFor(db, USER_A).resume.list()).toHaveLength(0);
  });

  it("remove of another user's résumé surfaces NOT_FOUND and leaves it in place", async () => {
    const a = await seedResume(db, { userId: USER_A });

    await expect(
      callerFor(db, USER_B).resume.remove({ id: a.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(await callerFor(db, USER_A).resume.list()).toHaveLength(1);
  });

  it("protectedProcedure rejects an anonymous call", async () => {
    await expect(callerFor(db, null).resume.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("protectedProcedure rejects an anonymous write", async () => {
    await expect(
      callerFor(db, null).resume.create({ name: "X" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
