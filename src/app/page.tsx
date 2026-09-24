import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain px-6 pb-12 pt-[14vh] text-center">
      {/* PRD section 9 deliberately keeps this screen to headline + two
          buttons — the 10-second rule (4.4) means more copy or feature
          callouts would work against the goal, not toward it. This glow is
          purely decorative (fills the empty space a `justify-center` column
          leaves on a tall phone screen) rather than new information — same
          "materialize glow" move as the results reveal, just for the first
          screen instead of the last. Uses the theme token, not a hardcoded
          hex, so it repaints for free once the Modern Editorial palette
          lands (task #18). */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[6vh] h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-[70px]"
      />
      {/* A second, lower glow so the atmosphere carries down to the hero
          illustration below instead of the page having color only at the
          very top and nothing everywhere else. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[56vh] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-primary/[0.16] blur-[90px]"
      />

      <div className="relative flex flex-col gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Stop debating.
          <br />
          <span className="text-primary">SyncUp.</span>
        </h1>
        <p className="max-w-sm text-lg text-foreground-muted">
          Find something everyone actually wants to do.
        </p>
      </div>

      <div className="relative mt-10 flex w-full max-w-xs flex-col gap-4">
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
            className="rounded-pill border border-border px-8 py-4 text-lg font-semibold shadow-card transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
          >
            Join a SyncUp
          </Link>
        </div>
      </div>

      {/* The fanned three-card mark from the app icon, scaled up — brings
          that identity into the app itself instead of leaving it only on
          the home screen, and fills what used to be dead space between
          the buttons and the footer on a tall phone screen. Purely
          visual, no new copy, so the "headline + two buttons" rule above
          still holds. Fixed hex values, not theme tokens: this mirrors
          the actual icon file, which is a single static asset that never
          changes color between light and dark — --foreground/--secondary
          would flip on it in a way the real icon never does. */}
      <div
        aria-hidden
        className="relative flex min-h-[120px] flex-1 items-center justify-center"
      >
        <div className="flex items-center">
          <div className="-mr-4 h-[98px] w-[76px] rotate-[-16deg] rounded-2xl bg-[#2b2d42] shadow-[0_12px_24px_-8px_rgba(43,45,66,0.25)]" />
          <div className="z-10 h-[98px] w-[76px] rounded-2xl bg-primary shadow-[0_16px_32px_-8px_rgba(255,90,62,0.35)]" />
          <div className="-ml-4 h-[98px] w-[76px] rotate-[16deg] rounded-2xl bg-[#8d99ae] shadow-[0_12px_24px_-8px_rgba(43,45,66,0.2)]" />
        </div>
      </div>

      <p className="relative text-sm text-foreground-muted">No login required.</p>
    </main>
  );
}
