import Link from 'next/link'

type Props = {
  params: Promise<{ userId: string; slug: string }>
}

export default async function LiveSettingsStub({ params }: Props) {
  const { userId, slug } = await params

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-3">
        <h1 className="text-[#F5F5F5] text-xl font-medium">Settings</h1>
        <p className="text-[#888888] text-sm">
          Settings coming in Ticket 018.
        </p>
      </div>
      <Link
        href={`/live/${userId}/${slug}`}
        className="text-[#E8FF47] text-sm font-mono hover:underline"
      >
        ← Back to app
      </Link>
    </div>
  )
}
