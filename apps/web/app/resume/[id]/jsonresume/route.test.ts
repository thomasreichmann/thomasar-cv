import type { Connection } from "@thomasar-cv/db";
import {
  createTestDb,
  seedResume,
  seedUser,
  type TestDb,
} from "@thomasar-cv/db/testing";
import { makeResumeContent } from "@thomasar-cv/db/testing/factories";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// The route is gated on a session; stub the auth boundary so the test drives the
// signed-in / signed-out branches without real cookies.
const getSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession: () => getSession() } },
}));

// The route reads the process-wide `db`; forward every call to the live pglite
// instance through a stable proxy, so ownership runs for real against a seeded
// database rather than a mock.
const dbRef = vi.hoisted(() => ({ current: null as Connection | null }));
vi.mock("@/server/db", () => ({
  db: new Proxy(
    {},
    {
      get(_t, prop) {
        const target = dbRef.current as unknown as Record<string | symbol, unknown>;
        const value = target[prop];
        return typeof value === "function" ? value.bind(target) : value;
      },
    },
  ),
}));

import { GET } from "./route";

const USER_A = "user_a";
const USER_B = "user_b";

const get = (id: string) =>
  GET(new Request(`http://localhost/resume/${id}/jsonresume`), {
    params: Promise.resolve({ id }),
  });

describe("GET /resume/[id]/jsonresume", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
    dbRef.current = testDb.db;
  });
  afterAll(async () => {
    await testDb.close();
  });
  beforeEach(async () => {
    await testDb.truncate();
    await seedUser(testDb.db, { id: USER_A });
    await seedUser(testDb.db, { id: USER_B });
    getSession.mockReset();
  });

  it("downloads the owner's résumé as a JSON Resume attachment", async () => {
    const row = await seedResume(testDb.db, {
      userId: USER_A,
      content: makeResumeContent({ headerName: "Ada Lovelace" }),
    });
    getSession.mockResolvedValue({ user: { id: USER_A } });

    const res = await get(row.id);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="Ada-Lovelace.json"',
    );
    const doc = await res.json();
    expect(doc.basics.name).toBe("Ada Lovelace");
    expect(Array.isArray(doc.work)).toBe(true);
  });

  it("rejects an unauthenticated caller before reading any row", async () => {
    const row = await seedResume(testDb.db, { userId: USER_A });
    getSession.mockResolvedValue(null);

    const res = await get(row.id);

    expect(res.status).toBe(401);
  });

  it("returns 404 for another user's résumé", async () => {
    const row = await seedResume(testDb.db, { userId: USER_A });
    getSession.mockResolvedValue({ user: { id: USER_B } });

    const res = await get(row.id);

    expect(res.status).toBe(404);
  });

  it("returns the same 404 for a nonexistent résumé, so ids can't be probed", async () => {
    getSession.mockResolvedValue({ user: { id: USER_A } });

    const res = await get(crypto.randomUUID());

    expect(res.status).toBe(404);
  });
});
