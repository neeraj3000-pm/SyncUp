"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateGuestId, setStoredParticipantId } from "@/lib/guest";
import { joinSessionAction } from "@/services/sessions/actions";
import { track } from "@/lib/analytics";

export function JoinForm({ sessionId, category }: { sessionId: string; category?: string }) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setError(null);

    const guestId = getOrCreateGuestId();
    const result = await joinSessionAction({
      sessionId,
      guestId,
      displayName: trimmed,
    });

    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    track("join_completed", { session_id: sessionId, category });
    setStoredParticipantId(sessionId, result.data.id);
    router.push(`/session/${sessionId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 text-left">
        <label htmlFor="name" className="text-sm font-semibold text-foreground-muted">
          Enter your name
        </label>
        <input
          id="name"
          name="name"
          autoFocus
          autoComplete="name"
          enterKeyHint="done"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ananya"
          className="rounded-card border border-border bg-surface px-4 py-3 text-lg shadow-card outline-none focus:border-primary"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={!name.trim() || pending}
        className="w-full rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97] disabled:bg-border disabled:text-foreground-muted disabled:shadow-none"
      >
        {pending ? "Joining…" : "Join SyncUp"}
      </button>
    </form>
  );
}
