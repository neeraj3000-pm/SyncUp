"use client";

import { motion, useReducedMotion } from "motion/react";
import { CardFanHero } from "@/components/CardFanHero";
import { TrackedLink } from "@/components/TrackedLink";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";

// Same "safe house style" as ResultsView's reveal cascade: critically
// damped spring, no bounce, a short stagger between siblings. Reduced
// motion keeps the fade but drops the lift.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

function useFadeUp() {
  const reduceMotion = useReducedMotion();
  return {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", bounce: 0, duration: 0.5 } as const,
    },
  };
}

const STEPS = [
  {
    label: "Create",
    copy: "Pick Watch or Eat, set a timer, get a code. Ten seconds, no account.",
  },
  {
    label: "Share",
    copy: "Send the link or show the QR. Everyone taps in from their own phone.",
  },
  {
    label: "Swipe",
    copy: "Everyone reviews the same pool, privately, right or left. No peeking at anyone else's picks.",
  },
  {
    label: "Reveal",
    copy: "SyncUp ranks by agreement and shows the Sync Score. Highest match wins — nobody has to argue for it.",
  },
] as const;

const CHAT_BUBBLES = [
  { text: "what should we watch tonight", align: "left" as const },
  { text: "idk you pick", align: "right" as const },
  { text: "where should we eat", align: "left" as const },
  { text: "anywhere's fine 🙃", align: "right" as const },
];

// Constrains every section's content to a readable/well-composed width
// while each section's own colored band stays full-bleed — same pattern
// the portfolio site uses for its alternating bands.
const sectionInner = "mx-auto w-full max-w-5xl";

const STATS = [
  { value: "2–10", label: "people per SyncUp" },
  { value: "50", label: "items in the candidate pool" },
  { value: "16", label: "analytics events tracked" },
  { value: "100%", label: "Sync Score on a perfect match" },
] as const;

const STACK = [
  "Next.js",
  "TypeScript",
  "Supabase (Postgres + Realtime)",
  "TMDB API",
  "Google Places API",
  "PostHog",
  "Vercel",
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">
      {children}
    </p>
  );
}

