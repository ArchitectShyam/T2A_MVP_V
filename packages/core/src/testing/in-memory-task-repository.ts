import type { NewTaskData, Task, TaskPatch } from "@lifeos/contracts";
import type { TaskRepository } from "../ports/task-repository.js";

/**
 * In-memory fake `TaskRepository` for unit tests. Mirrors the real repository's
 * semantics (user scoping, newest-first ordering) without any database.
 */
export class InMemoryTaskRepository implements TaskRepository {
  private readonly store = new Map<string, Task>();
  private seq = 0;

  constructor(private readonly now: () => Date = () => new Date()) {}

  async create(data: NewTaskData): Promise<Task> {
    const timestamp = this.now().toISOString();
    const task: Task = {
      id: `00000000-0000-4000-8000-${(++this.seq).toString().padStart(12, "0")}`,
      userId: data.userId,
      title: data.title,
      notes: data.notes,
      dueAt: data.dueAt,
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.store.set(task.id, task);
    return structuredClone(task);
  }

  async listByUser(userId: string): Promise<Task[]> {
    return [...this.store.values()]
      .filter((t) => t.userId === userId)
      .sort((a, b) => {
        // Newest first; fall back to insertion order (encoded in the id) when
        // two tasks share a createdAt timestamp.
        const byCreated = b.createdAt.localeCompare(a.createdAt);
        return byCreated !== 0 ? byCreated : b.id.localeCompare(a.id);
      })
      .map((t) => structuredClone(t));
  }

  async findById(userId: string, id: string): Promise<Task | null> {
    const task = this.store.get(id);
    return task && task.userId === userId ? structuredClone(task) : null;
  }

  async update(userId: string, id: string, patch: TaskPatch): Promise<Task | null> {
    const task = this.store.get(id);
    if (!task || task.userId !== userId) return null;
    const next: Task = {
      ...task,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt } : {}),
      ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
      updatedAt: this.now().toISOString(),
    };
    this.store.set(id, next);
    return structuredClone(next);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const task = this.store.get(id);
    if (!task || task.userId !== userId) return false;
    return this.store.delete(id);
  }
}
