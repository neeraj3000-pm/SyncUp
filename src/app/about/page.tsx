import type { Metadata } from "next";
import { AboutView } from "@/components/AboutView";

// The portfolio story page; "/" stays the 10-second start screen.
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
  // ?src=app: arrived from inside SyncUp, so the portfolio links are hidden.
  const fromApp = (await searchParams).src === "app";
  return <AboutView fromApp={fromApp} />;
}
