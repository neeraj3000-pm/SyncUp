"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useGuestId, useStoredParticipantId } from "@/lib/guest";
import { usePolling } from "@/lib/use-polling";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import { getSessionSnapshotAction, startSessionAction } from "@/services/sessions/actions";
import type { ParticipantRow, SessionRow, SessionStatus } from "@/services/sessions";
import type { SessionItemRow } from "@/services/candidates";
import { getSessionItemsAction } from "@/services/candidates/actions";
import {
  completeSessionByCreatorAction,
  completeSessionByTimerAction,
} from "@/services/matching/actions";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ParticipantList } from "@/components/ParticipantList";
import { SessionTimer } from "@/components/SessionTimer";
import { SwipeDeck } from "@/components/SwipeDeck";
import { CategoryLabel } from "@/components/CategoryLabel";
import { track } from "@/lib/analytics";

// The QR library only loads if someone actually opens it.
const QRModal = dynamic(() => import("@/components/QRModal").then((m) => m.QRModal), {
  ssr: false,
});

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
  hostParticipantId,
  serverNow,
}: {
  session: SessionRow;
  participants: ParticipantRow[];
  sessionItems: SessionItemRow[];
  hostParticipantId: string | null;
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
  const [endError, setEndError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const timerFiredRef = useRef(false);
  // This device's clock error vs the server, so the countdown is honest.
  const [clockOffsetMs] = useState(() => new Date(serverNow).getTime() - Date.now());
  // invite_generated fires once, for the creator only.
  const inviteTrackedRef = useRef(false);

  const isWaiting = session.status === "WAITING";
  const isActive = session.status === "ACTIVE";
  // Display only — starting and ending are re-authorized server-side.
  const isCreator = myParticipantId != null && myParticipantId === hostParticipantId;

  useEffect(() => {
    if (inviteTrackedRef.current || session.status !== "WAITING" || !isCreator) return;
    inviteTrackedRef.current = true;
    track("invite_generated", { session_id: session.id, category: session.category });
  }, [session.status, session.id, session.category, isCreator]);

  // Once complete, everyone moves to the reveal automatically.
  useEffect(() => {
    if (session.status === "COMPLETED") router.push(`/results/${session.id}`);
  }, [session.status, session.id, router]);

  // Realtime: participant joins and session status/timer changes.
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

  // Polling backstop for the subscription above. Participants only matter
  // in the waiting room.
  usePolling(
    async () => {
      const result = await getSessionSnapshotAction(session.id, isWaiting);
      if (!result.ok) return;
      const { session: next, participants: nextParticipants } = result.data;
      if (next) setSession((prev) => latest(prev, next));
      if (nextParticipants) setParticipants(nextParticipants);
    },
    POLL_MS,
    isWaiting || isActive,
  );

  // Whoever is here when the session goes ACTIVE fetches the new pool.
  usePolling(
    async () => {
      const result = await getSessionItemsAction(session.id);
      if (result.ok && result.data.length > 0) setSessionItems(result.data);
    },
    POLL_MS,
    isActive && sessionItems.length === 0,
  );

  // When the timer runs out, every device asks the server to complete the
  // session. Checked repeatedly (phones suspend background timers); the
  // server re-checks the deadline and only a confirmed COMPLETED navigates.
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

  const hostName =
    participants.find((p) => p.id === hostParticipantId)?.display_name ?? "the host";

  async function completeNow() {
    if (!myGuestId) return;
    setEnding(true);
    setEndError(null);
    const result = await completeSessionByCreatorAction({
      sessionId: session.id,
      creatorGuestId: myGuestId,
    });
    setEnding(false);
    if (!result.ok || !result.data.completed) {
      setEndError(result.ok ? "Couldn't end this SyncUp. Please try again." : result.error);
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
    track("session_started", {
      session_id: session.id,
      category: session.category,
      participant_count: participants.length,
    });
    setSession((prev) => latest(prev, result.data));
  }

  if (isActive) {
    return (
      <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-6 overflow-y-auto overscroll-contain px-6 py-6 text-center">
        {/* Scrolls on short phones so End SyncUp Now! stays reachable. */}
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
            guestId={myGuestId}
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
        {endError && <p className="text-sm text-red-500">{endError}</p>}
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
