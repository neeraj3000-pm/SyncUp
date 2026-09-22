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
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center justify-center gap-8 overflow-y-auto overscroll-contain px-6 py-12 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Join a SyncUp</h1>
        <p className="text-foreground-muted">Enter the code you were sent.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <input
          autoFocus
          maxLength={5}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="K7XM2"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          className="rounded-card border border-border bg-surface px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.2em] outline-none focus:border-primary"
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
