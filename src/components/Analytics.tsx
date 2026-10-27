"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initAnalytics, trackPageview } from "@/lib/analytics";

// Wrapped in <Suspense> in layout.tsx: useSearchParams would otherwise opt
// every route out of static rendering.
export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initAnalytics();
  }, []);

  // App Router navigations never fire a real page load, so one $pageview is
  // sent per route change.
  useEffect(() => {
    const qs = searchParams?.toString();
    trackPageview(window.origin + pathname + (qs ? `?${qs}` : ""));
  }, [pathname, searchParams]);

  return null;
}
