import {
  Badge,
  Button,
  Group,
  MultiSelect,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core";

import type { FilterMode, Filters, GroupingMode } from "@/types/project";

type LeftSidebarProps = {
  filters: Filters;
  filterMode: FilterMode;
  groupingMode: GroupingMode;
  groupOptions: string[];
  subgroupOptions: string[];
  typeOptions: string[];
  tagOptions: string[];
  collapsedGroupCount: number;
  collapsedSubgroupCount: number;
  errorCount: number;
  onFiltersChange: (patch: Partial<Filters>) => void;
  onFilterModeChange: (mode: FilterMode) => void;
  onCollapseAllGroups: () => void;
  onExpandAllGroups: () => void;
  onCollapseAllSubgroups: () => void;
  onExpandAllSubgroups: () => void;
};

function toOptions(values: string[]): { value: string; label: string }[] {
  return values.map((value) => ({ value, label: value }));
}

export function LeftSidebar(props: LeftSidebarProps): JSX.Element {
  const groupEnabled = props.groupingMode === "group" || props.groupingMode === "group_subgroup";
  const subgroupEnabled = props.groupingMode === "group_subgroup";

  return (
    <Stack p="sm" gap="sm">
      <Group justify="space-between" align="center">
        <Title order={5}>Filters</Title>
        <Badge color={props.errorCount > 0 ? "red" : "gray"} variant="light">
          {props.errorCount} import errors
        </Badge>
      </Group>

      <TextInput
        size="xs"
        label="Search"
        value={props.filters.search}
        placeholder="label or id"
        onChange={(event) => props.onFiltersChange({ search: event.currentTarget.value })}
      />

      <MultiSelect
        size="xs"
        label="Group"
        data={toOptions(props.groupOptions)}
        value={props.filters.groups}
        searchable
        clearable
        onChange={(value) => props.onFiltersChange({ groups: value })}
      />

      <MultiSelect
        size="xs"
        label="Subgroup"
        data={toOptions(props.subgroupOptions)}
        value={props.filters.subgroups}
        searchable
        clearable
        onChange={(value) => props.onFiltersChange({ subgroups: value })}
      />

      <MultiSelect
        size="xs"
        label="Type"
        data={toOptions(props.typeOptions)}
        value={props.filters.types}
        searchable
        clearable
        onChange={(value) => props.onFiltersChange({ types: value })}
      />

      <MultiSelect
        size="xs"
        label="Tags"
        data={toOptions(props.tagOptions)}
        value={props.filters.tags}
        searchable
        clearable
        onChange={(value) => props.onFiltersChange({ tags: value })}
      />

      <Stack gap={4}>
        <Text size="xs" fw={500}>
          Filter Mode
        </Text>
        <SegmentedControl
          size="xs"
          value={props.filterMode}
          onChange={(value) => props.onFilterModeChange(value as FilterMode)}
          data={[
            { label: "Dim", value: "dim" },
            { label: "Hide", value: "hide" }
          ]}
        />
      </Stack>

      <Stack gap={6}>
        <Text size="xs" fw={500}>
          Collapse / Expand
        </Text>

        <Group grow>
          <Button size="xs" variant="default" disabled={!groupEnabled} onClick={props.onCollapseAllGroups}>
            Collapse groups
          </Button>
          <Button size="xs" variant="light" disabled={!groupEnabled} onClick={props.onExpandAllGroups}>
            Expand groups
          </Button>
        </Group>

        <Group grow>
          <Button size="xs" variant="default" disabled={!subgroupEnabled} onClick={props.onCollapseAllSubgroups}>
            Collapse subgroups
          </Button>
          <Button size="xs" variant="light" disabled={!subgroupEnabled} onClick={props.onExpandAllSubgroups}>
            Expand subgroups
          </Button>
        </Group>

        <Text size="xs" c="dimmed">
          Collapsed: groups {props.collapsedGroupCount}, subgroups {props.collapsedSubgroupCount}
        </Text>
      </Stack>
    </Stack>
  );
}
