"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CardFanHero } from "@/components/CardFanHero";
import { buttonPrimary } from "@/lib/ui";

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
    <main className="relative mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center gap-8 overflow-y-auto overscroll-contain px-6 py-12 text-center">
      {/* Same atmospheric glow as the landing page (same reasoning: fills
          the empty space this column otherwise leaves on a tall phone
          screen). Top-anchored, not justify-end — pushing content toward
          the bottom looked good on a tall test viewport but overflowed
          off the TOP of shorter real phone screens, hiding the heading
          above the fold instead of just needing an obvious scroll down.
          The plain spacer below still pushes the form down when there's
          room, without that risk (see its own comment). */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[50vh] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.14] blur-[80px]"
      />

      {/* min-h-0 + flex-1: fills the rest of main's height itself, so the
          spacer right below has real leftover space to absorb. */}
      <div className="relative flex w-full min-h-0 flex-1 flex-col items-center gap-6 text-center">
        {/* Absorbs spare height, shrinking to zero on short screens (see
            CardFanHero). */}
        <div className="min-h-0 flex-1" />
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
            className={`w-full ${buttonPrimary}`}
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
