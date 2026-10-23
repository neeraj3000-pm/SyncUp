"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

// A next/link that also fires an analytics event on click — exists so a
// Server Component (landing) can get one without itself becoming a client
// component just to attach an onClick handler.
export function TrackedLink({
  event,
  properties,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
}) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(event, properties);
        onClick?.(e);
      }}
    />
  );
}
