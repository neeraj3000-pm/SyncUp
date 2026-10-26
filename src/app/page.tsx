import Link from "next/link";
import { CardFanHero } from "@/components/CardFanHero";
import { TrackedLink } from "@/components/TrackedLink";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain px-6 py-8 text-center">
      {/* PRD section 9 keeps this screen to headline + two buttons (the
          10-second rule) — this pill is the one deliberate exception, a
          quiet secondary path to /about for anyone who wants the story
          behind the app rather than to start one. Mirrors /about's own
          "← Portfolio" pill in the same corner, so the two pages read as
          reciprocal. */}
      <Link
        href="/about"
        className="fixed left-4 z-40 flex h-11 items-center gap-1.5 rounded-pill border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-md transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
        style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
      >
        <InfoIcon />
        About
      </Link>

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[6vh] h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-[70px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[56vh] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-primary/[0.16] blur-[90px]"
      />

      <Link
        href="/about"
        aria-label="Learn more about SyncUp"
        className="rounded-2xl transition-[transform,opacity] duration-150 ease-out hover:opacity-80 active:scale-[0.97]"
      >
        <CardFanHero />
      </Link>

      <div className="relative flex flex-col gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Stop debating.
          <br />
          <span className="text-primary">SyncUp!</span>
        </h1>
        <p className="max-w-sm text-lg text-foreground-muted">
          Find something everyone actually wants to do.
        </p>
      </div>

      <div className="relative mt-6 flex w-full max-w-xs flex-col gap-4">
        <TrackedLink href="/create" event="start_clicked" className={buttonPrimary}>
          Start a SyncUp!
        </TrackedLink>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-foreground-muted">Already have a code?</p>
          <TrackedLink href="/join" event="join_clicked" className={buttonSecondary}>
            Join a SyncUp!
          </TrackedLink>
        </div>
      </div>

      <p className="relative mt-2 text-sm text-foreground-muted">No login required.</p>
    </main>
  );
}

// Thin-stroke outline, not an emoji — same reasoning as ThemeToggle's sun/
// moon icons: an emoji renders inconsistently across platforms and reads
// as a placeholder rather than a deliberate icon.
function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="7.75" r="1" fill="currentColor" />
    </svg>
  );
}
