"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Tap-triggered, not a drag/momentum gesture — so this follows the same
// "safe house style" as the rest of the app (apple-design skill): critically
// damped, no bounce. Only flicks (DecisionCard) earn bounce.
const SHEET_SPRING = { type: "spring", bounce: 0, duration: 0.35 } as const;

// The bottom-sheet-on-mobile / centered-modal-on-desktop shell shared by
// every overlay in the app (DetailSheet, QRModal, ...) — portal, scrim,
// materialize motion, and close-button mechanics live here once instead of
// per consumer.
export function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  // The parent mounts/unmounts this component instantly (its own onClose
  // just flips a boolean), so there's nothing here that would normally play
  // an exit animation before removal. Deferring the *real* onClose until
  // AnimatePresence finishes exiting — rather than changing the parent's
  // conditional-render call sites — keeps this self-contained.
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  // apple-design skill: reduced motion gets a plain cross-fade, no
  // slide/scale — the transform-based "materialize" is what we're opting
  // out of, not motion entirely.
  const sheetVariants = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 24, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 24, scale: 0.96 },
      };

  // Rendered via a portal straight into <body>: a sheet opened from inside
  // an element with a live `transform` (e.g. DecisionCard's drag wrapper,
  // which always has one — even `translateX(0px)` at rest) would otherwise
  // size/position itself against that ancestor's box instead of the real
  // viewport, per the CSS spec's containing-block rules for `position:
  // fixed`. The portal sidesteps this regardless of where a given sheet is
  // triggered from.
  return createPortal(
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <motion.div
          key="sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={() => setVisible(false)}
          // React re-implements bubbling through the *component* tree for
          // portals, not the DOM tree — so a pointerdown here still reaches
          // a drag handler on an ancestor component (DecisionCard's info
          // buttons already guard against this the same way). Without this,
          // that ancestor calls setPointerCapture on itself, which silently
          // retargets the following pointerup/click away from whatever was
          // actually tapped in here (e.g. the Close button), so the button
          // visibly exists but doesn't respond.
          onPointerDown={(e) => e.stopPropagation()}
        >
          <motion.div
            {...sheetVariants}
            transition={reduceMotion ? { duration: 0.15 } : SHEET_SPRING}
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-card bg-surface p-6 sm:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label="Close"
              className="mb-4 ml-auto flex h-8 w-8 items-center justify-center rounded-pill border border-border text-lg transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
            >
              ✕
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
