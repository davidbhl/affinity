import cytoscape, { type Stylesheet } from "cytoscape";
import dagre from "cytoscape-dagre";
import fcose from "cytoscape-fcose";

let pluginsReady = false;

export function ensureCytoscapePlugins(): void {
  if (pluginsReady) {
    return;
  }
  cytoscape.use(dagre);
  cytoscape.use(fcose);
  pluginsReady = true;
}

export const graphStyles: Stylesheet[] = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "text-wrap": "wrap",
      "text-max-width": 120,
      "font-size": 11,
      "background-color": "#4f86f7",
      color: "#1f2937",
      "text-valign": "center",
      "text-halign": "center",
      width: 38,
      height: 38,
      "border-width": 1,
      "border-color": "#dbe3f5"
    }
  },
  {
    selector: "node[isRealNode = 1][type = 'team']",
    style: {
      "background-color": "#f4d06f",
      width: 46,
      height: 46
    }
  },
  {
    selector: "node[isRealNode = 1][type = 'cluster']",
    style: {
      "background-color": "#6cc8a6",
      width: 56,
      height: 56
    }
  },
  {
    selector: "node[isRealNode = 1][status = 'future']",
    style: {
      "border-style": "dashed",
      "border-width": 2,
      "border-color": "#6b7280"
    }
  },
  {
    selector: "node[kind = 'group']",
    style: {
      "background-color": "#f6f7fb",
      "border-color": "#9ca3af",
      "border-width": 2,
      "text-valign": "top",
      "text-halign": "center",
      "font-size": 12,
      padding: 18,
      shape: "round-rectangle"
    }
  },
  {
    selector: "node[kind = 'subgroup']",
    style: {
      "background-color": "#fbf7ef",
      "border-color": "#a3a3a3",
      "border-width": 1,
      "text-valign": "top",
      "text-halign": "center",
      "font-size": 11,
      padding: 12,
      shape: "round-rectangle"
    }
  },
  {
    selector: "edge",
    style: {
      width: 1.5,
      "line-color": "#8d99ae",
      "curve-style": "bezier",
      "target-arrow-shape": "none",
      "target-arrow-color": "#8d99ae"
    }
  },
  {
    selector: "edge[directed = 1]",
    style: {
      "target-arrow-shape": "triangle"
    }
  },
  {
    selector: "edge[isProxy = 1]",
    style: {
      "line-style": "dashed",
      width: 2,
      label: "data(weight)",
      "font-size": 10,
      color: "#374151"
    }
  },
  {
    selector: ".dimmed",
    style: {
      opacity: 0.18
    }
  },
  {
    selector: ".hidden-by-filter",
    style: {
      display: "none"
    }
  },
  {
    selector: ".collapsed-hidden",
    style: {
      display: "none"
    }
  },
  {
    selector: ".selection-focus",
    style: {
      "overlay-opacity": 0,
      "border-width": 3,
      "border-color": "#f97316",
      width: "mapData(weight, 1, 20, 1.5, 4)",
      "line-color": "#f97316",
      "target-arrow-color": "#f97316"
    }
  },
  {
    selector: ".selection-fade",
    style: {
      opacity: 0.12
    }
  }
];
