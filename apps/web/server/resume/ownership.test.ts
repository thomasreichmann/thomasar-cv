import type { Connection } from "@thomasar-cv/db";
import { exampleResume, resume } from "@thomasar-cv/db/schema";
import {
  createTestDb,
  seedResume,
  seedUser,
  type TestDb,
} from "@thomasar-cv/db/testing";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ownedResumes } from "./ownership";

const USER_A = "user_a";
const USER_B = "user_b";

describe("ownedResumes write scoping", () => {
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

  it("denies a cross-user update and leaves the owner's row untouched", async () => {
    const a = await seedResume(db, { userId: USER_A, name: "Original" });

    await expect(
      ownedResumes(db, USER_B).update(a.id, { name: "Hijacked" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // Confirms the scoped `where id and user_id` rejected rather than silently
    // no-oping or touching another user's row.
    const [row] = await db.select().from(resume).where(eq(resume.id, a.id));
    expect(row?.name).toBe("Original");
  });

  it("denies a cross-user delete and leaves the owner's row in place", async () => {
    const a = await seedResume(db, { userId: USER_A });

    await expect(ownedResumes(db, USER_B).remove(a.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    const rows = await db.select().from(resume).where(eq(resume.id, a.id));
    expect(rows).toHaveLength(1);
  });

  it("denies a cross-user update of a nonexistent id with the same NOT_FOUND", async () => {
    await expect(
      ownedResumes(db, USER_B).update(crypto.randomUUID(), { name: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lets the owner update their own résumé", async () => {
    const a = await seedResume(db, { userId: USER_A, name: "Original" });

    const updated = await ownedResumes(db, USER_A).update(a.id, {
      name: "Renamed",
    });

    expect(updated.name).toBe("Renamed");
  });

  it("create stamps ownership from the helper and is reachable only by the owner", async () => {
    const created = await ownedResumes(db, USER_A).create({
      name: "New",
      content: exampleResume,
    });

    expect(created.userId).toBe(USER_A);
    expect(await ownedResumes(db, USER_A).list()).toHaveLength(1);
    expect(await ownedResumes(db, USER_B).list()).toHaveLength(0);
  });
});
