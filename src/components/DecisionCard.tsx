"use client";

import { useState } from "react";

const SWIPE_THRESHOLD = 100;

// Category-agnostic swipe shell (PRD section 40) — it doesn't know whether
// it's showing a movie or a restaurant, just renders `children` and reports
// Sync/Pass. Buttons are always present alongside the drag gesture: PRD
// section 57 is explicit that swipe must never be the only way to decide.
export function DecisionCard({
  onSwipe,
  children,
}: {
  onSwipe: (direction: "SYNC" | "PASS") => void;
  children: React.ReactNode;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  function commit(direction: "SYNC" | "PASS") {
    setDragging(false);
    // Fling off-screen; the parent swaps in the next card right after, so
    // this instance unmounts and never needs to reset dragX itself.
    setDragX(direction === "SYNC" ? 600 : -600);
    onSwipe(direction);
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setStartX(e.clientX - dragX);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startX);
  }

  function handlePointerUp() {
    if (!dragging) return;
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      commit(dragX > 0 ? "SYNC" : "PASS");
    } else {
      setDragging(false);
      setDragX(0);
    }
  }

  const rotation = dragX / 20;
  const syncOpacity = Math.min(Math.max(dragX / SWIPE_THRESHOLD, 0), 1);
  const passOpacity = Math.min(Math.max(-dragX / SWIPE_THRESHOLD, 0), 1);

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
          transition: dragging ? "none" : "transform 300ms ease-out",
          touchAction: "pan-y",
        }}
        className="relative min-h-0 flex-1 cursor-grab select-none active:cursor-grabbing"
      >
        <div
          aria-hidden
          style={{ opacity: syncOpacity }}
          className="pointer-events-none absolute left-4 top-4 z-10 rounded-card border-2 border-sync px-3 py-1 text-lg font-extrabold text-sync"
        >
          SYNC ✓
        </div>
        <div
          aria-hidden
          style={{ opacity: passOpacity }}
          className="pointer-events-none absolute right-4 top-4 z-10 rounded-card border-2 border-foreground-muted px-3 py-1 text-lg font-extrabold text-foreground-muted"
        >
          PASS
        </div>

        {children}
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          aria-label="Pass"
          onClick={() => commit("PASS")}
          className="flex h-14 w-14 items-center justify-center rounded-pill border border-border bg-surface text-2xl shadow-md transition-colors hover:bg-surface-raised"
        >
          ✕
        </button>
        <button
          type="button"
          aria-label="Sync"
          onClick={() => commit("SYNC")}
          className="flex h-14 w-14 items-center justify-center rounded-pill bg-primary text-2xl text-white shadow-md transition-colors hover:bg-primary-hover"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
