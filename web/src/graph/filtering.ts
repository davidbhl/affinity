import type cytoscape from "cytoscape";

import type { FilterMode, Filters } from "@/types/project";

function includesOrEmpty(options: string[], value: string | undefined): boolean {
  if (options.length === 0) {
    return true;
  }
  if (!value) {
    return false;
  }
  return options.includes(value);
}

function hasTagOrEmpty(requiredTags: string[], tags: unknown): boolean {
  if (requiredTags.length === 0) {
    return true;
  }
  const nodeTags = Array.isArray(tags) ? tags.map(String) : [];
  return requiredTags.some((tag) => nodeTags.includes(tag));
}

export function applyFilters(cy: cytoscape.Core, filters: Filters, filterMode: FilterMode): void {
  const search = filters.search.trim().toLowerCase();
  const matchedRealIds = new Set<string>();

  const realNodes = cy.nodes("[isRealNode = 1]");
  realNodes.forEach((node) => {
    const data = node.data();
    const id = String(data.id ?? "");
    const label = String(data.label ?? "");
    const searchMatch =
      search.length === 0 ||
      id.toLowerCase().includes(search) ||
      label.toLowerCase().includes(search);

    const matches =
      searchMatch &&
      includesOrEmpty(filters.groups, data.group) &&
      includesOrEmpty(filters.subgroups, data.subgroup) &&
      includesOrEmpty(filters.types, data.type) &&
      hasTagOrEmpty(filters.tags, data.tags);

    if (matches) {
      matchedRealIds.add(id);
    }
  });

  const visibleNodeIds = new Set<string>();
  cy.nodes().forEach((node) => {
    const isReal = Number(node.data("isRealNode")) === 1;
    if (isReal) {
      if (matchedRealIds.has(node.id())) {
        visibleNodeIds.add(node.id());
      }
      return;
    }

    const descendantRealIds = node
      .descendants("[isRealNode = 1]")
      .map((descendant) => descendant.id());

    if (descendantRealIds.some((id) => matchedRealIds.has(id))) {
      visibleNodeIds.add(node.id());
    }
  });

  cy.elements().removeClass("dimmed");
  cy.elements().removeClass("hidden-by-filter");

  cy.nodes().forEach((node) => {
    const matches = visibleNodeIds.has(node.id());
    if (!matches) {
      if (filterMode === "hide") {
        node.addClass("hidden-by-filter");
      } else {
        node.addClass("dimmed");
      }
    }
  });

  cy.edges().forEach((edge) => {
    const sourceVisible = visibleNodeIds.has(edge.source().id());
    const targetVisible = visibleNodeIds.has(edge.target().id());
    const visible = sourceVisible && targetVisible;
    if (!visible) {
      if (filterMode === "hide") {
        edge.addClass("hidden-by-filter");
      } else {
        edge.addClass("dimmed");
      }
    }
  });
}

export function applySelectionHighlight(cy: cytoscape.Core): void {
  cy.elements().removeClass("selection-focus");
  cy.elements().removeClass("selection-fade");

  const selectedNode = cy.nodes(":selected").first();
  if (selectedNode && !selectedNode.empty()) {
    const focusSet = selectedNode.closedNeighborhood();
    focusSet.addClass("selection-focus");
    cy.elements().difference(focusSet).addClass("selection-fade");
    return;
  }

  const selectedEdge = cy.edges(":selected").first();
  if (selectedEdge && !selectedEdge.empty()) {
    const focusSet = selectedEdge.union(selectedEdge.connectedNodes());
    focusSet.addClass("selection-focus");
    cy.elements().difference(focusSet).addClass("selection-fade");
  }
}
