"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initAnalytics, isAnalyticsEnabled, posthog } from "@/lib/analytics";

// Mounted once in layout.tsx, wrapped in <Suspense> there — useSearchParams
// forces whatever renders it to opt out of static rendering, and the
// Suspense boundary keeps that opt-out scoped to this component instead of
// the whole route tree (every other page here is otherwise statically
// prerendered).
export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    // App Router navigations are client-side and never fire a real page
    // load, so posthog-js's own automatic pageview capture would only ever
    // see the very first one — this sends one on every route change instead.
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
