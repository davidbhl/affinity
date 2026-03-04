# Stakeholder Template Extraction

Source SVG: C:\Users\david.brownstein\Downloads\Stakeholder Mapping.svg
Extraction date: 2026-03-04
Script: tools/extract_stakeholder_templates.ps1

Generated files:
- nodes.csv
- edges.csv

Node schema (nodes.csv):
- id,label,type,group,subgroup,tags,status
- id and label are cleaned human-readable labels.
- type is inferred from node size:
  - ~115.2 => person
  - ~152.6 => team
  - >= ~186.4 => cluster
- status is future when label includes (Future) or faded fill styling is detected.
- group, subgroup, and tags are intentionally blank.

Edge schema (edges.csv):
- source,target,kind,directed,weight
- kind is always relates_to
- directed is always false
- weight is always 1
- Relationships are treated as undirected and deduplicated (A-B same as B-A).

Validation checks:
- nodes.csv row count is exactly 81
- Connector path count is exactly 94
- edges.csv row count is exactly 94
- Node IDs are unique
- Every edge endpoint exists in nodes.csv
- No empty IDs/labels/sources/targets
- No self-loop edges

High endpoint-fit edges (visual QA candidates):
- Craig <-> Origin (max endpoint-fit error: 54.1)
- Leadership & Direction <-> Tom (max endpoint-fit error: 24.76)

Known caveats:
- Endpoint mapping uses nearest node boundary distance and can produce outliers for long or crossing curves.
- Keep IDs human-readable (no slug conversion) to match source labels exactly.
