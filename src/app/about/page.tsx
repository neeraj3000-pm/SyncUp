import type { Metadata } from "next";
import { AboutView } from "@/components/AboutView";

// A separate page from the root landing on purpose: "/" stays the
// PRD-mandated 10-second-rule screen (headline + two buttons, nothing
// else) for people actually starting a session. This one is the portfolio
// piece — meant to be linked from outside the app — so it gets to be
// longer and tell the story instead.
export const metadata: Metadata = {
  title: "About SyncUp — Stop debating. SyncUp!",
  description:
    "Why I built SyncUp: a swipe-to-decide app for groups who can't agree on what to watch or where to eat.",
};

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>;
}) {
  // ?src=app (set by the two links inside the real app, on "/") means this
  // visitor came from inside SyncUp itself, not from Neeraj's portfolio —
  // AboutView hides the portfolio links for that visit so someone the app
  // was shared with doesn't click straight through to it.
  const fromApp = (await searchParams).src === "app";
  return <AboutView fromApp={fromApp} />;
}
