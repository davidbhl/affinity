import type { EdgeDefinition, ElementDefinition, NodeDefinition } from "cytoscape";

import type { EdgeModel, GroupingMode, NodeModel } from "@/types/project";

import { toGroupKey, toSubgroupKey } from "./keys";

export const UNGROUPED_LABEL = "Ungrouped";

export type GraphBuildResult = {
  elements: ElementDefinition[];
  groupKeys: string[];
  subgroupKeys: string[];
};

export function buildBaseElements(nodes: NodeModel[], edges: EdgeModel[], groupingMode: GroupingMode): GraphBuildResult {
  const groupMap = new Map<string, NodeDefinition>();
  const subgroupMap = new Map<string, NodeDefinition>();
  const realNodes: NodeDefinition[] = [];

  const ensureGroup = (groupName: string): string => {
    const groupKey = toGroupKey(groupName);
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        data: {
          id: groupKey,
          label: groupName,
          kind: "group",
          isRealNode: 0,
          groupName
        }
      });
    }
    return groupKey;
  };

  const ensureSubgroup = (groupName: string, subgroupName: string): string => {
    const parentGroup = ensureGroup(groupName);
    const subgroupKey = toSubgroupKey(groupName, subgroupName);
    if (!subgroupMap.has(subgroupKey)) {
      subgroupMap.set(subgroupKey, {
        data: {
          id: subgroupKey,
          parent: parentGroup,
          label: subgroupName,
          kind: "subgroup",
          isRealNode: 0,
          groupName,
          subgroupName
        }
      });
    }
    return subgroupKey;
  };

  nodes.forEach((node) => {
    const groupName = node.group?.trim();
    const subgroupName = node.subgroup?.trim();
    let parent: string | undefined;

    if (groupingMode === "group") {
      if (groupName) {
        parent = ensureGroup(groupName);
      }
    }

    if (groupingMode === "group_subgroup") {
      if (subgroupName) {
        parent = ensureSubgroup(groupName || UNGROUPED_LABEL, subgroupName);
      } else if (groupName) {
        parent = ensureGroup(groupName);
      }
    }

    realNodes.push({
      data: {
        id: node.id,
        parent,
        label: node.label,
        type: node.type,
        group: node.group,
        subgroup: node.subgroup,
        tags: node.tags,
        status: node.status,
        attrs: node.attrs,
        isRealNode: 1,
        kind: "real"
      }
    });
  });

  const edgeElements: EdgeDefinition[] = edges.map((edge) => ({
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
      directed: edge.directed ? 1 : 0,
      weight: edge.weight,
      attrs: edge.attrs,
      isProxy: 0
    }
  }));

  const elements: ElementDefinition[] = [
    ...groupMap.values(),
    ...subgroupMap.values(),
    ...realNodes,
    ...edgeElements
  ];

  return {
    elements,
    groupKeys: [...groupMap.keys()],
    subgroupKeys: [...subgroupMap.keys()]
  };
}

export function uniqueValues(nodes: NodeModel[], key: "group" | "subgroup" | "type"): string[] {
  const set = new Set<string>();
  nodes.forEach((node) => {
    const value = node[key];
    if (value && value.trim()) {
      set.add(value.trim());
    }
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function uniqueTags(nodes: NodeModel[]): string[] {
  const set = new Set<string>();
  nodes.forEach((node) => {
    node.tags.forEach((tag) => {
      if (tag.trim()) {
        set.add(tag.trim());
      }
    });
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}
