"use client";

import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";

// A swipe commits on distance (a deliberate drag) or on release speed (a
// short one-handed flick).
const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 450; // px/s
const MIN_FLICK_DISTANCE = 24; // ignores velocity spikes from a near-stationary tap

// No bounce by default; a flick keeps a little so the card carries on
// with the finger's momentum.
const SPRING_SETTLED = { type: "spring", bounce: 0, duration: 0.4 } as const;
const SPRING_FLICK = { type: "spring", bounce: 0.18, duration: 0.4 } as const;
const FLING_DISTANCE = 600;

// Category-agnostic swipe shell: renders `children`, reports Sync/Pass.
// Buttons always sit alongside the gesture (swipe is never the only way to
// decide), and Super Sync is button-only to keep drags horizontal.
export function DecisionCard({
  onSwipe,
  preview,
  children,
}: {
  onSwipe: (direction: "SYNC" | "PASS", superLiked?: boolean) => void;
  // The next card, stacked behind this one (card area only).
  preview?: React.ReactNode;
  children: React.ReactNode;
}) {
  // A MotionValue, so dragging never re-renders.
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-12, 12]);
  const syncOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  function commit(direction: "SYNC" | "PASS", superLiked = false, velocityX = 0) {
    const target = direction === "SYNC" ? FLING_DISTANCE : -FLING_DISTANCE;
    // Starts from the release velocity so drag and fling feel continuous.
    animate(x, target, { ...SPRING_FLICK, velocity: velocityX });
    // The parent removes this card once the fling has played out.
    onSwipe(direction, superLiked);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    const isFlick = Math.abs(offsetX) > MIN_FLICK_DISTANCE && Math.abs(velocityX) > VELOCITY_THRESHOLD;

    if (Math.abs(offsetX) > SWIPE_THRESHOLD || isFlick) {
      commit(offsetX > 0 ? "SYNC" : "PASS", false, velocityX);
    } else {
      // Snap back, carrying the release velocity.
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
          // handleDragEnd drives the release; Motion's own inertia would
          // fight it.
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          // Not pan-y: iOS would grab diagonal swipes and rubber-band.
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
