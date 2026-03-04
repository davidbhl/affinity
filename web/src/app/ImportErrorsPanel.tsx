import { ScrollArea, Table, Text } from "@mantine/core";

import type { CsvValidationError } from "@/types/project";

type ImportErrorsProps = {
  errors: CsvValidationError[];
};

export function ImportErrorsPanel({ errors }: ImportErrorsProps): JSX.Element | null {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", background: "#fff", padding: 8 }}>
      <Text size="sm" fw={600} c="red">
        Import errors ({errors.length})
      </Text>
      <ScrollArea h={160}>
        <Table striped highlightOnHover withColumnBorders withTableBorder mt="xs" fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Row</Table.Th>
              <Table.Th>Column</Table.Th>
              <Table.Th>Message</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {errors.map((error, index) => (
              <Table.Tr key={`${error.row}-${error.column ?? ""}-${index}`}>
                <Table.Td>{error.row}</Table.Td>
                <Table.Td>{error.column ?? "-"}</Table.Td>
                <Table.Td>{error.message}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </div>
  );
}
