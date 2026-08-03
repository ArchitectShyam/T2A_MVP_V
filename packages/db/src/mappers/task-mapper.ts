import type { Task } from "@lifeos/contracts";
import type { TaskRow } from "../schema/tasks.js";

/** Maps a snake_case Drizzle row to the camelCase `Task` domain type. */
export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    notes: row.notes,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Parses an ISO string (or null) into a Date (or null) for persistence. */
export function toDate(iso: string | null | undefined): Date | null {
  return iso ? new Date(iso) : null;
}
