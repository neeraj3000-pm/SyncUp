"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
          screen) — no card illustration here, though, since this screen's
          whole job is "enter code, go fast," not a moment to linger on.
          justify-end (below) puts the code input and Continue button in
          the bottom two-thirds of the screen, easier to reach one-handed
          than dead center — the glow follows it down rather than sitting
          where the content used to be. pb-28, not the usual pb-12: leaves
          clearance below the button for ThemeToggle's fixed bottom-right
          circle, which otherwise sits close enough to overlap it now that
          the button itself has moved this much lower. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[50vh] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.14] blur-[80px]"
      />

      <div className="relative flex flex-col gap-2">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">Join a SyncUp</h1>
        <p className="text-foreground-muted">Enter the code you were sent.</p>
      </div>

      <form onSubmit={handleSubmit} className="relative flex w-full flex-col gap-4">
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
    </main>
  );
}
