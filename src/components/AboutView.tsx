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

export function AboutView() {
  const fadeUp = useFadeUp();

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[4vh] h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-[80px]"
      />

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center px-6 pb-14 pt-14 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
          A proof-of-work project by Neeraj P
        </p>

        <CardFanHero />

        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Stop debating.
          <br />
          <span className="text-primary">SyncUp!</span>
        </h1>
        <p className="mt-4 max-w-sm text-lg text-foreground-muted">
          The app for people who can never agree on what to watch or where to eat.
        </p>

        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <TrackedLink href="/create" event="start_clicked" className={buttonPrimary}>
            Start a SyncUp!
          </TrackedLink>
          <TrackedLink href="/join" event="join_clicked" className={buttonSecondary}>
            Join a SyncUp!
          </TrackedLink>
        </div>
      </section>

      {/* ── The problem ────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={container}
        className="relative border-t border-border bg-surface px-6 py-14"
      >
        <motion.h2 variants={fadeUp} className="text-center text-2xl font-extrabold tracking-tight">
          You know the drill.
        </motion.h2>

        <div className="mx-auto mt-8 flex max-w-sm flex-col gap-2.5">
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

        <motion.p variants={fadeUp} className="mx-auto mt-8 max-w-sm text-center text-foreground-muted">
          Endless browsing. Group chats that go nowhere. Polls nobody opens. SyncUp skips all of
          it — the decision itself becomes the interaction.
        </motion.p>
      </motion.section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={container}
        className="relative border-t border-border px-6 py-14"
      >
        <motion.h2 variants={fadeUp} className="text-center text-2xl font-extrabold tracking-tight">
          How it works
        </motion.h2>

        <div className="mx-auto mt-8 flex max-w-sm flex-col gap-5">
          {STEPS.map((step, i) => (
            <motion.div key={step.label} variants={fadeUp} className="flex gap-4 text-left">
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
      </motion.section>

      {/* ── Why I built this ───────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={container}
        className="relative border-t border-border bg-surface px-6 py-14"
      >
        <motion.h2 variants={fadeUp} className="text-center text-2xl font-extrabold tracking-tight">
          Why I built this
        </motion.h2>

        <motion.div variants={fadeUp} className="mx-auto mt-8 max-w-sm text-left text-foreground-muted">
          <p>
            I&apos;m Neeraj, a Product Manager at Planetcast Media Services. Most of my work lives
            in decks and roadmaps — this is the opposite of that on purpose.
          </p>
          <p className="mt-4">
            I wanted a piece of proof-of-work I could actually hand someone and say &quot;open this
            on your phone,&quot; not just talk them through a case study. So I picked a problem I
            run into constantly — the fifteen minutes a group spends agreeing on dinner — and
            built the whole thing end to end: the product thinking, the data model, the interface,
            and shipping it live.
          </p>
          <p className="mt-4">
            I built it working closely with Claude Code, learning git and deployment as I went.
            This page, and the app behind it, is what that looked like.
          </p>
        </motion.div>
      </motion.section>

      {/* ── Coming soon ────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={container}
        className="relative border-t border-border px-6 py-14 text-center"
      >
        <motion.h2 variants={fadeUp} className="text-2xl font-extrabold tracking-tight">
          Next stop: your home screen
        </motion.h2>
        <motion.p variants={fadeUp} className="mx-auto mt-3 max-w-sm text-foreground-muted">
          SyncUp already installs like an app straight from your browser. A native release on the
          app stores is next.
        </motion.p>

        <motion.div variants={fadeUp} className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          <StoreBadge icon={<PhoneIcon />} store="App Store" />
          <StoreBadge icon={<PlayIcon />} store="Google Play" />
        </motion.div>
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
