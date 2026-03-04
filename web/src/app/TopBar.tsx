import { Button, Group, SegmentedControl, Switch } from "@mantine/core";

import type { GroupingMode, LayoutName } from "@/types/project";

type TopBarProps = {
  layout: LayoutName;
  groupingMode: GroupingMode;
  lockOnDrag: boolean;
  onImportCsv: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onLayoutChange: (layout: LayoutName) => void;
  onGroupingChange: (mode: GroupingMode) => void;
  onUnlockAll: () => void;
  onLockOnDragChange: (value: boolean) => void;
};

export function TopBar(props: TopBarProps): JSX.Element {
  return (
    <Group justify="space-between" wrap="nowrap" px="sm" style={{ height: "100%" }}>
      <Group gap="xs" wrap="nowrap">
        <Button size="xs" variant="filled" onClick={props.onImportCsv}>
          Import CSVs
        </Button>
        <Button size="xs" variant="light" onClick={props.onExportJson}>
          Export JSON
        </Button>
        <Button size="xs" variant="light" onClick={props.onImportJson}>
          Import JSON
        </Button>
      </Group>

      <Group gap="sm" wrap="nowrap">
        <SegmentedControl
          size="xs"
          value={props.layout}
          onChange={(value) => props.onLayoutChange(value as LayoutName)}
          data={[
            { label: "fcose", value: "fcose" },
            { label: "dagre", value: "dagre" }
          ]}
        />

        <SegmentedControl
          size="xs"
          value={props.groupingMode}
          onChange={(value) => props.onGroupingChange(value as GroupingMode)}
          data={[
            { label: "None", value: "none" },
            { label: "Group", value: "group" },
            { label: "Group > Subgroup", value: "group_subgroup" }
          ]}
        />

        <Switch
          size="xs"
          checked={props.lockOnDrag}
          label="Lock on drag"
          onChange={(event) => props.onLockOnDragChange(event.currentTarget.checked)}
        />

        <Button size="xs" variant="default" onClick={props.onUnlockAll}>
          Unlock all
        </Button>
      </Group>
    </Group>
  );
}
