import { createEmptyProject, parseProjectOrThrow, type Project } from "@/types/project";

import { db } from "./db";

export async function loadProject(): Promise<Project> {
  const existing = await db.projects.get("default");
  if (!existing) {
    const project = createEmptyProject();
    await db.projects.put(project);
    return project;
  }
  return parseProjectOrThrow(existing);
}

export async function saveProject(project: Project): Promise<void> {
  const stamped: Project = {
    ...project,
    updatedAt: new Date().toISOString()
  };
  await db.projects.put(stamped);
}

export async function replaceProject(project: Project): Promise<void> {
  await db.projects.put(project);
}

export async function clearProject(): Promise<void> {
  await db.projects.delete("default");
}
