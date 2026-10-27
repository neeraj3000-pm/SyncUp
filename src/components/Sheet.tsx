"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Tap-triggered, so no bounce (only flicks get one).
const SHEET_SPRING = { type: "spring", bounce: 0, duration: 0.35 } as const;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Bottom sheet on mobile, centered modal on desktop; shared by every overlay.
export function Sheet({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  // The dialog's accessible name.
  title: string;
  // A function child gets `close`, which plays the exit animation first.
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
}) {
  // Closing hides locally first; the parent's onClose runs once the exit
  // animation finishes.
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Focus moves in on open (to the close button), Tab is trapped inside,
  // Escape closes, and focus returns to the opener afterwards.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setVisible(false);
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  // Reduced motion: cross-fade only.
  const sheetVariants = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 24, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 24, scale: 0.96 },
      };

  // Portaled to <body>: inside a transformed ancestor (the swipe card),
  // position: fixed would be relative to that ancestor, not the viewport.
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
          // React bubbles portal events through the component tree, so
          // without this the swipe card's drag handler would capture the
          // pointer and swallow taps on the Close button.
          onPointerDown={(e) => e.stopPropagation()}
        >
          <motion.div
            {...sheetVariants}
            transition={reduceMotion ? { duration: 0.15 } : SHEET_SPRING}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-card bg-surface p-6 shadow-2xl sm:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label="Close"
              className="mb-4 ml-auto flex h-11 w-11 items-center justify-center rounded-pill border border-border text-lg shadow-card transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
            >
              ✕
            </button>
            {typeof children === "function" ? children(() => setVisible(false)) : children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
