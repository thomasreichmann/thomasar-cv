import type { Connection } from "@thomasar-cv/db";
import { resume, user } from "@thomasar-cv/db/schema";
import {
  createTestDb,
  seedResume,
  seedUser,
  type TestDb,
} from "@thomasar-cv/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { deleteAbandonedAnonymousUsers } from "./cleanup";

// A fixed cutoff with rows seeded on either side of it, so the test pins the
// boundary itself, never a moving wall-clock. STALE is before the cutoff (cold),
// FRESH is after it (recent activity).
const CUTOFF = new Date("2026-06-01T00:00:00Z");
const STALE = new Date("2026-05-01T00:00:00Z");
const FRESH = new Date("2026-06-20T00:00:00Z");

async function remainingUserIds(db: Connection): Promise<string[]> {
  const rows = await db.select({ id: user.id }).from(user);
  return rows.map((r) => r.id).sort();
}

async function resumeOwners(db: Connection): Promise<string[]> {
  const rows = await db.select({ userId: resume.userId }).from(resume);
  return rows.map((r) => r.userId).sort();
}

describe("deleteAbandonedAnonymousUsers (TTL sweep, ADR 0008)", () => {
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
  });

  it("sweeps a cold anonymous user and cascades its résumés away", async () => {
    await seedUser(db, {
      id: "cold_guest",
      isAnonymous: true,
      createdAt: STALE,
      updatedAt: STALE,
    });
    await seedResume(db, { userId: "cold_guest", updatedAt: STALE });

    const count = await deleteAbandonedAnonymousUsers(db, CUTOFF);

    expect(count).toBe(1);
    expect(await remainingUserIds(db)).toEqual([]);
    expect(await resumeOwners(db)).toEqual([]);
  });

  it("sweeps a cold anonymous user that never created a résumé", async () => {
    await seedUser(db, {
      id: "cold_empty_guest",
      isAnonymous: true,
      createdAt: STALE,
      updatedAt: STALE,
    });

    const count = await deleteAbandonedAnonymousUsers(db, CUTOFF);

    expect(count).toBe(1);
    expect(await remainingUserIds(db)).toEqual([]);
  });

  it("keeps a stale guest who has recently edited a résumé", async () => {
    // The guest row is cold, but editing a résumé does not touch it - the fresh
    // résumé is the activity signal, so the guest must survive.
    await seedUser(db, {
      id: "active_guest",
      isAnonymous: true,
      createdAt: STALE,
      updatedAt: STALE,
    });
    await seedResume(db, { userId: "active_guest", updatedAt: FRESH });

    const count = await deleteAbandonedAnonymousUsers(db, CUTOFF);

    expect(count).toBe(0);
    expect(await remainingUserIds(db)).toEqual(["active_guest"]);
    expect(await resumeOwners(db)).toEqual(["active_guest"]);
  });

  it("keeps a recently-active anonymous user", async () => {
    await seedUser(db, {
      id: "recent_guest",
      isAnonymous: true,
      createdAt: STALE,
      updatedAt: FRESH,
    });

    const count = await deleteAbandonedAnonymousUsers(db, CUTOFF);

    expect(count).toBe(0);
    expect(await remainingUserIds(db)).toEqual(["recent_guest"]);
  });

  it("never touches a converted (non-anonymous) account, however cold", async () => {
    // A real account that has been dormant for months is not the sweep's
    // concern; only never-converted guests are.
    await seedUser(db, {
      id: "real_account",
      isAnonymous: false,
      createdAt: STALE,
      updatedAt: STALE,
    });
    await seedResume(db, { userId: "real_account", updatedAt: STALE });

    const count = await deleteAbandonedAnonymousUsers(db, CUTOFF);

    expect(count).toBe(0);
    expect(await remainingUserIds(db)).toEqual(["real_account"]);
    expect(await resumeOwners(db)).toEqual(["real_account"]);
  });

  it("sweeps only the cold guests in a mixed population", async () => {
    await seedUser(db, {
      id: "cold_guest",
      isAnonymous: true,
      createdAt: STALE,
      updatedAt: STALE,
    });
    await seedUser(db, {
      id: "recent_guest",
      isAnonymous: true,
      createdAt: STALE,
      updatedAt: FRESH,
    });
    await seedUser(db, {
      id: "real_account",
      isAnonymous: false,
      createdAt: STALE,
      updatedAt: STALE,
    });

    const count = await deleteAbandonedAnonymousUsers(db, CUTOFF);

    expect(count).toBe(1);
    expect(await remainingUserIds(db)).toEqual(["real_account", "recent_guest"]);
  });

  it("removes nothing when the named guest is missing (idempotent re-run)", async () => {
    await seedUser(db, {
      id: "recent_guest",
      isAnonymous: true,
      createdAt: FRESH,
      updatedAt: FRESH,
    });

    expect(await deleteAbandonedAnonymousUsers(db, CUTOFF)).toBe(0);
    expect(await deleteAbandonedAnonymousUsers(db, CUTOFF)).toBe(0);
    expect(await remainingUserIds(db)).toEqual(["recent_guest"]);
  });
});
