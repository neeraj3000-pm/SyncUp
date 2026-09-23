"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";

// Next's App Router catches any error thrown while rendering a server or
// client component and routes it here instead of crashing the page —
// without this file, that fallback is Next's own generic, unstyled default,
// which is what every unhandled failure (Supabase unreachable, a thrown
// error other than the `notFound()` case) was showing before this existed.
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
