import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 overflow-y-auto overscroll-contain px-6 py-16 text-center">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Stop debating.
          <br />
          <span className="text-primary">SyncUp.</span>
        </h1>
        <p className="max-w-sm text-lg text-foreground-muted">
          Find something everyone actually wants to do.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-4">
        <Link
          href="/create"
          className="rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
        >
          Start a SyncUp
        </Link>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-foreground-muted">Already have a code?</p>
          <Link
            href="/join"
            className="rounded-pill border border-border px-8 py-4 text-lg font-semibold transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
          >
            Join a SyncUp
          </Link>
        </div>
      </div>

      <p className="text-sm text-foreground-muted">No login required.</p>
    </main>
  );
}
