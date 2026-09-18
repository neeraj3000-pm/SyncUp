"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setStoredParticipantId, useGuestId } from "@/lib/guest";
import { createSessionAction } from "@/services/sessions/actions";

const CATEGORIES = [
  { value: "WATCH", emoji: "🎬", label: "Watch", helper: "Movies and more" },
  { value: "EAT", emoji: "🍔", label: "Eat", helper: "Restaurants and food" },
] as const;

const DURATIONS = [
  { value: 120, label: "2 min", helper: "Quick decision" },
  { value: 300, label: "5 min", helper: "Take your time" },
  { value: 600, label: "10 min", helper: "Explore a little" },
] as const;

export default function CreatePage() {
  const [category, setCategory] = useState<"WATCH" | "EAT">("WATCH");
  const [duration, setDuration] = useState(300);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const guestId = useGuestId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !guestId || pending) return;

    setPending(true);
    setError(null);

    const result = await createSessionAction({
      category,
      durationSeconds: duration,
      creatorGuestId: guestId,
      displayName: trimmedName,
    });

    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    setStoredParticipantId(result.data.session.id, result.data.participant.id);
    router.push(`/session/${result.data.session.id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-10 px-6 py-12">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground-muted">
          What are you deciding?
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`flex flex-col items-start gap-1 rounded-card border p-4 text-left transition-colors ${
                category === c.value
                  ? "border-primary bg-surface-raised"
                  : "border-border bg-surface"
              }`}
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="font-semibold">{c.label}</span>
              <span className="text-sm text-foreground-muted">{c.helper}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground-muted">
          How long do you want to decide?
        </h2>
        <div className="flex flex-col gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDuration(d.value)}
              className={`flex items-center justify-between rounded-card border px-4 py-3 text-left transition-colors ${
                duration === d.value
                  ? "border-primary bg-surface-raised"
                  : "border-border bg-surface"
              }`}
            >
              <span className="font-semibold">{d.label}</span>
              <span className="text-sm text-foreground-muted">{d.helper}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground-muted">
          What&apos;s your name?
        </h2>
        <input
          autoComplete="name"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Neeraj"
          className="rounded-card border border-border bg-surface px-4 py-3 text-lg outline-none focus:border-primary"
        />
        <p className="text-xs text-foreground-muted">
          Shown to people you invite, e.g. &quot;{name.trim() || "Neeraj"} wants to
          decide {category === "WATCH" ? "what to watch" : "where to eat"}&quot;.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="mt-auto flex flex-col gap-2">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || pending}
          className="w-full rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create SyncUp"}
        </button>
      </form>
    </main>
  );
}
