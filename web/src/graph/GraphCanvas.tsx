import { useEffect, useRef } from "react";
import cytoscape, { type Core } from "cytoscape";

import { applyCollapsedState, type CollapseMeta } from "@/graph/collapse";
import { ensureCytoscapePlugins, graphStyles } from "@/graph/cytoscape";
import { buildBaseElements } from "@/graph/elements";
import { applyFilters, applySelectionHighlight } from "@/graph/filtering";
import { runLayout } from "@/graph/layouts";
import { useProjectStore } from "@/state/projectStore";

type DragState = {
  startX: number;
  startY: number;
  descendants: Record<string, { x: number; y: number }>;
};

function applyPositionsAndLocks(cy: Core, positions: Record<string, { x: number; y: number; locked: boolean }>): void {
  cy.nodes("[isProxy != 1]").forEach((node) => {
    const pos = positions[node.id()];
    if (pos) {
      node.position({ x: pos.x, y: pos.y });
      if (pos.locked) {
        node.lock();
      } else {
        node.unlock();
      }
    } else {
      node.unlock();
    }
  });
}

export function GraphCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const collapseMetaRef = useRef<CollapseMeta>({});
  const dragStateRef = useRef<Record<string, DragState>>({});
  const previousLayoutRef = useRef<string | null>(null);
  const layoutBusyRef = useRef(false);

  const nodes = useProjectStore((state) => state.project.graph.nodes);
  const edges = useProjectStore((state) => state.project.graph.edges);
  const positions = useProjectStore((state) => state.project.positions);
  const groupingMode = useProjectStore((state) => state.project.uiState.groupingMode);
  const collapsed = useProjectStore((state) => state.project.uiState.collapsed);
  const filters = useProjectStore((state) => state.project.uiState.filters);
  const filterMode = useProjectStore((state) => state.project.uiState.filterMode);
  const layout = useProjectStore((state) => state.project.uiState.layout);
  const lockOnDrag = useProjectStore((state) => state.lockOnDrag);

  const updatePositionsBulk = useProjectStore((state) => state.updatePositionsBulk);
  const setSelectedElement = useProjectStore((state) => state.setSelectedElement);
  const toggleCollapsedGroup = useProjectStore((state) => state.toggleCollapsedGroup);
  const toggleCollapsedSubgroup = useProjectStore((state) => state.toggleCollapsedSubgroup);

  const positionsRef = useRef(positions);
  const groupingRef = useRef(groupingMode);
  const collapsedRef = useRef(collapsed);
  const filtersRef = useRef(filters);
  const filterModeRef = useRef(filterMode);
  const layoutRef = useRef(layout);
  const lockOnDragRef = useRef(lockOnDrag);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    groupingRef.current = groupingMode;
  }, [groupingMode]);

  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    filterModeRef.current = filterMode;
  }, [filterMode]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    lockOnDragRef.current = lockOnDrag;
  }, [lockOnDrag]);

  const snapshotPositions = (cy: Core): void => {
    const snapshot: Record<string, { x: number; y: number; locked?: boolean }> = {};
    cy.nodes("[isProxy != 1]").forEach((node) => {
      const pos = node.position();
      snapshot[node.id()] = {
        x: pos.x,
        y: pos.y,
        locked: node.locked()
      };
    });
    updatePositionsBulk(snapshot);
  };

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    ensureCytoscapePlugins();

    const cy = cytoscape({
      container: containerRef.current,
      style: graphStyles,
      wheelSensitivity: 0.2,
      selectionType: "single"
    });

    cyRef.current = cy;

    cy.on("grab", "node", (event) => {
      const node = event.target;
      const collapsedMeta = collapseMetaRef.current[node.id()];
      if (!collapsedMeta) {
        delete dragStateRef.current[node.id()];
        return;
      }

      const descendants: Record<string, { x: number; y: number }> = {};
      collapsedMeta.descendantNodeIds.forEach((descendantId) => {
        const descendant = cy.getElementById(descendantId);
        if (!descendant.empty() && descendant.isNode()) {
          const pos = descendant.position();
          descendants[descendantId] = { x: pos.x, y: pos.y };
        }
      });

      const position = node.position();
      dragStateRef.current[node.id()] = {
        startX: position.x,
        startY: position.y,
        descendants
      };
    });

    cy.on("dragfree", "node", (event) => {
      const node = event.target;
      const current = node.position();
      const shouldLock = lockOnDragRef.current;

      const dragState = dragStateRef.current[node.id()];
      const bulk: Record<string, { x: number; y: number; locked?: boolean }> = {
        [node.id()]: {
          x: current.x,
          y: current.y,
          locked: shouldLock ? true : positionsRef.current[node.id()]?.locked
        }
      };

      if (dragState) {
        const dx = current.x - dragState.startX;
        const dy = current.y - dragState.startY;

        Object.entries(dragState.descendants).forEach(([descendantId, basePos]) => {
          const descendant = cy.getElementById(descendantId);
          if (descendant.empty() || !descendant.isNode()) {
            return;
          }
          const nextPosition = {
            x: basePos.x + dx,
            y: basePos.y + dy
          };
          descendant.position(nextPosition);
          bulk[descendantId] = {
            ...nextPosition,
            locked: positionsRef.current[descendantId]?.locked
          };
        });
      }

      if (shouldLock) {
        node.lock();
      } else {
        node.unlock();
      }

      updatePositionsBulk(bulk);
      delete dragStateRef.current[node.id()];
    });

    cy.on("select unselect", "node, edge", () => {
      const selectedNode = cy.nodes(":selected").first();
      if (selectedNode && !selectedNode.empty()) {
        setSelectedElement({
          kind: "node",
          id: selectedNode.id(),
          data: selectedNode.data() as Record<string, unknown>
        });
        applySelectionHighlight(cy);
        return;
      }

      const selectedEdge = cy.edges(":selected").first();
      if (selectedEdge && !selectedEdge.empty()) {
        setSelectedElement({
          kind: "edge",
          id: selectedEdge.id(),
          data: selectedEdge.data() as Record<string, unknown>
        });
        applySelectionHighlight(cy);
        return;
      }

      setSelectedElement(null);
      applySelectionHighlight(cy);
    });

    cy.on("dbltap", "node[kind = 'group'], node[kind = 'subgroup']", (event) => {
      const node = event.target;
      const kind = String(node.data("kind"));
      if (kind === "group") {
        toggleCollapsedGroup(node.id());
      } else if (kind === "subgroup") {
        toggleCollapsedSubgroup(node.id());
      }
    });

    cy.on("tap", (event) => {
      if (event.target === cy) {
        cy.elements().unselect();
        setSelectedElement(null);
        applySelectionHighlight(cy);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [setSelectedElement, toggleCollapsedGroup, toggleCollapsedSubgroup, updatePositionsBulk]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    const build = buildBaseElements(nodes, edges, groupingMode);

    cy.startBatch();
    cy.elements().remove();
    cy.add(build.elements);
    applyPositionsAndLocks(cy, positionsRef.current);
    cy.endBatch();

    collapseMetaRef.current = applyCollapsedState(cy, groupingRef.current, collapsedRef.current);
    applyFilters(cy, filtersRef.current, filterModeRef.current);
    applySelectionHighlight(cy);

    const hasStoredPositions = nodes.some((node) => Boolean(positionsRef.current[node.id]));
    if (!hasStoredPositions && cy.nodes().length > 0 && !layoutBusyRef.current) {
      layoutBusyRef.current = true;
      runLayout(cy, layoutRef.current)
        .then(() => {
          snapshotPositions(cy);
          collapseMetaRef.current = applyCollapsedState(cy, groupingRef.current, collapsedRef.current);
          applyFilters(cy, filtersRef.current, filterModeRef.current);
        })
        .finally(() => {
          layoutBusyRef.current = false;
        });
    }
  }, [nodes, edges, groupingMode]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    applyPositionsAndLocks(cy, positions);
    collapseMetaRef.current = applyCollapsedState(cy, groupingMode, collapsed);
    applyFilters(cy, filters, filterMode);
    applySelectionHighlight(cy);
  }, [positions]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    collapseMetaRef.current = applyCollapsedState(cy, groupingMode, collapsed);
    applyFilters(cy, filters, filterMode);
    applySelectionHighlight(cy);
  }, [groupingMode, collapsed, filters, filterMode]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.nodes().length === 0) {
      previousLayoutRef.current = layout;
      return;
    }

    if (previousLayoutRef.current === layout) {
      return;
    }

    previousLayoutRef.current = layout;
    if (layoutBusyRef.current) {
      return;
    }

    layoutBusyRef.current = true;
    applyPositionsAndLocks(cy, positionsRef.current);

    runLayout(cy, layout)
      .then(() => {
        snapshotPositions(cy);
        collapseMetaRef.current = applyCollapsedState(cy, groupingRef.current, collapsedRef.current);
        applyFilters(cy, filtersRef.current, filterModeRef.current);
      })
      .finally(() => {
        layoutBusyRef.current = false;
      });
  }, [layout]);

  return <div ref={containerRef} className="cy-container" />;
}

