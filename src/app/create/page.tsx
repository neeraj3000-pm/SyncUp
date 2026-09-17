"use client";

import { useState } from "react";
import { createSessionAction } from "./actions";

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

      <form action={createSessionAction} className="mt-auto">
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="duration" value={duration} />
        <button
          type="submit"
          className="w-full rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover"
        >
          Create SyncUp
        </button>
      </form>
    </main>
  );
}
