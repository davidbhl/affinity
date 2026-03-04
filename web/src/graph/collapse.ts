import type cytoscape from "cytoscape";

import type { GroupingMode, Project } from "@/types/project";

import { parseSubgroupKey } from "./keys";

export type CollapseMeta = Record<
  string,
  {
    descendantNodeIds: string[];
  }
>;

function proxyId(source: string, target: string, kind: string, directed: number): string {
  const raw = `${source}|${target}|${kind}|${directed}`;
  const safe = raw.replace(/[^a-zA-Z0-9:_-]/g, "_");
  return `proxy:${safe}`;
}

export function effectiveCollapsedKeys(
  groupingMode: GroupingMode,
  collapsed: Project["uiState"]["collapsed"]
): string[] {
  if (groupingMode === "none") {
    return [];
  }

  if (groupingMode === "group") {
    return [...collapsed.groups];
  }

  const groupSet = new Set(collapsed.groups);
  const visibleSubgroups = collapsed.subgroups.filter((subgroupKey) => {
    const parts = parseSubgroupKey(subgroupKey);
    return !groupSet.has(`group:${parts.group}`);
  });

  return [...collapsed.groups, ...visibleSubgroups];
}

export function applyCollapsedState(
  cy: cytoscape.Core,
  groupingMode: GroupingMode,
  collapsed: Project["uiState"]["collapsed"]
): CollapseMeta {
  cy.edges("[isProxy = 1]").remove();
  cy.elements().removeClass("collapsed-hidden");

  const collapsedKeys = effectiveCollapsedKeys(groupingMode, collapsed);
  const meta: CollapseMeta = {};

  collapsedKeys.forEach((compoundId) => {
    const compound = cy.getElementById(compoundId);
    if (!compound || compound.empty()) {
      return;
    }

    const descendants = compound.descendants();
    const descendantReal = descendants.filter("node[isRealNode = 1]");
    if (descendantReal.empty()) {
      return;
    }

    const descendantIds = new Set(descendantReal.map((node) => node.id()));
    const proxyMap = new Map<
      string,
      {
        source: string;
        target: string;
        kind: string;
        directed: number;
        weight: number;
      }
    >();

    descendantReal.connectedEdges("[isProxy != 1]").forEach((edge) => {
      const source = edge.source().id();
      const target = edge.target().id();
      const sourceInside = descendantIds.has(source);
      const targetInside = descendantIds.has(target);

      if (sourceInside && targetInside) {
        edge.addClass("collapsed-hidden");
        return;
      }

      if (!sourceInside && !targetInside) {
        return;
      }

      const outsideId = sourceInside ? target : source;
      const isDirected = Number(edge.data("directed")) === 1;
      const kind = String(edge.data("kind") ?? "relates_to");

      let proxySource = compoundId;
      let proxyTarget = outsideId;
      if (isDirected) {
        if (sourceInside) {
          proxySource = compoundId;
          proxyTarget = outsideId;
        } else {
          proxySource = outsideId;
          proxyTarget = compoundId;
        }
      }

      const key = `${proxySource}|${proxyTarget}|${kind}|${isDirected ? 1 : 0}`;
      const existing = proxyMap.get(key);
      if (existing) {
        existing.weight += 1;
      } else {
        proxyMap.set(key, {
          source: proxySource,
          target: proxyTarget,
          kind,
          directed: isDirected ? 1 : 0,
          weight: 1
        });
      }

      edge.addClass("collapsed-hidden");
    });

    descendants.addClass("collapsed-hidden");
    descendants.connectedEdges().addClass("collapsed-hidden");

    const proxyElements = [...proxyMap.values()].map((proxy) => ({
      data: {
        id: proxyId(proxy.source, proxy.target, proxy.kind, proxy.directed),
        source: proxy.source,
        target: proxy.target,
        kind: proxy.kind,
        directed: proxy.directed,
        weight: proxy.weight,
        isProxy: 1
      }
    }));

    if (proxyElements.length > 0) {
      cy.add(proxyElements);
    }

    meta[compoundId] = {
      descendantNodeIds: descendants.nodes().map((node) => node.id())
    };
  });

  return meta;
}
