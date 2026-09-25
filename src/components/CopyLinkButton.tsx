"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { buttonPrimary } from "@/lib/ui";

type Status = "idle" | "copied" | "failed";

const LABELS: Record<Status, string> = {
  idle: "Copy Link",
  copied: "Copied!",
  failed: "Couldn't copy — share the code",
};

export function CopyLinkButton({ path }: { path: string }) {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timeout = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [status]);

  async function handleCopy() {
    // The Clipboard API can reject (permission denied, insecure context,
    // some in-app browsers) — say so instead of failing silently.
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={`w-full overflow-hidden ${buttonPrimary}`}>
      {/* The label crossfades — a plain text swap reads as a glitch. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="block"
        >
          {LABELS[status]}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
