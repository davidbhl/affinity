# Affinity Web (v0)

Local-first stakeholder map app (single project) with:
- strict CSV import (`nodes.csv` + `edges.csv`)
- Cytoscape graph rendering
- grouping modes (`none`, `group`, `group_subgroup`)
- manual collapse/expand fallback for compound nodes
- drag + lock persistence
- layouts (`fcose`, `dagre`)
- search + filters (`dim` / `hide`)
- IndexedDB persistence via Dexie
- JSON export/import (`project.json`)

## Dev

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test:run
```

## Notes
- Environment here did not include Node/npm, so install/build/test was not executed in this workspace.
- CSV import expects strict header names for required columns.
