import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  account,
  ping,
  resume,
  resumeSchema,
  session,
  user,
  verification,
} from "./index";

describe("resume schema", () => {
  it("namespaces the schema as `resume`", () => {
    expect(resumeSchema.schemaName).toBe("resume");
  });

  it("defines every table under the resume schema, nothing in public", () => {
    // The shared Supabase project also hosts nexus's own `user` / `session` /
    // `account` tables in `public`; ours must stay in `resume` or they collide.
    const tables = { ping, user, session, account, verification, resume };
    for (const [name, table] of Object.entries(tables)) {
      const config = getTableConfig(table);
      expect(config.schema, `${name} schema`).toBe("resume");
    }
  });
});
