import { z } from "zod";

export const GROUPING_MODES = ["none", "group", "group_subgroup"] as const;
export const LAYOUTS = ["fcose", "dagre"] as const;
export const FILTER_MODES = ["dim", "hide"] as const;

export const GroupingModeSchema = z.enum(GROUPING_MODES);
export const LayoutSchema = z.enum(LAYOUTS);
export const FilterModeSchema = z.enum(FILTER_MODES);

export const NodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.string().optional(),
  group: z.string().optional(),
  subgroup: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.string().optional(),
  attrs: z.record(z.unknown()).default({})
});

export const EdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  kind: z.string().default("relates_to"),
  directed: z.boolean().default(false),
  weight: z.number().default(1),
  attrs: z.record(z.unknown()).default({})
});

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  locked: z.boolean().default(false)
});

export const FiltersSchema = z.object({
  groups: z.array(z.string()).default([]),
  subgroups: z.array(z.string()).default([]),
  types: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  search: z.string().default("")
});

export const UiStateSchema = z.object({
  groupingMode: GroupingModeSchema.default("none"),
  collapsed: z
    .object({
      groups: z.array(z.string()).default([]),
      subgroups: z.array(z.string()).default([])
    })
    .default({ groups: [], subgroups: [] }),
  layout: LayoutSchema.default("fcose"),
  filters: FiltersSchema.default({
    groups: [],
    subgroups: [],
    types: [],
    tags: [],
    search: ""
  }),
  filterMode: FilterModeSchema.default("dim")
});

export const ProjectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal("default"),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  graph: z.object({
    nodes: z.array(NodeSchema),
    edges: z.array(EdgeSchema)
  }),
  positions: z.record(PositionSchema).default({}),
  uiState: UiStateSchema
});

export type GroupingMode = z.infer<typeof GroupingModeSchema>;
export type LayoutName = z.infer<typeof LayoutSchema>;
export type FilterMode = z.infer<typeof FilterModeSchema>;
export type NodeModel = z.infer<typeof NodeSchema>;
export type EdgeModel = z.infer<typeof EdgeSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Filters = z.infer<typeof FiltersSchema>;

export type CsvValidationError = {
  row: number;
  column?: string;
  message: string;
};

export function createEmptyProject(name = "Default Project"): Project {
  const timestamp = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: "default",
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    graph: {
      nodes: [],
      edges: []
    },
    positions: {},
    uiState: {
      groupingMode: "none",
      collapsed: {
        groups: [],
        subgroups: []
      },
      layout: "fcose",
      filters: {
        groups: [],
        subgroups: [],
        types: [],
        tags: [],
        search: ""
      },
      filterMode: "dim"
    }
  };
}

export function parseProjectOrThrow(raw: unknown): Project {
  return ProjectSchema.parse(raw);
}
