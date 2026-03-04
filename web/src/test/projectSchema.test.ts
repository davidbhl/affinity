import { describe, expect, it } from "vitest";

import { ProjectSchema, createEmptyProject, parseProjectOrThrow } from "@/types/project";

describe("Project schema", () => {
  it("round-trips createEmptyProject", () => {
    const project = createEmptyProject("Roundtrip");
    const parsed = parseProjectOrThrow(JSON.parse(JSON.stringify(project)));

    expect(parsed.id).toBe("default");
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.name).toBe("Roundtrip");
  });

  it("rejects wrong schemaVersion", () => {
    const project = createEmptyProject();
    const invalid = {
      ...project,
      schemaVersion: 2
    };

    const result = ProjectSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
