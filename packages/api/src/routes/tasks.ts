import { createRoute } from "@hono/zod-openapi";
import {
  createTaskInputSchema,
  errorResponseSchema,
  taskIdParamSchema,
  taskListResponseSchema,
  taskResponseSchema,
} from "@lifeos/contracts";

/**
 * OpenAPI route definitions for the Tasks resource. These are pure metadata —
 * handlers live in `app.ts`. Every route documents its success + error
 * responses so the generated spec is complete.
 */

const jsonError = (description: string) => ({
  description,
  content: { "application/json": { schema: errorResponseSchema } },
});

const unauthorized = jsonError("Missing or invalid authentication");
const serverError = jsonError("Unexpected server error");

export const listTasksRoute = createRoute({
  method: "get",
  path: "/api/v1/tasks",
  tags: ["Tasks"],
  summary: "List the current user's tasks",
  responses: {
    200: {
      description: "The user's tasks, newest first",
      content: { "application/json": { schema: taskListResponseSchema } },
    },
    401: unauthorized,
    500: serverError,
  },
});

export const createTaskRoute = createRoute({
  method: "post",
  path: "/api/v1/tasks",
  tags: ["Tasks"],
  summary: "Create a task",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createTaskInputSchema } },
    },
  },
  responses: {
    201: {
      description: "The created task",
      content: { "application/json": { schema: taskResponseSchema } },
    },
    400: jsonError("Validation failed"),
    401: unauthorized,
    500: serverError,
  },
});

export const completeTaskRoute = createRoute({
  method: "patch",
  path: "/api/v1/tasks/{id}/complete",
  tags: ["Tasks"],
  summary: "Mark a task complete (no-op if already complete)",
  request: {
    params: taskIdParamSchema,
  },
  responses: {
    200: {
      description: "The completed task",
      content: { "application/json": { schema: taskResponseSchema } },
    },
    400: jsonError("Invalid task id"),
    401: unauthorized,
    404: jsonError("Task not found"),
    500: serverError,
  },
});

export const deleteTaskRoute = createRoute({
  method: "delete",
  path: "/api/v1/tasks/{id}",
  tags: ["Tasks"],
  summary: "Delete a task",
  request: {
    params: taskIdParamSchema,
  },
  responses: {
    204: {
      description: "Task deleted",
    },
    400: jsonError("Invalid task id"),
    401: unauthorized,
    404: jsonError("Task not found"),
    500: serverError,
  },
});
