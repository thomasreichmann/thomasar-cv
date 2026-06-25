import type { Connection } from "@thomasar-cv/db";
import {
  createTestDb,
  seedResume,
  seedUser,
  type TestDb,
} from "@thomasar-cv/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ownedResumes } from "./ownership";
import { reassignResumes } from "./reassign";

// Stand-ins for BetterAuth user ids: GUEST is the anonymous user being
// converted, ACCOUNT the target it links into. Only `user.id` matters here.
const GUEST = "user_guest";
const ACCOUNT = "user_account";

describe("reassignResumes (guest conversion merge, ADR 0005)", () => {
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
    await seedUser(db, { id: GUEST, isAnonymous: true });
    await seedUser(db, { id: ACCOUNT });
  });

  it("moves the guest's résumés onto the target account", async () => {
    await seedResume(db, { userId: GUEST, name: "Guest draft" });

    await reassignResumes(db, GUEST, ACCOUNT);

    const guestRows = await ownedResumes(db, GUEST).list();
    const accountRows = await ownedResumes(db, ACCOUNT).list();
    expect(guestRows).toHaveLength(0);
    expect(accountRows.map((r) => r.name)).toEqual(["Guest draft"]);
  });

  it("appends to the account's own résumés without dropping or merging rows", async () => {
    await seedResume(db, { userId: ACCOUNT, name: "Existing" });
    await seedResume(db, { userId: GUEST, name: "Guest draft" });

    await reassignResumes(db, GUEST, ACCOUNT);

    const accountRows = await ownedResumes(db, ACCOUNT).list();
    expect(accountRows.map((r) => r.name).sort()).toEqual([
      "Existing",
      "Guest draft",
    ]);
  });

  it("keeps same-named résumés as distinct rows (no dedup)", async () => {
    await seedResume(db, { userId: ACCOUNT, name: "Résumé" });
    await seedResume(db, { userId: GUEST, name: "Résumé" });

    await reassignResumes(db, GUEST, ACCOUNT);

    const accountRows = await ownedResumes(db, ACCOUNT).list();
    expect(accountRows).toHaveLength(2);
  });

  it("is a no-op for a guest with no résumés (sign-up case)", async () => {
    await reassignResumes(db, GUEST, ACCOUNT);

    expect(await ownedResumes(db, ACCOUNT).list()).toHaveLength(0);
  });

  it("is idempotent: a second run moves nothing more", async () => {
    await seedResume(db, { userId: GUEST, name: "Guest draft" });

    await reassignResumes(db, GUEST, ACCOUNT);
    await reassignResumes(db, GUEST, ACCOUNT);

    expect(await ownedResumes(db, ACCOUNT).list()).toHaveLength(1);
    expect(await ownedResumes(db, GUEST).list()).toHaveLength(0);
  });

  it("touches only the named guest, leaving other owners' résumés put", async () => {
    const other = await seedUser(db, { id: "user_other" });
    await seedResume(db, { userId: other.id, name: "Untouched" });
    await seedResume(db, { userId: GUEST, name: "Guest draft" });

    await reassignResumes(db, GUEST, ACCOUNT);

    expect((await ownedResumes(db, other.id).list()).map((r) => r.name)).toEqual(
      ["Untouched"],
    );
  });

  it("rejects and moves nothing when the target account does not exist", async () => {
    await seedResume(db, { userId: GUEST, name: "Guest draft" });

    await expect(reassignResumes(db, GUEST, "user_missing")).rejects.toThrow();

    // The guest keeps its résumé. This is the safety property onLinkAccount
    // leans on: a reassign that throws (here, the resume->user foreign key
    // rejecting an unknown target) must leave the guest's rows intact, so the
    // plugin aborts before deleting the guest and nothing is lost on a retry.
    expect((await ownedResumes(db, GUEST).list()).map((r) => r.name)).toEqual([
      "Guest draft",
    ]);
  });
});
