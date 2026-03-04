import Dexie, { type Table } from "dexie";

import type { Project } from "@/types/project";

export class AffinityDB extends Dexie {
  projects!: Table<Project, string>;

  constructor() {
    super("affinity-db");
    this.version(1).stores({
      projects: "id, updatedAt"
    });
  }
}

export const db = new AffinityDB();
