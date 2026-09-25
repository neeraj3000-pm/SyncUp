import Link from "next/link";
import { CardFanHero } from "@/components/CardFanHero";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain px-6 pb-8 pt-6 text-center">
      {/* PRD section 9 deliberately keeps this screen to headline + two
          buttons — the 10-second rule (4.4) means more copy or feature
          callouts would work against the goal, not toward it. This glow is
          purely decorative rather than new information — same "materialize
          glow" move as the results reveal, just for the first screen
          instead of the last. Uses the theme token, not a hardcoded hex,
          so it repaints for free once the Modern Editorial palette lands
          (task #18). */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[6vh] h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-[70px]"
      />
      {/* A second, lower glow so the atmosphere carries down the page
          instead of the page having color only at the very top. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[56vh] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-primary/[0.16] blur-[90px]"
      />

      {/* Brings the app icon's identity into the app itself, at the top of
          the screen — matching where this same illustration sits on every
          other screen that has it (join, "X wants to decide...") instead
          of being the one place it was bottom-anchored. Its own flex-1
          absorbs the leftover space above the headline/buttons, which is
          what pushes that block down toward the bottom of the screen —
          easier to reach one-handed — without risking overflow on a
          shorter viewport the way a hard-coded bottom anchor would. */}
      <CardFanHero />

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

      {/* A plain zero-basis spacer, not flex-1 on the hero above — this is
          what actually pushes the buttons down toward the bottom of the
          screen (easier one-handed reach) while still shrinking cleanly to
          nothing on a short viewport instead of forcing an overflow. */}
      <div className="min-h-4 flex-1" />

      <div className="relative flex w-full max-w-xs flex-col gap-4">
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

      <p className="relative mt-2 text-sm text-foreground-muted">No login required.</p>
    </main>
  );
}
