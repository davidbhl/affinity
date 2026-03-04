import type cytoscape from "cytoscape";

import type { LayoutName } from "@/types/project";

export function createLayout(cy: cytoscape.Core, layout: LayoutName): cytoscape.Layouts {
  if (layout === "dagre") {
    return cy.layout({
      name: "dagre",
      rankDir: "LR",
      animate: false,
      fit: true,
      padding: 40,
      nodeSep: 60,
      rankSep: 100
    });
  }

  return cy.layout({
    name: "fcose",
    animate: false,
    fit: true,
    padding: 40,
    randomize: false,
    quality: "proof",
    nodeRepulsion: 6000,
    idealEdgeLength: 100,
    edgeElasticity: 0.25
  });
}

export function runLayout(cy: cytoscape.Core, layout: LayoutName): Promise<void> {
  return new Promise((resolve) => {
    const instance = createLayout(cy, layout);
    instance.on("layoutstop", () => resolve());
    instance.run();
  });
}
