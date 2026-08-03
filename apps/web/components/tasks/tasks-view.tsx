"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUiStore, type TaskFilter } from "@/lib/store/ui-store";
import { AddTaskForm } from "./add-task-form";
import { TaskList } from "./task-list";

const FILTERS: TaskFilter[] = ["all", "active", "completed"];

export function TasksView() {
  const filter = useUiStore((s) => s.filter);
  const setFilter = useUiStore((s) => s.setFilter);

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <AddTaskForm />
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f[0]!.toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <TaskList />
      </CardContent>
    </Card>
  );
}
