"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useGuestId, useStoredParticipantId } from "@/lib/guest";
import { usePolling } from "@/lib/use-polling";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import {
  getParticipantsAction,
  getSessionAction,
  startSessionAction,
} from "@/services/sessions/actions";
import type { ParticipantRow, SessionRow, SessionStatus } from "@/services/sessions";
import type { SessionItemRow } from "@/services/candidates";
import { getSessionItemsAction } from "@/services/candidates/actions";
import {
  completeSessionByCreatorAction,
  completeSessionByTimerAction,
} from "@/services/matching/actions";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { QRModal } from "@/components/QRModal";
import { ParticipantList } from "@/components/ParticipantList";
import { SessionTimer } from "@/components/SessionTimer";
import { SwipeDeck } from "@/components/SwipeDeck";
import { CategoryLabel } from "@/components/CategoryLabel";

const MIN_TO_START = 2;
const POLL_MS = 4000;
const EXPIRY_CHECK_MS = 2000;

// A session only ever moves forward through these. Realtime events and poll
// responses can arrive out of order, so an older snapshot must never undo a
// newer one (e.g. flash the waiting room again after the deck appeared).
const STATUS_ORDER: Record<SessionStatus, number> = {
  WAITING: 0,
  ACTIVE: 1,
  COMPLETED: 2,
  EXPIRED: 2,
  CANCELLED: 2,
};

function latest(prev: SessionRow, next: SessionRow): SessionRow {
  return STATUS_ORDER[next.status] >= STATUS_ORDER[prev.status] ? next : prev;
}

