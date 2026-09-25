"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CardFanHero } from "@/components/CardFanHero";

export default function JoinLandingPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/join/${encodeURIComponent(trimmed.toUpperCase())}`);
  }

  return (
    <main className="relative mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center justify-end gap-8 overflow-y-auto overscroll-contain px-6 pb-28 pt-12 text-center">
      {/* Same atmospheric glow as the landing page (same reasoning: fills
          the empty space this column otherwise leaves on a tall phone
          screen). justify-end (below) puts the code input and Continue
          button in the bottom two-thirds of the screen, easier to reach
          one-handed than dead center — the glow follows it down rather
          than sitting where the content used to be. pb-28, not the usual
          pb-12: leaves clearance below the button for ThemeToggle's fixed
          bottom-right circle, which otherwise sits close enough to
          overlap it now that the button itself has moved this much
          lower. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[50vh] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.14] blur-[80px]"
      />

      {/* flex-1 + min-h-0: fills the rest of main's height itself, so
          CardFanHero's own flex-1 has something to grow into — same
          "brand illustration in the leftover space" treatment as the
          landing page and the "X wants to decide..." screen, kept
          uniform here too rather than leaving this one screen plain. */}
      <div className="relative flex w-full min-h-0 flex-1 flex-col items-center gap-6 text-center">
        <CardFanHero />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-tight tracking-tight">Join a SyncUp</h1>
          <p className="text-foreground-muted">Enter the code you were sent.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <input
            autoFocus
            maxLength={5}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="K7XM2"
            aria-label="SyncUp code"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            className="rounded-card border border-border bg-surface px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.2em] shadow-card outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97] disabled:bg-border disabled:text-foreground-muted disabled:shadow-none"
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
