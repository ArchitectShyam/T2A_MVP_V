"use client";

import { createTaskInputSchema, type CreateTaskInput } from "@lifeos/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTask } from "@/lib/hooks/use-tasks";

/**
 * Add-task form. Validation uses the SAME Zod schema the API validates against
 * (`createTaskInputSchema` from `@lifeos/contracts`) — one source of truth.
 */
export function AddTaskForm() {
  const createTask = useCreateTask();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskInputSchema),
    defaultValues: { title: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await createTask.mutateAsync(values);
    reset({ title: "" });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" aria-label="Add task">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="What needs doing?"
          autoComplete="off"
          {...register("title")}
        />
        {errors.title ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.title.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding…" : "Add task"}
      </Button>
    </form>
  );
}
