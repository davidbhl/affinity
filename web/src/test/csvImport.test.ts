import { describe, expect, it } from "vitest";

import { parseCsvPair, parseEdgeCsv, parseNodeCsv } from "@/import/csvImport";

const validNodes = [
  "id,label,type,group,subgroup,tags,status",
  "n1,Tom,person,G1,S1,alpha;beta,",
  "n2,Ana,person,G1,S1,beta,"
].join("\n");

const validEdges = [
  "source,target,kind,directed,weight",
  "n1,n2,relates_to,false,2",
  "n2,n1,relates_to,1,3"
].join("\n");

describe("CSV import parsing", () => {
  it("parses tags and directed values", () => {
    const result = parseCsvPair(validNodes, validEdges);

    expect(result.errors).toHaveLength(0);
    expect(result.nodes[0].tags).toEqual(["alpha", "beta"]);
    expect(result.edges[0].directed).toBe(false);
    expect(result.edges[1].directed).toBe(true);
    expect(result.edges[0].id).toBe("row:2");
  });

  it("flags duplicate node ids", () => {
    const duplicateNodes = [
      "id,label",
      "n1,Tom",
      "n1,Ana"
    ].join("\n");

    const parsed = parseNodeCsv(duplicateNodes);
    expect(parsed.errors.some((error) => error.message.includes("Duplicate node id 'n1'"))).toBe(true);
  });

  it("flags missing edge endpoint", () => {
    const edgeCsv = ["source,target", "n1,missing"].join("\n");
    const parsed = parseEdgeCsv(edgeCsv, new Set(["n1"]));
    expect(parsed.errors.some((error) => error.message.includes("Missing target endpoint 'missing'"))).toBe(true);
  });

  it("flags invalid directed values", () => {
    const edgeCsv = ["source,target,directed", "n1,n1,maybe"].join("\n");
    const parsed = parseEdgeCsv(edgeCsv, new Set(["n1"]));
    expect(parsed.errors.some((error) => error.column === "directed")).toBe(true);
  });
});
