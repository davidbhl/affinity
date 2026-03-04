import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AppShell,
  Box,
  Center,
  Loader,
  Stack,
  Text
} from "@mantine/core";

import { TopBar } from "./TopBar";
import { LeftSidebar } from "./LeftSidebar";
import { Inspector } from "./Inspector";
import { ImportErrorsPanel } from "./ImportErrorsPanel";
import { GraphCanvas } from "@/graph/GraphCanvas";
import { UNGROUPED_LABEL, uniqueTags, uniqueValues } from "@/graph/elements";
import { toGroupKey, toSubgroupKey } from "@/graph/keys";
import { parseCsvPair } from "@/import/csvImport";
import { loadProject, saveProject } from "@/storage/projectRepository";
import { useProjectStore } from "@/state/projectStore";
import {
  parseProjectOrThrow,
  type FilterMode,
  type Filters,
  type GroupingMode,
  type LayoutName
} from "@/types/project";

function download(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function detectCsvFiles(files: File[]): { nodesFile: File | null; edgesFile: File | null } {
  let nodesFile: File | null = null;
  let edgesFile: File | null = null;

  files.forEach((file) => {
    const lower = file.name.toLowerCase();
    if (!nodesFile && lower.includes("nodes")) {
      nodesFile = file;
      return;
    }
    if (!edgesFile && lower.includes("edges")) {
      edgesFile = file;
    }
  });

  if (!nodesFile && files.length >= 1) {
    nodesFile = files[0];
  }
  if (!edgesFile && files.length >= 2) {
    edgesFile = files[1];
  }

  return { nodesFile, edgesFile };
}

export function App(): JSX.Element {
  const [booting, setBooting] = useState(true);

  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const loaded = useProjectStore((state) => state.loaded);
  const project = useProjectStore((state) => state.project);
  const importErrors = useProjectStore((state) => state.importErrors);
  const selectedElement = useProjectStore((state) => state.selectedElement);
  const lockOnDrag = useProjectStore((state) => state.lockOnDrag);

  const hydrate = useProjectStore((state) => state.hydrate);
  const replaceGraph = useProjectStore((state) => state.replaceGraph);
  const setImportErrors = useProjectStore((state) => state.setImportErrors);
  const setLayout = useProjectStore((state) => state.setLayout);
  const setGroupingMode = useProjectStore((state) => state.setGroupingMode);
  const unlockAll = useProjectStore((state) => state.unlockAll);
  const setLockOnDrag = useProjectStore((state) => state.setLockOnDrag);
  const setFilters = useProjectStore((state) => state.setFilters);
  const setFilterMode = useProjectStore((state) => state.setFilterMode);
  const setCollapsed = useProjectStore((state) => state.setCollapsed);
  const importProjectJson = useProjectStore((state) => state.importProjectJson);

  useEffect(() => {
    loadProject()
      .then((saved) => {
        hydrate(saved);
        setBooting(false);
      })
      .catch((error) => {
        setImportErrors([
          {
            row: 0,
            message: `Failed to load project from IndexedDB: ${String(error)}`
          }
        ]);
        setBooting(false);
      });
  }, [hydrate, setImportErrors]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveProject(project).catch((error) => {
        setImportErrors([
          {
            row: 0,
            message: `Failed to persist project: ${String(error)}`
          }
        ]);
      });
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loaded, project, setImportErrors]);

  const groupOptions = useMemo(() => uniqueValues(project.graph.nodes, "group"), [project.graph.nodes]);
  const subgroupOptions = useMemo(() => uniqueValues(project.graph.nodes, "subgroup"), [project.graph.nodes]);
  const typeOptions = useMemo(() => uniqueValues(project.graph.nodes, "type"), [project.graph.nodes]);
  const tagOptions = useMemo(() => uniqueTags(project.graph.nodes), [project.graph.nodes]);

  const allGroupKeys = useMemo(
    () => groupOptions.map((groupName) => toGroupKey(groupName)),
    [groupOptions]
  );

  const allSubgroupKeys = useMemo(() => {
    const set = new Set<string>();
    project.graph.nodes.forEach((node) => {
      const subgroup = node.subgroup?.trim();
      if (!subgroup) {
        return;
      }
      const group = node.group?.trim() || UNGROUPED_LABEL;
      set.add(toSubgroupKey(group, subgroup));
    });
    return [...set];
  }, [project.graph.nodes]);

  const onImportCsvClick = (): void => {
    csvInputRef.current?.click();
  };

  const onCsvFilesSelected = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) {
      return;
    }

    const { nodesFile, edgesFile } = detectCsvFiles(files);
    if (!nodesFile || !edgesFile) {
      setImportErrors([
        {
          row: 1,
          message: "Please provide both nodes.csv and edges.csv (filenames should include 'nodes' and 'edges')."
        }
      ]);
      return;
    }

    const [nodesText, edgesText] = await Promise.all([nodesFile.text(), edgesFile.text()]);
    const parsed = parseCsvPair(nodesText, edgesText);

    if (parsed.errors.length > 0) {
      setImportErrors(parsed.errors);
      return;
    }

    replaceGraph(parsed.nodes, parsed.edges);
  };

  const onExportJson = (): void => {
    download("project.json", JSON.stringify(project, null, 2));
  };

  const onImportJsonClick = (): void => {
    jsonInputRef.current?.click();
  };

  const onJsonFileSelected = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    const raw = await file.text();
    try {
      const parsed = parseProjectOrThrow(JSON.parse(raw));
      importProjectJson(parsed);
      setImportErrors([]);
    } catch (error) {
      setImportErrors([
        {
          row: 1,
          message: `Invalid project.json: ${String(error)}`
        }
      ]);
    }
  };

  const setLayoutMode = (nextLayout: LayoutName): void => {
    setLayout(nextLayout);
  };

  const setGrouping = (mode: GroupingMode): void => {
    setGroupingMode(mode);
  };

  const setFilterPatch = (patch: Partial<Filters>): void => {
    setFilters(patch);
  };

  const setMode = (mode: FilterMode): void => {
    setFilterMode(mode);
  };

  if (booting) {
    return (
      <Center h="100%">
        <Stack align="center" gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading project...
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <>
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        multiple
        style={{ display: "none" }}
        onChange={(event) => {
          void onCsvFilesSelected(event);
        }}
      />

      <input
        ref={jsonInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={(event) => {
          void onJsonFileSelected(event);
        }}
      />

      <AppShell header={{ height: 60 }} navbar={{ width: 320, breakpoint: 0 }} aside={{ width: 320, breakpoint: 0 }}>
        <AppShell.Header>
          <TopBar
            layout={project.uiState.layout}
            groupingMode={project.uiState.groupingMode}
            lockOnDrag={lockOnDrag}
            onImportCsv={onImportCsvClick}
            onExportJson={onExportJson}
            onImportJson={onImportJsonClick}
            onLayoutChange={setLayoutMode}
            onGroupingChange={setGrouping}
            onUnlockAll={unlockAll}
            onLockOnDragChange={setLockOnDrag}
          />
        </AppShell.Header>

        <AppShell.Navbar>
          <LeftSidebar
            filters={project.uiState.filters}
            filterMode={project.uiState.filterMode}
            groupingMode={project.uiState.groupingMode}
            groupOptions={groupOptions}
            subgroupOptions={subgroupOptions}
            typeOptions={typeOptions}
            tagOptions={tagOptions}
            collapsedGroupCount={project.uiState.collapsed.groups.length}
            collapsedSubgroupCount={project.uiState.collapsed.subgroups.length}
            errorCount={importErrors.length}
            onFiltersChange={setFilterPatch}
            onFilterModeChange={setMode}
            onCollapseAllGroups={() =>
              setCollapsed({
                ...project.uiState.collapsed,
                groups: allGroupKeys
              })
            }
            onExpandAllGroups={() =>
              setCollapsed({
                ...project.uiState.collapsed,
                groups: []
              })
            }
            onCollapseAllSubgroups={() =>
              setCollapsed({
                ...project.uiState.collapsed,
                subgroups: allSubgroupKeys
              })
            }
            onExpandAllSubgroups={() =>
              setCollapsed({
                ...project.uiState.collapsed,
                subgroups: []
              })
            }
          />
        </AppShell.Navbar>

        <AppShell.Aside>
          <Inspector selected={selectedElement} />
        </AppShell.Aside>

        <AppShell.Main>
          <Box h="calc(100vh - 60px)" style={{ display: "flex", flexDirection: "column" }}>
            <Box style={{ flex: 1, minHeight: 0 }}>
              <GraphCanvas />
            </Box>
            <ImportErrorsPanel errors={importErrors} />
          </Box>
        </AppShell.Main>
      </AppShell>
    </>
  );
}



