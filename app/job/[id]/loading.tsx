export default function JobLoading() {
  return (
    <main className="bg-mesh bg-noise min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="h-3 w-28 bg-surface rounded animate-pulse" />
          <div className="h-3 w-16 bg-surface rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
          <div className="h-48 bg-surface border border-border rounded-md animate-pulse" />
          <div className="h-48 w-56 bg-surface border border-border rounded-md animate-pulse hidden md:block" />
        </div>
        <div className="h-64 bg-surface border border-border rounded-md animate-pulse" />
      </div>
    </main>
  )
}
