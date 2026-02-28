export default function DashboardLoading() {
  return (
    <main className="bg-mesh bg-noise min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="h-3 w-32 bg-surface rounded animate-pulse" />
          <div className="h-3 w-20 bg-surface rounded animate-pulse" />
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-surface border border-border rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  )
}
