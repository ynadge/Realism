import Link from 'next/link'

export default function LiveNotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-3">
        <p className="text-[#888888] font-mono text-sm tracking-widest uppercase">
          404
        </p>
        <h1 className="text-[#F5F5F5] text-2xl font-medium">
          App not found
        </h1>
        <p className="text-[#888888] text-sm max-w-sm">
          This Live app may have been deleted or the link is incorrect.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="text-[#E8FF47] text-sm font-mono hover:underline"
      >
        ← Back to dashboard
      </Link>
    </div>
  )
}
