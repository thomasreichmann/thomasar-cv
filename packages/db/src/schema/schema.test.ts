import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { ping, resumeSchema } from "./index";

describe("resume schema", () => {
  it("namespaces the schema as `resume`", () => {
    expect(resumeSchema.schemaName).toBe("resume");
  });

  it("defines every table under the resume schema, nothing in public", () => {
    const config = getTableConfig(ping);
    expect(config.schema).toBe("resume");
    expect(config.name).toBe("ping");
  });
});
