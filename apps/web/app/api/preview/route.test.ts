import { exampleResume } from "@thomasar-cv/db/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The route is gated on a session; stub the auth boundary so the test drives the
// signed-in / signed-out branches without real cookies. `renderResumeToBuffer`
// runs for real - it is pure JS, and rendering proves the bytes are a true PDF.
const getSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession: () => getSession() } },
}));

import { POST } from "./route";

function postContent(content: unknown): Request {
  return new Request("http://localhost/api/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
}

describe("POST /api/preview", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("renders posted content to a PDF for a signed-in caller", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });

    const res = await POST(postContent(exampleResume));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const bytes = new Uint8Array(await res.arrayBuffer());
    // A real PDF, not an empty or error body: the "%PDF-" magic header leads it.
    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe("%PDF-");
    expect(res.headers.get("Content-Length")).toBe(String(bytes.length));
  });

  it("rejects an unauthenticated caller before rendering", async () => {
    getSession.mockResolvedValue(null);

    const res = await POST(postContent(exampleResume));

    expect(res.status).toBe(401);
  });

  it("rejects a malformed content document", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });

    const res = await POST(postContent({ schemaVersion: 99, header: {} }));

    expect(res.status).toBe(400);
  });
});
