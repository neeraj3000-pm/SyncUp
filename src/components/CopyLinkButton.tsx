"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="w-full overflow-hidden rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
    >
      {/* A plain text swap reads as a glitch, not a confirmation — the label
          crossfades instead, same as any other state change in the app. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "copied" : "copy"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="block"
        >
          {copied ? "Copied!" : "Copy Link"}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
