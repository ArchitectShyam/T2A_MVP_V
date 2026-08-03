"use client";

import type { CreateTaskInput, Task } from "@lifeos/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";

const tasksKey = ["tasks"] as const;

/** Load the current user's tasks. */
export function useTasks() {
  return useQuery({
    queryKey: tasksKey,
    queryFn: async (): Promise<Task[]> => {
      const res = await apiClient.api.v1.tasks.$get();
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      return data.tasks;
    },
  });
}

/** Create a task and refresh the list. */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<Task> => {
      const res = await apiClient.api.v1.tasks.$post({ json: input });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKey });
    },
  });
}

/** Complete a task with an optimistic update. */
export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Task> => {
      const res = await apiClient.api.v1.tasks[":id"].complete.$patch({
        param: { id },
      });
      if (!res.ok) throw new Error("Failed to complete task");
      return res.json();
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: tasksKey });
      const previous = queryClient.getQueryData<Task[]>(tasksKey);
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) =>
          t.id === id
            ? { ...t, completedAt: t.completedAt ?? new Date().toISOString() }
            : t,
        ),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(tasksKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKey });
    },
  });
}

/** Delete a task with an optimistic update. */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiClient.api.v1.tasks[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: tasksKey });
      const previous = queryClient.getQueryData<Task[]>(tasksKey);
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.filter((t) => t.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(tasksKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKey });
    },
  });
}
