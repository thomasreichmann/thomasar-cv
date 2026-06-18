import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /preview/pdf", () => {
  it("returns the seeded résumé as a downloadable PDF", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="Jane-Doe.pdf"',
    );

    const bytes = new Uint8Array(await res.arrayBuffer());
    // A real PDF, not an empty or error body: the "%PDF-" magic header leads it.
    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(0);
    expect(res.headers.get("Content-Length")).toBe(String(bytes.length));
  });
});
