import { describe, expect, it } from "vitest";

import { site } from "./site";

describe("site metadata", () => {
  it("exposes a non-empty name and description", () => {
    expect(site.name).toBeTruthy();
    expect(site.description).toBeTruthy();
  });
});
