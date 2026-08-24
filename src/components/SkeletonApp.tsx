export function SkeletonApp() {
  return (
    <div className="min-h-screen bg-zinc-950 animate-pulse">

      {/* Navbar */}
      <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-8">
        <div className="h-8 w-36 rounded bg-zinc-800" />

        <div className="hidden md:flex gap-4">
          <div className="h-8 w-20 rounded bg-zinc-800" />
          <div className="h-8 w-20 rounded bg-zinc-800" />
          <div className="h-8 w-20 rounded bg-zinc-800" />
        </div>

        <div className="flex gap-3">
          <div className="h-10 w-24 rounded-lg bg-zinc-800" />
          <div className="h-10 w-10 rounded-full bg-zinc-800" />
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-7xl px-6 py-20">

        <div className="h-14 w-2/3 rounded bg-zinc-800 mb-6" />

        <div className="h-6 w-1/2 rounded bg-zinc-800 mb-12" />

        <div className="flex gap-4">
          <div className="h-14 w-40 rounded-xl bg-zinc-800" />
          <div className="h-14 w-40 rounded-xl bg-zinc-800" />
        </div>

        <div className="mt-20 grid grid-cols-3 gap-6">

          <div className="h-56 rounded-2xl bg-zinc-900" />
          <div className="h-56 rounded-2xl bg-zinc-900" />
          <div className="h-56 rounded-2xl bg-zinc-900" />

        </div>

      </div>

    </div>
  );
}