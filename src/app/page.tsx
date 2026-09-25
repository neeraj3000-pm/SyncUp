import Link from "next/link";
import { CardFanHero } from "@/components/CardFanHero";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain px-6 py-8 text-center">
      {/* PRD section 9 keeps this screen to headline + two buttons (the
          10-second rule). The glows are purely decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[6vh] h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-[70px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[56vh] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-primary/[0.16] blur-[90px]"
      />

      <CardFanHero />

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
        <Link
          href="/create"
          className={buttonPrimary}
        >
          Start a SyncUp!
        </Link>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-foreground-muted">Already have a code?</p>
          <Link
            href="/join"
            className={buttonSecondary}
          >
            Join a SyncUp!
          </Link>
        </div>
      </div>

      <p className="relative mt-2 text-sm text-foreground-muted">No login required.</p>
    </main>
  );
}
