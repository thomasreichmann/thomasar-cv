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

function post(body: unknown): Request {
  return new Request("http://localhost/api/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Assert a 200 response carrying real PDF bytes (the "%PDF-" magic header). */
async function expectPdf(res: Response): Promise<void> {
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("application/pdf");
  expect(res.headers.get("Cache-Control")).toBe("no-store");

  const bytes = new Uint8Array(await res.arrayBuffer());
  expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe("%PDF-");
  expect(res.headers.get("Content-Length")).toBe(String(bytes.length));
}

describe("POST /api/preview", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("renders posted content to a PDF for a signed-in caller", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });

    // Theme is optional: a body with content alone renders the baseline look.
    const res = await POST(post({ content: exampleResume }));

    await expectPdf(res);
  });

  it("renders content with an explicit theme through the one render path", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });

    const res = await POST(
      post({
        content: exampleResume,
        theme: { density: "compact", spacing: "relaxed", scale: "large", accent: "rust" },
      }),
    );

    await expectPdf(res);
  });

  it("forwards the posted theme to the renderer (themed bytes differ from default)", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });

    const bytes = async (body: unknown) =>
      new Uint8Array(await (await POST(post(body))).arrayBuffer());

    // Same content, different theme. If the route dropped `theme` and always
    // rendered the baseline, these would be byte-identical - so the inequality is
    // what proves the posted theme actually reaches `renderResumeToBuffer`. (The
    // render is deterministic for identical input, per render.test.ts.)
    const baseline = await bytes({ content: exampleResume });
    const themed = await bytes({
      content: exampleResume,
      theme: { density: "compact", spacing: "compact", scale: "large", accent: "rust" },
    });

    expect(Buffer.from(themed).equals(Buffer.from(baseline))).toBe(false);
  });

  it("rejects an unauthenticated caller before rendering", async () => {
    getSession.mockResolvedValue(null);

    const res = await POST(post({ content: exampleResume }));

    expect(res.status).toBe(401);
  });

  it("rejects a malformed content document", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });

    const res = await POST(post({ content: { schemaVersion: 99, header: {} } }));

    expect(res.status).toBe(400);
  });

  it("rejects a malformed theme before rendering", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });

    // `accent` is a closed enum; a freeform color is refused at the gate.
    const res = await POST(
      post({ content: exampleResume, theme: { accent: "#ff0000" } }),
    );

    expect(res.status).toBe(400);
  });
});
