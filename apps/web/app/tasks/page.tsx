import { redirect } from "next/navigation";
import { TasksView } from "@/components/tasks/tasks-view";
import { getCurrentUser } from "@/server/auth";

// Auth- and cookie-dependent; never statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="container flex flex-col gap-6 py-10">
      <TasksView />
    </main>
  );
}
