"use client";

import { useRef, useState } from "react";

// A real swipe is a quick flick — the finger often only travels a modest
// distance before lifting off, especially one-handed. Committing on
// distance alone (the old behavior) meant a fast flick that didn't happen
// to cross SWIPE_THRESHOLD just sprang back, which is what users on
// Android/iPhone/iPad were reporting as the card "not being sensitive
// enough." So a swipe now commits if EITHER the drag crossed the distance
// threshold (a slow, deliberate drag) OR it was moving fast enough at
// release (a flick), matching how swipe gestures actually feel.
const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 0.45; // px/ms
const MIN_FLICK_DISTANCE = 24; // guards against a high-velocity reading from a near-stationary tap

// Category-agnostic swipe shell (PRD section 40) — it doesn't know whether
// it's showing a movie or a restaurant, just renders `children` and reports
// Sync/Pass. Buttons are always present alongside the drag gesture: PRD
// section 57 is explicit that swipe must never be the only way to decide.
//
// Super Like (a stronger "yes," used to break ties when a couple/group has
// multiple matches) is deliberately a dedicated button, not a gesture. An
// upward swipe was the obvious dating-app-style option, but it would add a
// vertical drag axis right as the app is trying to keep swipe unambiguous
// from scrolling on a fixed mobile viewport — and PRD section 25 already
// requires a button fallback for every gesture regardless, so the button
// can just be the primary path instead of a backup for a riskier one.
export function DecisionCard({
  onSwipe,
  children,
}: {
  onSwipe: (direction: "SYNC" | "PASS", superLiked?: boolean) => void;
  children: React.ReactNode;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  // Mutable, not state: only read once at pointerup, and updating it on
  // every pointermove shouldn't itself trigger a re-render.
  const lastMoveRef = useRef<{ x: number; time: number } | null>(null);
  const velocityRef = useRef(0);

  function commit(direction: "SYNC" | "PASS", superLiked = false) {
    setDragging(false);
    // Fling off-screen; the parent swaps in the next card right after, so
    // this instance unmounts and never needs to reset dragX itself.
    setDragX(direction === "SYNC" ? 600 : -600);
    onSwipe(direction, superLiked);
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setStartX(e.clientX - dragX);
    lastMoveRef.current = { x: e.clientX, time: e.timeStamp };
    velocityRef.current = 0;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startX);
    const last = lastMoveRef.current;
    if (last) {
      const dt = e.timeStamp - last.time;
      if (dt > 0) velocityRef.current = (e.clientX - last.x) / dt;
    }
    lastMoveRef.current = { x: e.clientX, time: e.timeStamp };
  }

  function handlePointerUp() {
    if (!dragging) return;
    const isFlick =
      Math.abs(dragX) > MIN_FLICK_DISTANCE && Math.abs(velocityRef.current) > VELOCITY_THRESHOLD;
    if (Math.abs(dragX) > SWIPE_THRESHOLD || isFlick) {
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
          aria-label="Super Sync"
          onClick={() => commit("SYNC", true)}
          className="flex h-14 w-14 items-center justify-center rounded-pill border border-border bg-surface text-2xl text-secondary shadow-md transition-colors hover:bg-surface-raised"
        >
          ⭐
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