export function SessionRoom({
  session: initialSession,
  participants: initialParticipants,
  sessionItems: initialSessionItems,
  serverNow,
}: {
  session: SessionRow;
  participants: ParticipantRow[];
  sessionItems: SessionItemRow[];
  serverNow: string;
}) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [participants, setParticipants] = useState(initialParticipants);
  const [sessionItems, setSessionItems] = useState(initialSessionItems);
  const myGuestId = useGuestId();
  // undefined = localStorage not checked yet (avoids a hydration mismatch
  // and a false "you haven't joined" flash).
  const myParticipantId = useStoredParticipantId(session.id);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const timerFiredRef = useRef(false);
  // How far this device's clock is from the server's (wrong timezone, fast
  // system clock) — measured once against the timestamp the server captured
  // when rendering this page, so the countdown doesn't lie.
  const [clockOffsetMs] = useState(() => new Date(serverNow).getTime() - Date.now());

  const isWaiting = session.status === "WAITING";
  const isActive = session.status === "ACTIVE";

  // PRD section 31: once complete, everyone moves to the reveal with no
  // action required.
  useEffect(() => {
    if (session.status === "COMPLETED") router.push(`/results/${session.id}`);
  }, [session.status, session.id, router]);

  // Realtime: participant joins and session status/timer changes (PRD
  // section 44). The server stays authoritative — this relays its rows.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`session-room:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "participants",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const row = payload.new as ParticipantRow;
          setParticipants((prev) => (prev.some((p) => p.id === row.id) ? prev : [...prev, row]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => setSession((prev) => latest(prev, payload.new as SessionRow)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id]);

  // Polling backstops for the subscription above: a dropped or delayed
  // WebSocket event self-heals within one interval instead of needing a
  // manual refresh.
  usePolling(
    async () => {
      const result = await getParticipantsAction(session.id);
      if (result.ok) setParticipants(result.data);
    },
    POLL_MS,
    isWaiting,
  );

  usePolling(
    async () => {
      const result = await getSessionAction(session.id);
      if (result.ok && result.data) {
        const next = result.data;
        setSession((prev) => latest(prev, next));
      }
    },
    POLL_MS,
    isWaiting || isActive,
  );

  // The pool is generated as the session starts, after this page's own
  // server-side fetch — so whoever is here when it goes ACTIVE pulls it,
  // retrying until it arrives.
  usePolling(
    async () => {
      const result = await getSessionItemsAction(session.id);
      if (result.ok && result.data.length > 0) setSessionItems(result.data);
    },
    POLL_MS,
    isActive && sessionItems.length === 0,
  );

  // PRD section 31: the timer running out ends the session for everyone.
  // A short repeating check (not one long setTimeout) because phones
  // suspend timers in backgrounded tabs; the hook also re-checks the moment
  // the tab is visible again. complete_session_on_timer re-checks the
  // deadline against the database clock and is idempotent, so every
  // device attempting it is safe — and navigation waits for the server to
  // confirm COMPLETED rather than trusting this device's clock.
  const expiresAt = session.expires_at ? new Date(session.expires_at).getTime() : null;
  usePolling(
    async () => {
      if (timerFiredRef.current || expiresAt === null || Date.now() + clockOffsetMs < expiresAt) {
        return;
      }
      timerFiredRef.current = true;
      const result = await completeSessionByTimerAction(session.id);
      if (result.ok && result.data.completed) {
        router.push(`/results/${session.id}`);
      } else {
        // Not confirmed yet — let the next check try again.
        timerFiredRef.current = false;
      }
    },
    EXPIRY_CHECK_MS,
    isActive && expiresAt !== null,
  );

  if (myParticipantId === undefined || myGuestId === null) {
    return null;
  }

  if (myParticipantId === null || !participants.some((p) => p.id === myParticipantId)) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-6 py-6 text-center">
        <p className="text-foreground-muted">Looks like you haven&apos;t joined this SyncUp yet.</p>
        <Link href={`/join/${session.code}`} className={buttonPrimary}>
          Join with code {session.code}
        </Link>
      </div>
    );
  }

  if (session.status === "COMPLETED") {
    // The redirect effect above is already navigating away.
    return null;
  }

  if (session.status === "EXPIRED" || session.status === "CANCELLED") {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-6 py-6 text-center">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">This SyncUp has ended.</h1>
        <Link href="/create" className={buttonPrimary}>
          Start a New One
        </Link>
      </div>
    );
  }

  const isCreator = myGuestId === session.creator_guest_id;
  const host = participants.find((p) => p.guest_id === session.creator_guest_id);
  const hostParticipantId = host?.id ?? null;
  const hostName = host?.display_name ?? "the host";

  async function completeNow() {
    if (!myGuestId) return;
    setEnding(true);
    const result = await completeSessionByCreatorAction({
      sessionId: session.id,
      creatorGuestId: myGuestId,
    });
    setEnding(false);
    if (!result.ok || !result.data.completed) {
      window.alert(result.ok ? "Couldn't end this SyncUp. Please try again." : result.error);
      return;
    }
    // Navigate directly rather than waiting for the realtime UPDATE to
    // round-trip back to the device that triggered it.
    router.push(`/results/${session.id}`);
  }

  // "Reveal Results" (everyone already finished) skips confirmation; "End
  // Now" can cut others off mid-swipe, so it confirms first.
  function handleEndNow() {
    if (window.confirm("End this SyncUp now and reveal the results?")) completeNow();
  }

  async function handleStart() {
    if (!myGuestId) return;
    setStarting(true);
    setStartError(null);
    const result = await startSessionAction({ sessionId: session.id, guestId: myGuestId });
    setStarting(false);
    if (!result.ok) {
      setStartError(result.error);
      return;
    }
    setSession((prev) => latest(prev, result.data));
  }

  if (isActive) {
    return (
      <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-6 px-6 py-6 text-center">
        <h1 className="sr-only">
          Deciding <CategoryLabel category={session.category} />
        </h1>
        {session.expires_at && (
          <SessionTimer expiresAt={session.expires_at} clockOffsetMs={clockOffsetMs} />
        )}

        {sessionItems.length === 0 ? (
          <p className="text-foreground-muted">Loading your deck…</p>
        ) : (
          <SwipeDeck
            sessionId={session.id}
            participantId={myParticipantId}
            category={session.category}
            initialItems={sessionItems}
            isCreator={isCreator}
            hostName={hostName}
            hostParticipantId={hostParticipantId}
            onCreatorReveal={completeNow}
          />
        )}

        {isCreator && (
          <button
            type="button"
            onClick={handleEndNow}
            disabled={ending}
            className="w-fit rounded-pill border border-border bg-surface px-6 py-3 text-sm font-semibold shadow-card transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97] disabled:opacity-50"
          >
            {ending ? "Ending…" : "End SyncUp Now!"}
          </button>
        )}
      </div>
    );
  }

  // WAITING: everything above the Start button scrolls in its own region;
  // the button itself sits in a footer that never leaves the screen.
  return (
    <div className="flex w-full min-h-0 flex-1 flex-col">
      {/* Fixed, so it needs no viewport-sized relative ancestor; the
          scrollable region below is `relative` so it paints above it. */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[50vh] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.14] blur-[80px]"
      />
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-12">
        <div className="flex flex-col items-center gap-4 pb-6 text-center">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold leading-tight tracking-tight">Your SyncUp!</h1>
            <p className="text-foreground-muted">
              Deciding <CategoryLabel category={session.category} />
            </p>
          </div>

          <div className="rounded-card border border-border bg-surface px-10 py-5 shadow-card">
            <p className="text-sm text-foreground-muted">Share this code</p>
            <p className="font-mono text-4xl font-bold tracking-[0.2em] text-primary">
              {session.code}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <CopyLinkButton path={`/join/${session.code}`} />
            <button
              type="button"
              onClick={() => setShowQR(true)}
              className={`w-full ${buttonSecondary}`}
            >
              Show QR Code
            </button>
          </div>

          {showQR && (
            <QRModal
              path={`/join/${session.code}`}
              code={session.code}
              onClose={() => setShowQR(false)}
            />
          )}

          {/* Capped and internally scrollable so a full group of 10 doesn't
              dominate the screen. */}
          <div className="w-full max-h-48 overflow-y-auto overscroll-contain">
            <ParticipantList
              participants={participants}
              myParticipantId={myParticipantId}
              hostParticipantId={hostParticipantId}
            />
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border bg-background px-6 pb-6 pt-4">
        {isCreator ? (
          <div className="flex w-full flex-col items-center gap-2">
            <button
              type="button"
              disabled={starting || participants.length < MIN_TO_START}
              onClick={handleStart}
              className={`w-full ${buttonPrimary}`}
            >
              {starting ? "Starting…" : "Start SyncUp!"}
            </button>
            {participants.length < MIN_TO_START && (
              <p className="text-sm text-foreground-muted">
                Need at least {MIN_TO_START} people to start.
              </p>
            )}
            {startError && <p className="text-sm text-red-500">{startError}</p>}
          </div>
        ) : (
          <p className="text-center text-sm text-foreground-muted">
            Waiting for the host to start the SyncUp…
          </p>
        )}
      </div>
    </div>
  );
}
