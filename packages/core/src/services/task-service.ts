import {
  createTaskInputSchema,
  updateTaskInputSchema,
  type CreateTaskInput,
  type Task,
  type UpdateTaskInput,
} from "@lifeos/contracts";
import type { ServiceContext } from "../context.js";
import { NotFoundError } from "../errors.js";

/**
 * Task use-cases. Every function takes the request `ctx` (which carries the
 * authenticated `userId` and the injected repositories) and applies business
 * rules before delegating persistence to the repository port.
 */

/** Create a task owned by the current user. */
async function createTask(ctx: ServiceContext, input: CreateTaskInput): Promise<Task> {
  // Re-validate at the business boundary; never trust the caller.
  const data = createTaskInputSchema.parse(input);
  return ctx.repos.tasks.create({
    userId: ctx.userId,
    title: data.title,
    notes: data.notes ?? null,
    dueAt: data.dueAt ?? null,
  });
}

/** List the current user's tasks (newest first — ordering enforced by the repo). */
async function listTasks(ctx: ServiceContext): Promise<Task[]> {
  return ctx.repos.tasks.listByUser(ctx.userId);
}

/** Fetch a single task or throw if it does not belong to the current user. */
async function getTask(ctx: ServiceContext, id: string): Promise<Task> {
  const task = await ctx.repos.tasks.findById(ctx.userId, id);
  if (!task) throw new NotFoundError("Task not found");
  return task;
}

/** Apply a partial update to a task the current user owns. */
async function updateTask(
  ctx: ServiceContext,
  id: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const patch = updateTaskInputSchema.parse(input);
  const updated = await ctx.repos.tasks.update(ctx.userId, id, patch);
  if (!updated) throw new NotFoundError("Task not found");
  return updated;
}

/**
 * Complete a task.
 *
 * Business rule: completing an already-completed task is a no-op — we return
 * the existing task unchanged rather than overwriting its `completedAt`.
 */
async function completeTask(ctx: ServiceContext, id: string): Promise<Task> {
  const existing = await ctx.repos.tasks.findById(ctx.userId, id);
  if (!existing) throw new NotFoundError("Task not found");
  if (existing.completedAt !== null) return existing;

  const completed = await ctx.repos.tasks.update(ctx.userId, id, {
    completedAt: new Date().toISOString(),
  });
  if (!completed) throw new NotFoundError("Task not found");
  return completed;
}

/** Delete a task the current user owns. Throws if it does not exist. */
async function deleteTask(ctx: ServiceContext, id: string): Promise<void> {
  const deleted = await ctx.repos.tasks.delete(ctx.userId, id);
  if (!deleted) throw new NotFoundError("Task not found");
}

export const taskService = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  completeTask,
  deleteTask,
};
