import type { NewTaskData, Task, TaskPatch } from "@lifeos/contracts";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { toDate, toTask } from "../mappers/task-mapper.js";
import { tasks } from "../schema/tasks.js";

/**
 * Drizzle-backed task repository.
 *
 * NOTE: this class deliberately does NOT import the `TaskRepository` interface
 * from `@lifeos/core` — that would invert the allowed dependency direction
 * (db -> contracts only). Instead it matches the interface *structurally*; the
 * compatibility check happens at the composition root where it is injected.
 */
export class DrizzleTaskRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewTaskData): Promise<Task> {
    const [row] = await this.db
      .insert(tasks)
      .values({
        userId: data.userId,
        title: data.title,
        notes: data.notes,
        dueAt: toDate(data.dueAt),
      })
      .returning();
    // `returning()` on a single insert always yields exactly one row.
    return toTask(row!);
  }

  async listByUser(userId: string): Promise<Task[]> {
    const rows = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));
    return rows.map(toTask);
  }

  async findById(userId: string, id: string): Promise<Task | null> {
    const [row] = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
      .limit(1);
    return row ? toTask(row) : null;
  }

  async update(userId: string, id: string, patch: TaskPatch): Promise<Task | null> {
    const [row] = await this.db
      .update(tasks)
      .set({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.dueAt !== undefined ? { dueAt: toDate(patch.dueAt) } : {}),
        ...(patch.completedAt !== undefined ? { completedAt: toDate(patch.completedAt) } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
      .returning();
    return row ? toTask(row) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
      .returning({ id: tasks.id });
    return rows.length > 0;
  }
}
