"use client";

import type { Task } from "@lifeos/contracts";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompleteTask, useDeleteTask, useTasks } from "@/lib/hooks/use-tasks";
import { useUiStore } from "@/lib/store/ui-store";

function matchesFilter(task: Task, filter: string): boolean {
  if (filter === "active") return task.completedAt === null;
  if (filter === "completed") return task.completedAt !== null;
  return true;
}

export function TaskList() {
  const { data: tasks, isLoading, isError } = useTasks();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const filter = useUiStore((s) => s.filter);

  if (isLoading) return <p className="text-muted-foreground">Loading tasks…</p>;
  if (isError) return <p className="text-destructive">Could not load tasks.</p>;

  const visible = (tasks ?? []).filter((t) => matchesFilter(t, filter));

  if (visible.length === 0) {
    return <p className="text-muted-foreground">No tasks yet. Add one above.</p>;
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="Tasks">
      {visible.map((task) => {
        const done = task.completedAt !== null;
        return (
          <li
            key={task.id}
            className="flex items-center gap-3 rounded-md border p-3"
            data-testid="task-item"
          >
            <Checkbox
              checked={done}
              disabled={done || completeTask.isPending}
              onCheckedChange={() => {
                if (!done) completeTask.mutate(task.id);
              }}
              aria-label={`Complete ${task.title}`}
            />
            <span
              className={
                done ? "flex-1 text-muted-foreground line-through" : "flex-1"
              }
            >
              {task.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${task.title}`}
              onClick={() => deleteTask.mutate(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