export function AboutView() {
  const fadeUp = useFadeUp();

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[4vh] h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-[80px]"
      />

      <a
        href="https://neeraj-portfolio-orcin.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed left-4 z-40 flex h-11 items-center rounded-pill border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-md transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
        style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
      >
        ← Portfolio
      </a>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className={`relative ${sectionInner} px-6 pb-14 pt-20 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-10 lg:pt-28`}>
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
            A proof-of-work project by Neeraj P
          </p>

          <div className="lg:hidden">
            <CardFanHero />
          </div>

          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Stop debating.
            <br />
            <span className="text-primary">SyncUp!</span>
          </h1>
          <p className="mt-4 max-w-sm text-lg text-foreground-muted lg:max-w-md">
            The app for people who can never agree on what to watch or where to eat.
          </p>

          <div className="mt-8 flex w-full max-w-xs flex-col gap-3 lg:flex-row lg:max-w-none">
            <TrackedLink href="/create" event="start_clicked" className={buttonPrimary}>
              Start a SyncUp!
            </TrackedLink>
            <TrackedLink href="/join" event="join_clicked" className={buttonSecondary}>
              Join a SyncUp!
            </TrackedLink>
          </div>
        </div>

        <div className="relative mt-16 hidden items-center justify-center lg:flex">
          <PhonePreview />
        </div>
      </section>

      {/* ── The problem ────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={container}
        className="relative border-t border-border bg-surface px-6 py-14 lg:px-10"
      >
        <div className={`${sectionInner} lg:grid lg:grid-cols-2 lg:items-center lg:gap-16`}>
          <div className="text-center lg:order-2 lg:text-left">
            <motion.div variants={fadeUp}>
              <Eyebrow>The problem</Eyebrow>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight lg:text-3xl">
                You know the drill.
              </h2>
            </motion.div>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-sm text-foreground-muted lg:mx-0">
              Endless browsing. Group chats that go nowhere. Polls nobody opens. SyncUp skips all
              of it — the decision itself becomes the interaction.
            </motion.p>
          </div>

          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-2.5 lg:order-1 lg:mx-0 lg:mt-0">
            {CHAT_BUBBLES.map((bubble, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className={`flex ${bubble.align === "right" ? "justify-end" : "justify-start"}`}
              >
                <span
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-left text-sm shadow-chip ${
                    bubble.align === "right"
                      ? "bg-primary text-white"
                      : "bg-background text-foreground"
                  }`}
                >
                  {bubble.text}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={container}
        className="relative border-t border-border px-6 py-14 lg:px-10"
      >
        <div className={sectionInner}>
          <motion.div variants={fadeUp} className="text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight lg:text-3xl">
              Create → Share → Swipe → Reveal
            </h2>
          </motion.div>

          <div className="mx-auto mt-10 grid max-w-sm grid-cols-1 gap-5 lg:max-w-none lg:grid-cols-4 lg:gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                variants={fadeUp}
                className="flex gap-4 text-left lg:flex-col lg:gap-3 lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-5 lg:shadow-chip"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{step.label}</p>
                  <p className="text-sm text-foreground-muted">{step.copy}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Why I built this ───────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={container}
        className="relative border-t border-border bg-surface px-6 py-14 lg:px-10"
      >
        <div className={sectionInner}>
          <motion.div variants={fadeUp} className="text-center">
            <Eyebrow>Why I built this</Eyebrow>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight lg:text-3xl">
              A PM who ships, not just specs
            </h2>
          </motion.div>

          <motion.div variants={fadeUp} className="mx-auto mt-8 max-w-xl text-left text-foreground-muted lg:mx-0 lg:max-w-2xl">
            <p>
              I&apos;m Neeraj, a Product Manager at Planetcast Media Services. Most of my work
              lives in decks and roadmaps — this is the opposite of that, on purpose.
            </p>
            <p className="mt-4">
              I wanted a piece of proof-of-work I could actually hand someone and say &quot;open
              this on your phone,&quot; not just talk them through a case study. So I picked a
              problem I run into constantly — the fifteen minutes a group spends agreeing on
              dinner — and owned it end to end: the product thinking, the data model, the
              interface, and shipping it live.
            </p>
            <p className="mt-4">
              I built it working closely with Claude Code, learning git and deployment as I went.
              This page, and the app behind it, is what that looked like.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mx-auto mt-10 grid max-w-xl grid-cols-2 gap-4 lg:mx-0 lg:max-w-2xl lg:grid-cols-4"
          >
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-card border border-border bg-background px-4 py-4 shadow-chip"
              >
                <p className="font-mono text-2xl font-extrabold text-primary">{stat.value}</p>
                <p className="mt-1 text-xs text-foreground-muted">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="mx-auto mt-10 max-w-xl lg:mx-0 lg:max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              What&apos;s under the hood
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STACK.map((tech) => (
                <span
                  key={tech}
                  className="rounded-pill border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground-muted shadow-chip"
                >
                  {tech}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Coming soon ────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={container}
        className="relative border-t border-border px-6 py-14 text-center lg:px-10"
      >
        <div className={sectionInner}>
          <motion.div variants={fadeUp}>
            <Eyebrow>Coming soon</Eyebrow>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight lg:text-3xl">
              Next stop: your home screen
            </h2>
          </motion.div>
          <motion.p variants={fadeUp} className="mx-auto mt-3 max-w-sm text-foreground-muted">
            SyncUp already installs like an app straight from your browser. A native release on
            the app stores is next.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:flex-row sm:justify-center lg:max-w-md"
          >
            <StoreBadge icon={<PhoneIcon />} store="App Store" />
            <StoreBadge icon={<PlayIcon />} store="Google Play" />
          </motion.div>
        </div>
      </motion.section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="relative border-t border-border px-6 py-10 text-center">
        <a
          href="https://neeraj-portfolio-orcin.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          ← Back to Neeraj&apos;s portfolio
        </a>
        <p className="mt-3 text-xs text-foreground-muted">Built by Neeraj P.</p>
      </footer>
    </main>
  );
}

// Static decoration, not the real interactive DecisionCard (which needs
// live session data) — just enough of its look (rounded-card, the
// tilted-stack-behind-the-top-card silhouette, the Sync/Pass pair) to read
// as "this is the actual product" rather than generic hero art. Desktop
// only: the hero's mobile layout already has CardFanHero for this slot.
function PhonePreview() {
  return (
    <div className="relative">
      <div className="relative h-[420px] w-[230px] overflow-hidden rounded-[2.5rem] border-[6px] border-foreground bg-surface shadow-card">
        <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-pill bg-foreground/70" />

        <div className="absolute inset-x-5 top-16 h-56 rotate-[-7deg] rounded-card border border-border bg-[#8d99ae]" />
        <div className="absolute inset-x-5 top-14 flex h-60 flex-col justify-between rounded-card bg-primary p-4 text-white shadow-lg">
          <div className="h-20 rounded-xl bg-white/20" />
          <div>
            <p className="text-sm font-semibold">The Last Heist</p>
            <p className="text-xs text-white/80">Action · 2h 4m</p>
          </div>
        </div>

        <div className="absolute bottom-9 left-0 right-0 flex justify-center gap-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-pill border border-border bg-surface text-foreground-muted shadow-chip">
            <CrossIcon />
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-sync text-sync-foreground shadow-chip">
            <CheckIcon />
          </span>
        </div>
      </div>

      <div className="absolute -right-8 top-8 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
          Sync Score
        </p>
        <p className="text-2xl font-extrabold text-sync">92%</p>
      </div>
    </div>
  );
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StoreBadge({ icon, store }: { icon: React.ReactNode; store: string }) {
  return (
    <div
      aria-disabled="true"
      className="flex flex-1 items-center justify-center gap-2.5 rounded-pill border border-border bg-surface px-5 py-3 text-foreground-muted shadow-chip"
    >
      <span aria-hidden className="flex-shrink-0">
        {icon}
      </span>
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-medium uppercase tracking-wide">Coming soon</span>
        <span className="block text-sm font-semibold text-foreground">{store}</span>
      </span>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="7" y="2" width="10" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
      <line x1="11" y1="18.5" x2="13" y2="18.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor" />
    </svg>
  );
}
