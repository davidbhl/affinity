import { create } from "zustand";

import {
  createEmptyProject,
  type CsvValidationError,
  type EdgeModel,
  type FilterMode,
  type Filters,
  type GroupingMode,
  type LayoutName,
  type NodeModel,
  type Project
} from "@/types/project";

type SelectedElement =
  | {
      kind: "node" | "edge";
      id: string;
      data: Record<string, unknown>;
    }
  | null;

type ProjectStore = {
  loaded: boolean;
  project: Project;
  importErrors: CsvValidationError[];
  selectedElement: SelectedElement;
  lockOnDrag: boolean;
  hydrate: (project: Project) => void;
  setImportErrors: (errors: CsvValidationError[]) => void;
  setSelectedElement: (selected: SelectedElement) => void;
  replaceGraph: (nodes: NodeModel[], edges: EdgeModel[]) => void;
  setGroupingMode: (mode: GroupingMode) => void;
  setLayout: (layout: LayoutName) => void;
  setFilterMode: (mode: FilterMode) => void;
  setFilters: (patch: Partial<Filters>) => void;
  setCollapsed: (collapsed: Project["uiState"]["collapsed"]) => void;
  toggleCollapsedGroup: (groupKey: string) => void;
  toggleCollapsedSubgroup: (subgroupKey: string) => void;
  clearCollapsedGroups: () => void;
  clearCollapsedSubgroups: () => void;
  updatePosition: (nodeId: string, x: number, y: number, locked?: boolean) => void;
  updatePositionsBulk: (positions: Record<string, { x: number; y: number; locked?: boolean }>) => void;
  unlockAll: () => void;
  setLockOnDrag: (enabled: boolean) => void;
  importProjectJson: (project: Project) => void;
};

function touch(project: Project): Project {
  return {
    ...project,
    updatedAt: new Date().toISOString()
  };
}

export const useProjectStore = create<ProjectStore>((set) => ({
  loaded: false,
  project: createEmptyProject(),
  importErrors: [],
  selectedElement: null,
  lockOnDrag: true,

  hydrate: (project) => {
    set({
      loaded: true,
      project,
      importErrors: [],
      selectedElement: null
    });
  },

  setImportErrors: (errors) => {
    set({ importErrors: errors });
  },

  setSelectedElement: (selected) => {
    set({ selectedElement: selected });
  },

  replaceGraph: (nodes, edges) => {
    set((state) => ({
      importErrors: [],
      selectedElement: null,
      project: touch({
        ...state.project,
        graph: { nodes, edges },
        positions: {},
        uiState: {
          ...state.project.uiState,
          collapsed: { groups: [], subgroups: [] }
        }
      })
    }));
  },

  setGroupingMode: (mode) => {
    set((state) => ({
      project: touch({
        ...state.project,
        uiState: {
          ...state.project.uiState,
          groupingMode: mode
        }
      })
    }));
  },

  setLayout: (layout) => {
    set((state) => ({
      project: touch({
        ...state.project,
        uiState: {
          ...state.project.uiState,
          layout
        }
      })
    }));
  },

  setFilterMode: (mode) => {
    set((state) => ({
      project: touch({
        ...state.project,
        uiState: {
          ...state.project.uiState,
          filterMode: mode
        }
      })
    }));
  },

  setFilters: (patch) => {
    set((state) => ({
      project: touch({
        ...state.project,
        uiState: {
          ...state.project.uiState,
          filters: {
            ...state.project.uiState.filters,
            ...patch
          }
        }
      })
    }));
  },

  setCollapsed: (collapsed) => {
    set((state) => ({
      project: touch({
        ...state.project,
        uiState: {
          ...state.project.uiState,
          collapsed
        }
      })
    }));
  },

  toggleCollapsedGroup: (groupKey) => {
    set((state) => {
      const setGroups = new Set(state.project.uiState.collapsed.groups);
      if (setGroups.has(groupKey)) {
        setGroups.delete(groupKey);
      } else {
        setGroups.add(groupKey);
      }
      return {
        project: touch({
          ...state.project,
          uiState: {
            ...state.project.uiState,
            collapsed: {
              ...state.project.uiState.collapsed,
              groups: [...setGroups]
            }
          }
        })
      };
    });
  },

  toggleCollapsedSubgroup: (subgroupKey) => {
    set((state) => {
      const setSubgroups = new Set(state.project.uiState.collapsed.subgroups);
      if (setSubgroups.has(subgroupKey)) {
        setSubgroups.delete(subgroupKey);
      } else {
        setSubgroups.add(subgroupKey);
      }
      return {
        project: touch({
          ...state.project,
          uiState: {
            ...state.project.uiState,
            collapsed: {
              ...state.project.uiState.collapsed,
              subgroups: [...setSubgroups]
            }
          }
        })
      };
    });
  },

  clearCollapsedGroups: () => {
    set((state) => ({
      project: touch({
        ...state.project,
        uiState: {
          ...state.project.uiState,
          collapsed: {
            ...state.project.uiState.collapsed,
            groups: []
          }
        }
      })
    }));
  },

  clearCollapsedSubgroups: () => {
    set((state) => ({
      project: touch({
        ...state.project,
        uiState: {
          ...state.project.uiState,
          collapsed: {
            ...state.project.uiState.collapsed,
            subgroups: []
          }
        }
      })
    }));
  },

  updatePosition: (nodeId, x, y, locked) => {
    set((state) => {
      const prev = state.project.positions[nodeId];
      return {
        project: touch({
          ...state.project,
          positions: {
            ...state.project.positions,
            [nodeId]: {
              x,
              y,
              locked: locked ?? prev?.locked ?? false
            }
          }
        })
      };
    });
  },

  updatePositionsBulk: (positions) => {
    set((state) => {
      const nextPositions = { ...state.project.positions };
      Object.entries(positions).forEach(([nodeId, pos]) => {
        const previous = nextPositions[nodeId];
        nextPositions[nodeId] = {
          x: pos.x,
          y: pos.y,
          locked: pos.locked ?? previous?.locked ?? false
        };
      });

      return {
        project: touch({
          ...state.project,
          positions: nextPositions
        })
      };
    });
  },

  unlockAll: () => {
    set((state) => {
      const nextPositions: Project["positions"] = {};
      Object.entries(state.project.positions).forEach(([nodeId, pos]) => {
        nextPositions[nodeId] = {
          ...pos,
          locked: false
        };
      });
      return {
        project: touch({
          ...state.project,
          positions: nextPositions
        })
      };
    });
  },

  setLockOnDrag: (enabled) => {
    set({ lockOnDrag: enabled });
  },

  importProjectJson: (project) => {
    set({
      loaded: true,
      importErrors: [],
      selectedElement: null,
      project
    });
  }
}));
