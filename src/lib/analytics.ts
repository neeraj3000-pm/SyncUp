import type { PostHog } from "posthog-js";

// PRD section 60's named events. Autocapture stays off: it would also log
// guest names and session codes (section 59).
export type AnalyticsEvent =
  | "start_clicked"
  | "join_clicked"
  | "category_selected"
  | "timer_selected"
  | "session_created"
  | "invite_generated"
  | "join_completed"
  | "session_started"
  | "swipe_recorded"
  | "batch_completed"
  | "participant_finished"
  | "reveal_shown"
  | "perfect_match"
  | "partial_match"
  | "action_clicked"
  | "resync_clicked";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

type Capture = [event: string, properties?: Record<string, unknown>];

// posthog-js is ~100KB that nothing on screen needs, so it loads once the
// page is idle. Events from before then wait here; with no key configured
// (local dev) there's no queue and every call is a no-op.
let client: PostHog | null = null;
let queue: Capture[] | null = KEY && typeof window !== "undefined" ? [] : null;
let loading = false;

// Called once from <Analytics /> in layout.tsx.
export function initAnalytics() {
  if (loading || !KEY || !queue) return;
  loading = true;
  const key = KEY;

  const load = () =>
    import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
          // Guests never sign in, so no person profiles for anonymous traffic.
          person_profiles: "identified_only",
          // <Analytics /> sends $pageview itself — App Router navigations
          // aren't real page loads.
          capture_pageview: false,
          autocapture: false,
        });
        client = posthog;
        queue?.forEach(([event, properties]) => posthog.capture(event, properties));
        queue = null;
      })
      .catch(() => {
        queue = null;
      });

  if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 1500);
}

function capture(event: string, properties?: Record<string, unknown>) {
  if (client) client.capture(event, properties);
  else queue?.push([event, properties]);
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  capture(event, properties);
}

export function trackPageview(url: string) {
  capture("$pageview", { $current_url: url });
}
