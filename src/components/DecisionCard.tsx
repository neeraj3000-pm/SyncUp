"use client";

import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";

// A swipe commits if EITHER the drag crossed the distance threshold (a
// slow, deliberate drag) OR it was moving fast at release (a flick). Real
// one-handed flicks often travel only a short distance, so distance alone
// made them spring back and feel unresponsive.
const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 450; // px/s — Motion reports velocity itself, no hand-rolled tracking needed
const MIN_FLICK_DISTANCE = 24; // guards against a high-velocity reading from a near-stationary tap

// Spring physics (apple-design skill, "Behavior over animation"): critically
// damped (no bounce) is the default for anything that wasn't carrying real
// momentum — a slow drag past the threshold, or a button tap. A flick gets
// a little bounce and its own release velocity handed off, because that's
// the one case where the motion should still feel like it's continuing
// what the user's finger was already doing, not snapping to a fixed end
// state.
const SPRING_SETTLED = { type: "spring", bounce: 0, duration: 0.4 } as const;
const SPRING_FLICK = { type: "spring", bounce: 0.18, duration: 0.4 } as const;
const FLING_DISTANCE = 600;

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
  preview,
  children,
}: {
  onSwipe: (direction: "SYNC" | "PASS", superLiked?: boolean) => void;
  // The next card, shown stacked behind this one. It shares the card area
  // only — never the button row — so none of its text peeks out around the
  // buttons.
  preview?: React.ReactNode;
  children: React.ReactNode;
}) {
  // A MotionValue, not React state: Motion updates the DOM directly on
  // every drag frame and animation tick, so dragging never re-renders.
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-12, 12]);
  const syncOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  function commit(direction: "SYNC" | "PASS", superLiked = false, velocityX = 0) {
    const target = direction === "SYNC" ? FLING_DISTANCE : -FLING_DISTANCE;
    // Velocity handoff (apple-design skill): starting the fling from the
    // release velocity instead of a standing start is what removes the
    // seam between "being dragged" and "animating away" — a button tap has
    // no velocity to hand off, so it just falls back to a standing start.
    animate(x, target, { ...SPRING_FLICK, velocity: velocityX });
    // Fires immediately rather than waiting for the fling animation to
    // finish — the parent swaps in the next card right away (matches the
    // pre-Motion behavior), so this instance unmounts mid-flight and never
    // needs to clean up after itself.
    onSwipe(direction, superLiked);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    const isFlick = Math.abs(offsetX) > MIN_FLICK_DISTANCE && Math.abs(velocityX) > VELOCITY_THRESHOLD;

    if (Math.abs(offsetX) > SWIPE_THRESHOLD || isFlick) {
      commit(offsetX > 0 ? "SYNC" : "PASS", false, velocityX);
    } else {
      // Snap back — still hands off the release velocity (per apple-design's
      // "always animate from the presentation value, carry velocity through")
      // even though it's returning to 0, so a quick aborted flick doesn't
      // suddenly go static on release.
      animate(x, 0, { ...SPRING_SETTLED, velocity: velocityX });
    }
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="relative min-h-0 flex-1">
        {preview && (
          // inert: a decorative duplicate, so its ⓘ button stays out of the
          // tab order and the accessibility tree.
          <div inert className="pointer-events-none absolute inset-0 translate-y-2 scale-95 opacity-70">
            {preview}
          </div>
        )}
        <motion.div
          drag="x"
          // No dragConstraints: any horizontal position is a valid mid-drag
          // state, so there's no boundary for dragElastic to resist against.
          // dragMomentum=false turns off Motion's own post-release inertia —
          // necessary here, since handleDragEnd already decides and drives
          // exactly what happens next (snap back or fling away); leaving
          // Motion's built-in momentum on would animate the same MotionValue
          // at the same time as that, racing against it.
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          // touch-action: none, not pan-y: the page never scrolls (fixed
          // viewport shell), and leaving pan-y let iOS grab any swipe with a
          // vertical component, flashing a scrollbar/rubber-band mid-drag.
          style={{ x, rotate, touchAction: "none" }}
          className="relative h-full cursor-grab select-none active:cursor-grabbing"
        >
          <motion.div
            aria-hidden
            style={{ opacity: syncOpacity }}
            className="pointer-events-none absolute left-4 top-4 z-10 rounded-card border-2 border-sync px-3 py-1 text-lg font-extrabold text-sync"
          >
            SYNC ✓
          </motion.div>
          <motion.div
            aria-hidden
            style={{ opacity: passOpacity }}
            className="pointer-events-none absolute right-4 top-4 z-10 rounded-card border-2 border-foreground-muted px-3 py-1 text-lg font-extrabold text-foreground-muted"
          >
            PASS
          </motion.div>

          {children}
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          aria-label="Pass"
          onClick={() => commit("PASS")}
          className="flex h-14 w-14 items-center justify-center rounded-pill border border-border bg-surface text-2xl shadow-md transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
        >
          ✕
        </button>
        <button
          type="button"
          aria-label="Super Sync"
          onClick={() => commit("SYNC", true)}
          className="flex h-14 w-14 items-center justify-center rounded-pill border border-border bg-surface text-2xl text-secondary shadow-md transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
        >
          ⭐
        </button>
        <button
          type="button"
          aria-label="Sync"
          onClick={() => commit("SYNC")}
          className="flex h-14 w-14 items-center justify-center rounded-pill bg-primary text-2xl text-white shadow-md transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
