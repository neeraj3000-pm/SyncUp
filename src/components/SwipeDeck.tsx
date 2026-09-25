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
import { usePolling } from "@/lib/use-polling";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import { DecisionCard } from "@/components/DecisionCard";
import { MovieCard } from "@/components/MovieCard";
import { RestaurantCard } from "@/components/RestaurantCard";
import { SwipeProgress } from "@/components/SwipeProgress";

const PROGRESS_POLL_MS = 4000;
// Matches DecisionCard's fling — the queue advances once the outgoing card
// has finished animating off-screen.
const ADVANCE_DELAY_MS = 300;

// The one place that picks a presentational card by category —
// DecisionCard itself stays category-agnostic (PRD section 40).
function renderCard(category: SessionCategory, item: ItemRow) {
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

  // Resume support: skip whatever this participant already swiped (after a
  // refresh or rejoin). Re-runs when "Show Me More" replaces `items`;
  // swipes within the deck update `queue` directly.
  useEffect(() => {
    let cancelled = false;
    getMySwipedItemIdsAction({ sessionId, participantId }).then((result) => {
      if (cancelled) return;
      const swiped = new Set(result.ok ? result.data : []);
      setQueue(items.map((si) => si.item).filter((item) => !swiped.has(item.id)));
    });
    return () => {
      cancelled = true;
    };
  }, [items, sessionId, participantId]);

  // Swipes can't go over Realtime without leaking individual choices, so
  // the aggregate-only session_progress() RPC is polled instead.
  usePolling(async () => {
    const result = await getSessionProgressAction(sessionId);
    if (!result.ok) return;
    setProgress(result.data);
    // Resume support for "I'm Done": the server may already have this
    // participant marked finished (reload, second tab).
    if (result.data.some((p) => p.participant_id === participantId && p.finished_at)) {
      setFinished(true);
    }
  }, PROGRESS_POLL_MS);

  function handleSwipe(item: ItemRow, direction: "SYNC" | "PASS", superLiked = false) {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setError(null);

    swipeAction({ sessionId, participantId, itemId: item.id, direction, superLiked }).then(
      (result) => {
        if (result.ok) return;
        setError(result.error);
        // The card already flew off optimistically; put it back on top once
        // the advance below has run, so the unsaved decision can be retried
        // instead of silently disappearing from this person's deck.
        setTimeout(() => {
          setQueue((prev) =>
            prev && !prev.some((i) => i.id === item.id) ? [item, ...prev] : prev,
          );
        }, ADVANCE_DELAY_MS);
      },
    );

    setTimeout(() => {
      setQueue((prev) => prev?.filter((i) => i.id !== item.id) ?? prev);
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
    // Optimistic, but rolled back on failure — the done screen has nothing
    // to retry from, so a silent failure would strand someone there.
    setFinished(true);
    setError(null);
    const result = await markFinishedAction(participantId);
    if (!result.ok) {
      setFinished(false);
      setError(result.error);
    }
  }

  if (queue === null) {
    return <p className="text-foreground-muted">Loading your deck…</p>;
  }

  const progressList = (
    <SwipeProgress
      progress={progress}
      totalItems={items.length}
      myParticipantId={participantId}
      hostParticipantId={hostParticipantId}
    />
  );

  if (finished) {
    // PRD section 30: if everyone finishes early, the host chooses whether
    // to reveal now rather than the group being yanked straight to results.
    const everyoneFinished = progress.length > 0 && progress.every((p) => p.finished_at);

    return (
      <div className="flex w-full flex-col items-center gap-6 text-center">
        <p className="text-lg font-semibold">You&apos;re done ✓</p>

        {everyoneFinished && !revealPromptDismissed ? (
          isCreator ? (
            <div className="flex w-full flex-col gap-3">
              <p className="text-sm text-foreground-muted">Everyone&apos;s done! 🎉</p>
              <button type="button" onClick={onCreatorReveal} className={`w-full ${buttonPrimary}`}>
                Reveal Results
              </button>
              <button
                type="button"
                onClick={() => setRevealPromptDismissed(true)}
                className={`w-full ${buttonSecondary}`}
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

        <div className="w-full max-h-48 overflow-y-auto overscroll-contain">{progressList}</div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-6 text-center">
        <p className="text-lg font-semibold">You&apos;ve seen all {items.length}.</p>
        <div className="flex w-full flex-col gap-3">
          <button type="button" onClick={handleImDone} className={`w-full ${buttonPrimary}`}>
            I&apos;m Done
          </button>
          <button
            type="button"
            onClick={handleShowMore}
            disabled={loadingMore}
            className={`w-full ${buttonSecondary}`}
          >
            {loadingMore ? "Loading…" : "Show Me 50 More"}
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="w-full max-h-48 overflow-y-auto overscroll-contain">{progressList}</div>
      </div>
    );
  }

  const totalSwiped = progress.find((p) => p.participant_id === participantId)?.swipe_count ?? 0;
  const [top, next] = queue;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-sm text-foreground-muted" role="status" aria-live="polite">
        {totalSwiped}/{items.length}
      </p>

      {/* Fixed height, never squeezed: the card is this screen's primary
          action. Only the progress list below gives up space and scrolls. */}
      <div className="h-[60dvh] w-full max-w-sm shrink-0" key={top.id}>
        <DecisionCard
          preview={next && renderCard(category, next)}
          onSwipe={(direction, superLiked) => handleSwipe(top, direction, superLiked)}
        >
          {renderCard(category, top)}
        </DecisionCard>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="w-full min-h-0 flex-1 overflow-y-auto overscroll-contain">{progressList}</div>
    </div>
  );
}
