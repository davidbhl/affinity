import Papa from "papaparse";

import type { CsvValidationError, EdgeModel, NodeModel } from "@/types/project";

const NODE_REQUIRED = ["id", "label"] as const;
const NODE_OPTIONAL = ["type", "group", "subgroup", "tags", "status"] as const;
const EDGE_REQUIRED = ["source", "target"] as const;
const EDGE_OPTIONAL = ["kind", "directed", "weight"] as const;

type CsvRow = Record<string, string | undefined>;

export type CsvImportResult = {
  nodes: NodeModel[];
  edges: EdgeModel[];
  errors: CsvValidationError[];
};

function normalizeHeader(value: string): string {
  return value.trim();
}

function parseCsv(text: string): { rows: CsvRow[]; headers: string[]; parseErrors: CsvValidationError[] } {
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: "greedy"
  });

  const parseErrors: CsvValidationError[] = parsed.errors.map((err) => ({
    row: (err.row ?? 0) + 2,
    message: err.message
  }));

  const headers = (parsed.meta.fields ?? []).map(normalizeHeader);
  return {
    rows: parsed.data,
    headers,
    parseErrors
  };
}

function validateHeaders(headers: string[], required: readonly string[], errors: CsvValidationError[], fileLabel: string): void {
  const present = new Set(headers);
  required.forEach((header) => {
    if (!present.has(header)) {
      errors.push({
        row: 1,
        column: header,
        message: `${fileLabel}: missing required header '${header}'`
      });
    }
  });
}

function extraAttrs(row: CsvRow, knownColumns: Set<string>): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, raw]) => {
    if (knownColumns.has(key)) {
      return;
    }
    const value = (raw ?? "").trim();
    if (value.length > 0) {
      attrs[key] = value;
    }
  });
  return attrs;
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  const clean = raw.trim();
  if (!clean) {
    return [];
  }
  return clean
    .split(/[;|]/g)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function parseDirected(raw: string | undefined): boolean | null {
  if (!raw || raw.trim() === "") {
    return false;
  }
  const value = raw.trim().toLowerCase();
  if (value === "true" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }
  return null;
}

function parseWeight(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "") {
    return 1;
  }
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  return null;
}

export function parseNodeCsv(text: string): { nodes: NodeModel[]; errors: CsvValidationError[] } {
  const { rows, headers, parseErrors } = parseCsv(text);
  const errors: CsvValidationError[] = [...parseErrors];
  validateHeaders(headers, NODE_REQUIRED, errors, "nodes.csv");

  const knownColumns = new Set([...NODE_REQUIRED, ...NODE_OPTIONAL]);
  const nodes: NodeModel[] = [];
  const seenIds = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const id = (row.id ?? "").trim();
    const label = (row.label ?? "").trim();

    if (!id) {
      errors.push({ row: rowNumber, column: "id", message: "Node id is required." });
      return;
    }
    if (!label) {
      errors.push({ row: rowNumber, column: "label", message: "Node label is required." });
      return;
    }

    if (seenIds.has(id)) {
      errors.push({
        row: rowNumber,
        column: "id",
        message: `Duplicate node id '${id}' (first seen on row ${seenIds.get(id)}).`
      });
      return;
    }
    seenIds.set(id, rowNumber);

    nodes.push({
      id,
      label,
      type: (row.type ?? "").trim() || undefined,
      group: (row.group ?? "").trim() || undefined,
      subgroup: (row.subgroup ?? "").trim() || undefined,
      tags: parseTags(row.tags),
      status: (row.status ?? "").trim() || undefined,
      attrs: extraAttrs(row, knownColumns)
    });
  });

  return { nodes, errors };
}

export function parseEdgeCsv(text: string, validNodeIds: Set<string>): { edges: EdgeModel[]; errors: CsvValidationError[] } {
  const { rows, headers, parseErrors } = parseCsv(text);
  const errors: CsvValidationError[] = [...parseErrors];
  validateHeaders(headers, EDGE_REQUIRED, errors, "edges.csv");

  const knownColumns = new Set([...EDGE_REQUIRED, ...EDGE_OPTIONAL]);
  const edges: EdgeModel[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const source = (row.source ?? "").trim();
    const target = (row.target ?? "").trim();

    if (!source) {
      errors.push({ row: rowNumber, column: "source", message: "Edge source is required." });
      return;
    }
    if (!target) {
      errors.push({ row: rowNumber, column: "target", message: "Edge target is required." });
      return;
    }

    if (!validNodeIds.has(source)) {
      errors.push({ row: rowNumber, column: "source", message: `Missing source endpoint '${source}'.` });
    }
    if (!validNodeIds.has(target)) {
      errors.push({ row: rowNumber, column: "target", message: `Missing target endpoint '${target}'.` });
    }

    const directed = parseDirected(row.directed);
    if (directed === null) {
      errors.push({
        row: rowNumber,
        column: "directed",
        message: "Directed must be one of true/false/1/0."
      });
    }

    const weight = parseWeight(row.weight);
    if (weight === null) {
      errors.push({
        row: rowNumber,
        column: "weight",
        message: "Weight must be numeric."
      });
    }

    edges.push({
      id: `row:${rowNumber}`,
      source,
      target,
      kind: (row.kind ?? "").trim() || "relates_to",
      directed: directed ?? false,
      weight: weight ?? 1,
      attrs: extraAttrs(row, knownColumns)
    });
  });

  return { edges, errors };
}

export function parseCsvPair(nodesCsv: string, edgesCsv: string): CsvImportResult {
  const nodeParse = parseNodeCsv(nodesCsv);
  const nodeIds = new Set(nodeParse.nodes.map((node) => node.id));
  const edgeParse = parseEdgeCsv(edgesCsv, nodeIds);

  return {
    nodes: nodeParse.nodes,
    edges: edgeParse.edges,
    errors: [...nodeParse.errors, ...edgeParse.errors].sort((a, b) => a.row - b.row)
  };
}
