import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  account,
  ping,
  resume,
  resumeSchema,
  resumeVersion,
  session,
  user,
  verification,
} from "./index";

describe("resume schema", () => {
  it("namespaces the schema as `resume`", () => {
    expect(resumeSchema.schemaName).toBe("resume");
  });

  // Guard the model-level shape the migration is generated from (ADR 0010):
  // nullable columns and, crucially, `set null` (not cascade) on the self-FK - so
  // a careless edit can't silently flip a base-delete into cascading its variants
  // away, baking the wrong action into the next generated migration.
  describe("variant grouping (ADR 0010)", () => {
    const config = getTableConfig(resume);
    const column = (name: string) =>
      config.columns.find((c) => c.name === name);

    it("adds base_resume_id and target as nullable columns", () => {
      expect(column("base_resume_id")?.notNull).toBe(false);
      expect(column("target")?.notNull).toBe(false);
    });

    it("orphans variants on base delete: base_resume_id is a self-FK with set null", () => {
      const selfFk = config.foreignKeys.find((fk) =>
        fk.reference().columns.some((c) => c.name === "base_resume_id"),
      );
      const ref = selfFk?.reference();
      expect(ref?.foreignTable).toBe(resume);
      expect(ref?.foreignColumns.map((c) => c.name)).toEqual(["id"]);
      expect(selfFk?.onDelete).toBe("set null");
    });
  });

  it("defines every table under the resume schema, nothing in public", () => {
    // The shared Supabase project also hosts nexus's own `user` / `session` /
    // `account` tables in `public`; ours must stay in `resume` or they collide.
    const tables = {
      ping,
      user,
      session,
      account,
      verification,
      resume,
      resumeVersion,
    };
    for (const [name, table] of Object.entries(tables)) {
      const config = getTableConfig(table);
      expect(config.schema, `${name} schema`).toBe("resume");
    }
  });
});
