"use client";

import { useEffect, useRef, useState } from "react";
import type { ItemRow, SessionItemRow } from "@/services/candidates";
import type { SessionCategory } from "@/services/sessions";
import type { ParticipantProgress } from "@/services/swipes";
import {
  getMySwipedItemIdsAction,
  getSessionProgressAction,
  markFinishedAction,
  requestMoreCandidatesAction,
  swipeAction,
} from "@/services/swipes/actions";
import { DecisionCard } from "@/components/DecisionCard";
import { MovieCard } from "@/components/MovieCard";
import { RestaurantCard } from "@/components/RestaurantCard";
import { SwipeProgress } from "@/components/SwipeProgress";

const PROGRESS_POLL_MS = 4000;
// Matches DecisionCard's fling transition (300ms) — the queue only advances
// once the outgoing card has actually finished animating off-screen.
const ADVANCE_DELAY_MS = 300;

function renderCard(category: SessionCategory, item: ItemRow) {
  // The one place that switches on category to pick a presentational card —
  // DecisionCard itself stays category-agnostic (PRD section 40).
  switch (category) {
    case "WATCH":
      return <MovieCard item={item} />;
    case "EAT":
      return <RestaurantCard item={item} />;
  }
}

export function SwipeDeck({
  sessionId,
  participantId,
  category,
  initialItems,
  isCreator,
  hostName,
  hostParticipantId,
  onCreatorReveal,
}: {
  sessionId: string;
  participantId: string;
  category: SessionCategory;
  initialItems: SessionItemRow[];
  isCreator: boolean;
  hostName: string;
  hostParticipantId: string | null;
  onCreatorReveal: () => void;
}) {
  const [items, setItems] = useState(initialItems);
  const [queue, setQueue] = useState<ItemRow[] | null>(null);
  const [progress, setProgress] = useState<ParticipantProgress[]>([]);
  const [finished, setFinished] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealPromptDismissed, setRevealPromptDismissed] = useState(false);
  const advancingRef = useRef(false);

  // Resume support: figure out what this participant already swiped (across
  // a refresh, or rejoining) before showing any card, so already-decided
  // items never reappear.
  useEffect(() => {
    let cancelled = false;
    getMySwipedItemIdsAction({ sessionId, participantId }).then((result) => {
      if (cancelled) return;
      const swiped = result.ok ? new Set(result.data) : new Set<string>();
      setQueue(items.map((si) => si.item).filter((item) => !swiped.has(item.id)));
    });
    return () => {
      cancelled = true;
    };
    // Re-derives the queue against a fresh swiped-set on mount or when
    // items are replaced by "Show Me 50 More"; swipes within this deck
    // update `queue` directly instead of round-tripping through this effect.
  }, [items, sessionId, participantId]);

  // Progress polling: swipes can't be pushed over Realtime without leaking
  // individual choices (the RLS policy that hides them from other
  // participants during ACTIVE also hides them from a table-change
  // subscription), so the aggregate-only session_progress() RPC is polled
  // instead. See migration 0001/0003.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const result = await getSessionProgressAction(sessionId);
      if (cancelled || !result.ok) return;
      setProgress(result.data);
      // Resume support for "finished," same idea as the swiped-items resume
      // above: `finished` otherwise only ever gets set by this device's own
      // "I'm Done" click, so reloading after finishing (or opening the
      // session on a second tab) would show the pre-done screen again even
      // though the server already has you marked done — which also hid the
      // "everyone's done" reveal prompt from ever appearing for you.
      const mine = result.data.find((p) => p.participant_id === participantId);
      if (mine?.finished_at) setFinished(true);
    }
    poll();
    const interval = setInterval(poll, PROGRESS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, participantId]);

  function handleSwipe(item: ItemRow, direction: "SYNC" | "PASS") {
    if (advancingRef.current) return;
    advancingRef.current = true;

    swipeAction({ sessionId, participantId, itemId: item.id, direction }).then((result) => {
      if (!result.ok) setError(result.error);
    });

    setTimeout(() => {
      setQueue((prev) => (prev ? prev.slice(1) : prev));
      advancingRef.current = false;
    }, ADVANCE_DELAY_MS);
  }

  async function handleShowMore() {
    setLoadingMore(true);
    setError(null);
    const result = await requestMoreCandidatesAction({ sessionId });
    setLoadingMore(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems(result.data);
  }

  async function handleImDone() {
    setFinished(true);
    const result = await markFinishedAction(participantId);
    if (!result.ok) setError(result.error);
  }

  if (queue === null) {
    return <p className="text-foreground-muted">Loading your deck…</p>;
  }

  const totalSwiped = progress.find((p) => p.participant_id === participantId)?.swipe_count ?? 0;
  // PRD section 30: if everyone finishes before time (or an untimed
  // session's pool) runs out, the group gets a choice rather than being
  // yanked straight to results. Only the host acts on it (see
  // SessionRoom's comment on why Reveal/End Now are creator-only).
  const everyoneFinished = progress.length > 0 && progress.every((p) => p.finished_at);

  if (finished) {
    return (
      <div className="flex w-full flex-col items-center gap-6 text-center">
        <p className="text-lg font-semibold">You&apos;re done ✓</p>

        {everyoneFinished && !revealPromptDismissed ? (
          isCreator ? (
            <div className="flex w-full flex-col gap-3">
              <p className="text-sm text-foreground-muted">Everyone&apos;s done! 🎉</p>
              <button
                type="button"
                onClick={onCreatorReveal}
                className="w-full rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover"
              >
                Reveal Results
              </button>
              <button
                type="button"
                onClick={() => setRevealPromptDismissed(true)}
                className="w-full rounded-pill border border-border px-8 py-4 text-lg font-semibold transition-colors hover:bg-surface-raised"
              >
                Not Yet
              </button>
            </div>
          ) : (
            <p className="text-sm text-foreground-muted">
              Everyone&apos;s done! Waiting for {hostName} to reveal results…
            </p>
          )
        ) : (
          <p className="text-sm text-foreground-muted">Waiting for everyone else to finish…</p>
        )}

        <SwipeProgress
          progress={progress}
          totalItems={items.length}
          myParticipantId={participantId}
          hostParticipantId={hostParticipantId}
        />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-6 text-center">
        <p className="text-lg font-semibold">You&apos;ve seen all {items.length}.</p>
        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={handleImDone}
            className="w-full rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover"
          >
            I&apos;m Done
          </button>
          <button
            type="button"
            onClick={handleShowMore}
            disabled={loadingMore}
            className="w-full rounded-pill border border-border px-8 py-4 text-lg font-semibold transition-colors hover:bg-surface-raised disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Show Me 50 More"}
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <SwipeProgress
          progress={progress}
          totalItems={items.length}
          myParticipantId={participantId}
          hostParticipantId={hostParticipantId}
        />
      </div>
    );
  }

  const top = queue[0];
  const next = queue[1];

  return (
    <div className="flex w-full flex-1 flex-col items-center gap-4">
      <p className="text-sm text-foreground-muted">
        {totalSwiped}/{items.length}
      </p>

      <div className="relative h-[60vh] w-full max-w-sm">
        {next && (
          <div className="pointer-events-none absolute inset-0 scale-95 translate-y-2 opacity-70">
            {renderCard(category, next)}
          </div>
        )}
        <div className="absolute inset-0" key={top.id}>
          <DecisionCard onSwipe={(direction) => handleSwipe(top, direction)}>
            {renderCard(category, top)}
          </DecisionCard>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <SwipeProgress
        progress={progress}
        totalItems={items.length}
        myParticipantId={participantId}
        hostParticipantId={hostParticipantId}
      />
    </div>
  );
}
