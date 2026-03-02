export default function LiveLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-[#E8FF47] animate-pulse" />
        <p className="text-[#888888] font-mono text-xs tracking-widest">
          LOADING
        </p>
      </div>
    </div>
  )
}
