export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted-foreground">
        LifeOS can&apos;t reach the network right now. Reconnect to sync your tasks.
      </p>
    </main>
  );
}
