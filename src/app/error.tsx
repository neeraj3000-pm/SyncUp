"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";

// Next routes any error thrown while rendering here instead of its own
// generic, unstyled fallback page.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      title="Something went wrong."
      body="SyncUp hit a snag loading this. It's usually temporary — give it another try."
      action={{ label: "Try again", onClick: reset }}
    />
  );
}
