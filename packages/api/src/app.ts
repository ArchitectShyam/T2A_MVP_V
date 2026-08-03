import { OpenAPIHono } from "@hono/zod-openapi";
import { ErrorCode } from "@lifeos/contracts";
import { taskService, type ServiceContext } from "@lifeos/core";
import { createMiddleware } from "hono/factory";
import type { AppDeps, AppVariables } from "./deps.js";
import { scalarDocsHtml } from "./docs.js";
import { errorBody, mapError } from "./errors.js";
import {
  completeTaskRoute,
  createTaskRoute,
  deleteTaskRoute,
  listTasksRoute,
} from "./routes/tasks.js";

/**
 * Composes the Hono transport app from injected dependencies. Routes do exactly
 * three things: validate input (Zod, via the route schemas) -> call a `core`
 * service -> map the result to a response schema. No business logic lives here.
 */
export function createApp(deps: AppDeps) {
  const auth = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const userId = await deps.authenticate(c);
    if (!userId) {
      return c.json(errorBody(ErrorCode.UNAUTHORIZED, "Authentication required"), 401);
    }
    c.set("userId", userId);
    await next();
  });

  const app = new OpenAPIHono<{ Variables: AppVariables }>({
    // Uniform validation error envelope for every route.
    defaultHook: (result, c) => {
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));
        return c.json(
          errorBody(ErrorCode.VALIDATION, "Validation failed", details),
          400,
        );
      }
    },
  });

  // Authentication applies to every /api/v1/tasks route (but not the docs/spec).
  app.use("/api/v1/tasks", auth);
  app.use("/api/v1/tasks/*", auth);

  const ctx = (userId: string): ServiceContext => ({ userId, repos: deps.repos });

  const routes = app
    .openapi(listTasksRoute, async (c) => {
      const tasks = await taskService.listTasks(ctx(c.get("userId")));
      return c.json({ tasks }, 200);
    })
    .openapi(createTaskRoute, async (c) => {
      const input = c.req.valid("json");
      const task = await taskService.createTask(ctx(c.get("userId")), input);
      return c.json(task, 201);
    })
    .openapi(completeTaskRoute, async (c) => {
      const { id } = c.req.valid("param");
      const task = await taskService.completeTask(ctx(c.get("userId")), id);
      return c.json(task, 200);
    })
    .openapi(deleteTaskRoute, async (c) => {
      const { id } = c.req.valid("param");
      await taskService.deleteTask(ctx(c.get("userId")), id);
      return c.body(null, 204);
    });

  // OpenAPI document + human-friendly docs.
  app.doc("/api/v1/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "LifeOS API",
      version: "1.0.0",
      description: "Transport layer for LifeOS. All routes are versioned under /api/v1.",
    },
  });
  app.get("/api/v1/docs", (c) => c.html(scalarDocsHtml("/api/v1/openapi.json")));

  // Translate thrown domain errors into the standard error envelope.
  app.onError((err, c) => {
    const { status, body } = mapError(err);
    return c.json(body, status);
  });

  return routes;
}

/** The concrete app type used to derive the typed `hc` client. */
export type AppType = ReturnType<typeof createApp>;
