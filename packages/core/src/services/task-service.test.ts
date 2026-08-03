import { beforeEach, describe, expect, it } from "vitest";
import type { ServiceContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { InMemoryTaskRepository } from "../testing/in-memory-task-repository.js";
import { taskService } from "./task-service.js";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

describe("taskService", () => {
  let ctx: ServiceContext;

  beforeEach(() => {
    ctx = { userId: USER_A, repos: { tasks: new InMemoryTaskRepository() } };
  });

  it("creates a task owned by the current user", async () => {
    const task = await taskService.createTask(ctx, { title: "Buy milk" });
    expect(task.userId).toBe(USER_A);
    expect(task.title).toBe("Buy milk");
    expect(task.completedAt).toBeNull();
  });

  it("rejects an empty title", async () => {
    await expect(taskService.createTask(ctx, { title: "" })).rejects.toThrow();
  });

  it("lists only the current user's tasks, newest first", async () => {
    await taskService.createTask(ctx, { title: "first" });
    await taskService.createTask(ctx, { title: "second" });
    const otherCtx: ServiceContext = { userId: USER_B, repos: ctx.repos };
    await taskService.createTask(otherCtx, { title: "not mine" });

    const tasks = await taskService.listTasks(ctx);
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.title)).toEqual(["second", "first"]);
  });

  it("completes a task by setting completedAt", async () => {
    const created = await taskService.createTask(ctx, { title: "ship it" });
    const completed = await taskService.completeTask(ctx, created.id);
    expect(completed.completedAt).not.toBeNull();
  });

  it("is a no-op when completing an already-completed task", async () => {
    const created = await taskService.createTask(ctx, { title: "done once" });
    const first = await taskService.completeTask(ctx, created.id);
    const second = await taskService.completeTask(ctx, created.id);
    // Same completion timestamp — not overwritten.
    expect(second.completedAt).toBe(first.completedAt);
  });

  it("throws NotFoundError when completing another user's task", async () => {
    const otherCtx: ServiceContext = { userId: USER_B, repos: ctx.repos };
    const created = await taskService.createTask(otherCtx, { title: "theirs" });
    await expect(taskService.completeTask(ctx, created.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("deletes a task the user owns", async () => {
    const created = await taskService.createTask(ctx, { title: "temp" });
    await taskService.deleteTask(ctx, created.id);
    await expect(taskService.getTask(ctx, created.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
