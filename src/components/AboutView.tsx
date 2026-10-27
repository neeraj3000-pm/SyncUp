"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { animate, motion, useReducedMotion } from "motion/react";
import { TrackedLink } from "@/components/TrackedLink";
import { buttonPrimary } from "@/lib/ui";
import { useInstallPrompt } from "@/lib/use-install-prompt";

// Same cascade as the results reveal; reduced motion drops the lift.
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
    copy: "Highest match wins, everybody wins!",
  },
] as const;

const CHAT_BUBBLES = [
  { text: "what should we watch tonight", align: "left" as const },
  { text: "idk you pick 😭", align: "right" as const },
  { text: "Where do you wanna have dinner?", align: "left" as const },
  { text: "anywhere's fine 🙃", align: "right" as const },
];

// Readable content width inside full-bleed coloured bands.
const sectionInner = "mx-auto w-full max-w-5xl";

const STATS = [
  { value: "2–10", label: "people per SyncUp" },
  { value: "10s", label: "to start a SyncUp, no account" },
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

export function AboutView({ fromApp = false }: { fromApp?: boolean }) {
  const fadeUp = useFadeUp();

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[4vh] h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-[80px]"
      />

      {!fromApp && (
        <a
          href="https://neeraj-portfolio-orcin.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed left-4 z-40 flex h-11 items-center rounded-pill border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-md transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
          style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
        >
          ← Portfolio
        </a>
      )}

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className={`relative ${sectionInner} px-6 pb-14 pt-20 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-10 lg:pt-28`}>
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="lg:hidden">
            <PhonePreview />
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:mt-2 lg:text-6xl">
            Stop debating.
            <br />
            <span className="text-primary">SyncUp!</span>
          </h1>
          <p className="mt-4 max-w-sm text-lg text-foreground-muted lg:max-w-md">
            Swipe. Match. Stop arguing.
          </p>

          <div className="mt-8 w-full max-w-xs">
            <TrackedLink href="/" event="start_clicked" className={buttonPrimary}>
              Check out SyncUp
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
        <div className={`${sectionInner} lg:grid lg:grid-cols-2 lg:items-start lg:gap-16`}>
          <div>
            <motion.div variants={fadeUp} className="text-center lg:text-left">
              <Eyebrow>Why I built this</Eyebrow>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight lg:text-3xl">
                Built to settle one argument
              </h2>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-6 lg:hidden">
              <PhoneFan size="small" />
            </motion.div>

            <motion.div variants={fadeUp} className="mx-auto mt-8 max-w-xl text-left text-foreground-muted lg:mx-0">
              <p>
                The real reason I built this: my wife and I could never agree on where to eat or
                what to watch. Every night turned into the same &quot;I don&apos;t know, you
                pick&quot; — so I built something to settle it for us. Everyone swipes on the same
                options, privately, and whoever agrees the most wins. No more back-and-forth.
              </p>
              <p className="mt-4">
                It worked so well that I realized this is a problem basically every group has —
                roommates, friends, family trips — so I extended this to handle friend groups as
                well, up to 10 people at once, not just couples.
              </p>
              <p className="mt-4">
                Built with Claude Code and shipped through GitHub, running on Supabase with
                real-time sync, and wired up with PostHog to see how people actually use it. Next
                up: expanding beyond movies and restaurants to TV shows, vacations, and more —
                plus getting SyncUp onto the App Store and Google Play.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mx-auto mt-10 grid max-w-xl grid-cols-2 gap-4 lg:mx-0"
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

            <motion.div variants={fadeUp} className="mx-auto mt-10 max-w-xl lg:mx-0">
              <p className="font-mono text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                What&apos;s under the hood
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {STACK.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-pill border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground-muted shadow-chip transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:text-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div variants={fadeUp} className="relative mt-12 hidden lg:block">
            <PhoneFan size="large" />
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
            You can use SyncUp right now, free, straight from your browser. Native App Store and
            Google Play versions are on the way.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mx-auto mt-8 flex max-w-sm flex-col items-center gap-5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-6 lg:max-w-xl"
          >
            <WebAppBadge />
            <StoreBadge src="/badges/app-store.png" alt="Coming soon to the App Store" />
            <StoreBadge src="/badges/google-play.png" alt="Get it on Google Play" />
          </motion.div>
        </div>
      </motion.section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="relative border-t border-border px-6 py-10 text-center">
        {!fromApp && (
          <a
            href="https://neeraj-portfolio-orcin.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            ← Back to Neeraj&apos;s portfolio
          </a>
        )}
        <p className={`text-xs text-foreground-muted ${fromApp ? "" : "mt-3"}`}>Built by Neeraj P.</p>
      </footer>
    </main>
  );
}

// A static look-alike of the swipe card. The inner markup is laid out at
// its native 230x420 and scaled with a transform on small screens, so
// nothing inside needs per-breakpoint measurements.
function PhonePreview() {
  return (
    <div className="relative h-[280px] w-[153px] lg:h-[420px] lg:w-[230px]">
      <div className="absolute left-0 top-0 origin-top-left scale-[0.665] lg:scale-100">
        <div className="relative">
          <div className="relative h-[420px] w-[230px] overflow-hidden rounded-[2.5rem] border-[6px] border-foreground bg-surface shadow-card">
            <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-pill bg-foreground/70" />

            <div className="absolute inset-x-5 top-16 h-56 rotate-[-7deg] rounded-card border border-border bg-[#8d99ae]" />
            <div className="absolute inset-x-5 top-14 flex h-60 flex-col justify-between overflow-hidden rounded-card text-white shadow-lg">
              <Image src="/posters/inception.jpg" alt="" fill aria-hidden sizes="190px" className="object-cover" />
              <div className="relative mt-auto bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-10">
                <p className="text-sm font-semibold">Inception</p>
                <p className="text-xs text-white/80">Sci-Fi, Action · 2h 28m</p>
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

          <div className="absolute -right-8 top-32 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
              Sync Score
            </p>
            <p className="text-2xl font-extrabold text-sync">
              <CountUp to={92} />%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Counts up from 0 once mounted; reduced motion shows the final value.
function CountUp({ to }: { to: number }) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? to : 0);

  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(0, to, {
      duration: 1.1,
      delay: 0.3,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{value}</>;
}

// A real screenshot in a phone bezel.
function PhoneFrame({
  src,
  alt,
  className,
  style,
}: {
  src: string;
  alt: string;
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`overflow-hidden rounded-[2.5rem] border-[6px] border-foreground bg-surface shadow-card ${className}`}
    >
      <Image src={src} alt={alt} fill sizes="252px" className="object-cover object-top" />
      <div className="pointer-events-none absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-pill bg-foreground/70" />
    </div>
  );
}

// Home screen behind, the "YOU'RE SYNCED" reveal in front.
function PhoneFan({ size }: { size: "small" | "large" }) {
  const dims = size === "large" ? { h: 440, w: 240 } : { h: 280, w: 153 };
  return (
    <div
      className="relative mx-auto"
      style={{ height: dims.h + 28, width: dims.w + 56 }}
    >
      <PhoneFrame
        src="/screenshots/home.png"
        alt="SyncUp home screen"
        className="absolute left-0 top-0 -rotate-6"
        style={{ height: dims.h, width: dims.w }}
      />
      <PhoneFrame
        src="/screenshots/results.jpg"
        alt="SyncUp results screen showing a synced match"
        className="absolute bottom-0 right-0 rotate-3"
        style={{ height: dims.h, width: dims.w }}
      />
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

// Official store badges, unmodified, in a fixed box so both render the
// same size despite different aspect ratios.
function StoreBadge({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="relative block h-14 w-[172px]">
      <Image src={src} alt={alt} fill sizes="172px" className="object-contain" />
    </span>
  );
}

// Chrome/Edge/Android get a real Install button, iOS gets instructions,
// anything else just opens the app.
function WebAppBadge() {
  const { platform, promptInstall } = useInstallPrompt();

  const card = (
    <span className="flex h-14 w-[172px] flex-col items-center justify-center rounded-xl border border-border bg-surface px-3 text-center shadow-chip transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]">
      <span className="text-xs font-semibold leading-tight">Install the web app</span>
      <span className="mt-0.5 text-[10px] leading-tight text-foreground-muted">
        {platform === "ios-safari"
          ? 'Tap Share → "Add to Home Screen"'
          : platform === "ios-other"
            ? "Open in Safari to install"
            : platform === "promptable"
              ? "One tap, no store needed"
              : "Free, right in your browser"}
      </span>
    </span>
  );

  if (!platform) return <span className="h-14 w-[172px]" aria-hidden />;

  if (platform === "promptable") {
    return (
      <button type="button" onClick={promptInstall}>
        {card}
      </button>
    );
  }

  return (
    <TrackedLink href="/" event="start_clicked">
      {card}
    </TrackedLink>
  );
}
