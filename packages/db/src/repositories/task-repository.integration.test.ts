import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createDbClient, type Database } from "../client.js";
import { DrizzleTaskRepository } from "./task-repository.js";

/**
 * Integration test for the real Drizzle repository. Requires a running database
 * (e.g. `supabase start` + `pnpm db:migrate`). It is skipped automatically when
 * DATABASE_URL is not set, so unit runs never depend on a database.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const enabled = Boolean(DATABASE_URL);

describe.skipIf(!enabled)("DrizzleTaskRepository (integration)", () => {
  // Guarded so nothing connects when the suite is skipped.
  let db: Database | null = null;
  let repo: DrizzleTaskRepository | null = null;
  if (enabled) {
    db = createDbClient(DATABASE_URL!);
    repo = new DrizzleTaskRepository(db);
  }

  const userId = randomUUID();
  const created: string[] = [];

  afterAll(async () => {
    if (!repo) return;
    for (const id of created) {
      await repo.delete(userId, id).catch(() => undefined);
    }
  });

  it("creates, lists, completes and deletes a task", async () => {
    const r = repo!;
    const task = await r.create({
      userId,
      title: "integration task",
      notes: null,
      dueAt: null,
    });
    created.push(task.id);
    expect(task.title).toBe("integration task");
    expect(task.completedAt).toBeNull();

    const list = await r.listByUser(userId);
    expect(list.some((t) => t.id === task.id)).toBe(true);

    const completed = await r.update(userId, task.id, {
      completedAt: new Date().toISOString(),
    });
    expect(completed?.completedAt).not.toBeNull();

    const deleted = await r.delete(userId, task.id);
    expect(deleted).toBe(true);
    created.pop();
  });
});
