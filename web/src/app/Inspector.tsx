import { ScrollArea, Stack, Text, Title } from "@mantine/core";

type InspectorProps = {
  selected: {
    kind: "node" | "edge";
    id: string;
    data: Record<string, unknown>;
  } | null;
};

export function Inspector(props: InspectorProps): JSX.Element {
  const { selected } = props;

  return (
    <Stack p="sm" gap="sm" h="100%">
      <Title order={5}>Inspector</Title>
      {!selected && (
        <Text size="sm" c="dimmed">
          Select a node or edge to inspect fields.
        </Text>
      )}

      {selected && (
        <>
          <Text size="sm" fw={600}>
            {selected.kind.toUpperCase()}: {selected.id}
          </Text>
          <ScrollArea h="calc(100vh - 180px)">
            <pre className="inspector-json">{JSON.stringify(selected.data, null, 2)}</pre>
          </ScrollArea>
        </>
      )}
    </Stack>
  );
}
