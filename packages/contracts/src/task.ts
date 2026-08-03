import { z } from "zod";
import { uuidSchema } from "./common.js";

/**
 * Tasks domain contract.
 *
 * This module is the single source of truth for the Task shape. Every other
 * layer (db rows, core services, api responses, web forms) maps to/from these
 * types — Drizzle/Supabase types must never leak upward.
 */

/** The canonical Task domain type (camelCase, ISO date strings). */
export const taskSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  title: z.string().min(1).max(500),
  notes: z.string().max(10_000).nullable(),
  /** ISO-8601 timestamp or null. */
  dueAt: z.string().datetime({ offset: true }).nullable(),
  /** ISO-8601 timestamp or null; non-null means the task is completed. */
  completedAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Task = z.infer<typeof taskSchema>;

/** Input accepted when creating a task (client -> api). */
export const createTaskInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  notes: z.string().max(10_000).nullable().optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

/** Input accepted when updating a task. All fields optional. */
export const updateTaskInputSchema = z
  .object({
    title: z.string().min(1).max(500),
    notes: z.string().max(10_000).nullable(),
    dueAt: z.string().datetime({ offset: true }).nullable(),
  })
  .partial();

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

/** The wire representation of a single task returned by the API. */
export const taskResponseSchema = taskSchema;
export type TaskResponse = z.infer<typeof taskResponseSchema>;

/** The wire representation of a task list. */
export const taskListResponseSchema = z.object({
  tasks: z.array(taskResponseSchema),
});
export type TaskListResponse = z.infer<typeof taskListResponseSchema>;

/** Path param schema for routes addressing a single task. */
export const taskIdParamSchema = z.object({
  id: uuidSchema,
});
export type TaskIdParam = z.infer<typeof taskIdParamSchema>;

/**
 * Persistence-facing data shapes. These describe the *data* a repository
 * receives, independent of any ORM. They live in `contracts` so the `core`
 * interface and the `db` implementation agree on shape without `db` ever
 * importing from `core` (dependency direction stays db -> contracts only).
 */
export type NewTaskData = {
  userId: string;
  title: string;
  notes: string | null;
  /** ISO-8601 or null. */
  dueAt: string | null;
};

export type TaskPatch = Partial<{
  title: string;
  notes: string | null;
  /** ISO-8601 or null. */
  dueAt: string | null;
  /** ISO-8601 or null; null clears completion. */
  completedAt: string | null;
}>;
