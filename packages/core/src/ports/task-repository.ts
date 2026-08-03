import type { NewTaskData, Task, TaskPatch } from "@lifeos/contracts";

/**
 * Repository port (interface) owned by the business layer. `@lifeos/db`
 * provides a concrete implementation which is injected at the composition
 * root. `core` depends only on this abstraction — never on Drizzle/Supabase.
 */
export interface TaskRepository {
  create(data: NewTaskData): Promise<Task>;
  listByUser(userId: string): Promise<Task[]>;
  findById(userId: string, id: string): Promise<Task | null>;
  update(userId: string, id: string, patch: TaskPatch): Promise<Task | null>;
  delete(userId: string, id: string): Promise<boolean>;
}
