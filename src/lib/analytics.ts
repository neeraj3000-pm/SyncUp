import posthog from "posthog-js";

// PRD section 60's event list is deliberately short and named — this is
// that taxonomy as a type, not posthog-js's autocapture (which is off,
// see initAnalytics below): autocapture would also log the guest-name and
// session-code inputs, which section 59 ("no unnecessary personal data")
// specifically doesn't want captured.
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

let enabled = false;

// Called once, client-side only, from <Analytics /> in layout.tsx. A
// missing key (local dev, a fork nobody's wired PostHog up for yet) is a
// silent no-op rather than a crash — track() below just does nothing
// until this has actually run.
export function initAnalytics() {
  if (enabled || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Guests never sign in (PRD: "no account, ever, for participants") —
    // don't create a PostHog person profile off the back of anonymous
    // traffic just because it showed up.
    person_profiles: "identified_only",
    // <Analytics /> sends $pageview itself on route change (App Router
    // navigations don't fire real page loads, so posthog-js's own
    // capture_pageview default would miss them anyway).
    capture_pageview: false,
    autocapture: false,
  });
  enabled = true;
}

export function isAnalyticsEnabled() {
  return enabled;
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (!enabled) return;
  posthog.capture(event, properties);
}

export { posthog };
