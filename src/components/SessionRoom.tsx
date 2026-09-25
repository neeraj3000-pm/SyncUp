"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGuestId, useStoredParticipantId } from "@/lib/guest";
import {
  getParticipantsAction,
  getSessionAction,
  startSessionAction,
} from "@/services/sessions/actions";
import type { ParticipantRow, SessionRow } from "@/services/sessions";
import type { SessionItemRow } from "@/services/candidates";
import { getSessionItemsAction } from "@/services/candidates/actions";
import { completeSessionByCreatorAction, completeSessionByTimerAction } from "@/services/matching/actions";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { QRModal } from "@/components/QRModal";
import { ParticipantList } from "@/components/ParticipantList";
import { SessionTimer } from "@/components/SessionTimer";
import { SwipeDeck } from "@/components/SwipeDeck";
import { CategoryLabel } from "@/components/CategoryLabel";
import { track } from "@/lib/analytics";

const MIN_TO_START = 2;
const PARTICIPANTS_POLL_MS = 4000;

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
  // undefined = "haven't checked localStorage yet" (avoids a hydration
  // mismatch / an incorrect "you haven't joined" flash before that check runs).
  const myGuestId = useGuestId();
  const myParticipantId = useStoredParticipantId(session.id);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const timerFiredRef = useRef(false);
  // How far off this device's own clock is from the server's — a laptop
  // with a fast clock or the wrong timezone otherwise makes the visual
  // countdown lie (showing "Time's up!" while the server, correctly, still
  // has time left). Computed once from the timestamp the server captured
  // when it rendered this page; the initializer form of useState means
  // this genuinely only runs once, not on every render.
  const [clockOffsetMs] = useState(() => new Date(serverNow).getTime() - Date.now());
  // Fires once, only for the creator (they're the one who "generated" it) —
  // the effect can re-run on every participants/timer poll, so a ref
  // guards it rather than relying on the dependency array alone.
  const inviteTrackedRef = useRef(false);
  useEffect(() => {
    if (
      inviteTrackedRef.current ||
      session.status !== "WAITING" ||
      !myGuestId ||
      myGuestId !== session.creator_guest_id
    ) {
      return;
    }
    inviteTrackedRef.current = true;
    track("invite_generated", { session_id: session.id, category: session.category });
  }, [session.status, session.id, session.category, session.creator_guest_id, myGuestId]);

  // The candidate pool is generated inside startSession, which happens
  // after this page's initial server-side fetch — so whoever's on this
  // screen when status flips to ACTIVE (the creator who just clicked Start,
  // or anyone else via the realtime update below) needs to pull it fresh.
  useEffect(() => {
    if (session.status !== "ACTIVE" || sessionItems.length > 0) return;
    getSessionItemsAction(session.id).then((result) => {
      if (result.ok) setSessionItems(result.data);
    });
  }, [session.status, session.id, sessionItems.length]);

  // Once the session completes, every participant's screen moves to the
  // reveal (PRD section 31: no additional action should be required). The
  // status change itself arrives either from this device's own action
  // (Start/End Now) or via the realtime subscription below.
  useEffect(() => {
    if (session.status === "COMPLETED") router.push(`/results/${session.id}`);
  }, [session.status, session.id, router]);

  // Backstop for the Realtime participant-join subscription below: a
  // WebSocket event can be delayed or dropped, which was leaving a new
  // joiner invisible to the rest of the waiting room until someone
  // happened to reload. Only matters pre-start — join is disabled once
  // ACTIVE (session.status !== "WAITING" check below), so there's nothing
  // for this poll to reconcile after that point.
  useEffect(() => {
    if (session.status !== "WAITING") return;
    let cancelled = false;
    const interval = setInterval(() => {
      getParticipantsAction(session.id).then((result) => {
        if (!cancelled && result.ok) setParticipants(result.data);
      });
    }, PARTICIPANTS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session.status, session.id]);

  // PRD section 31: the timer running out ends the session automatically,
  // for everyone, with no button required — this is what actually enforces
  // that. complete_session_on_timer (migration 0005) re-checks expires_at
  // itself and is idempotent, so it's safe for every connected participant's
  // device to attempt this once their own clock reaches zero.
  //
  // This used to be a single setTimeout scheduled for the exact remaining
  // duration. Mobile browsers throttle or fully suspend JS timers in a
  // backgrounded tab (screen locked, app switched away) — a delay that can
  // run many minutes long is exactly the kind that gets clipped or dropped,
  // so a phone could sit well past the real deadline still showing swipeable
  // cards, with every swipe then rejected by the server (which correctly
  // already flipped the session to COMPLETED from another device) as
  // "Couldn't save that swipe." Polling on a short fixed interval instead —
  // plus an immediate re-check when the tab regains focus — means the worst
  // case is a few seconds' delay instead of an indefinitely suspended timer.
  useEffect(() => {
    if (session.status !== "ACTIVE" || !session.expires_at) return;
    const expiresAt = new Date(session.expires_at).getTime();
    let inFlight = false;

    function checkExpiry() {
      if (timerFiredRef.current || inFlight || Date.now() + clockOffsetMs < expiresAt) return;
      inFlight = true;
      completeSessionByTimerAction(session.id).then((result) => {
        inFlight = false;
        // Only navigate on a server-confirmed COMPLETED status — never on
        // the mere fact that this call resolved without throwing. A
        // client whose clock runs fast, or is set to the wrong timezone,
        // reaches this point before the real server-side deadline has
        // passed; the RPC above correctly no-ops in that case (it
        // re-checks expires_at against the database's own clock), and
        // navigating anyway would send the user to a results page for a
        // session that, per the server, genuinely isn't done yet —
        // exactly the failure this whole polling approach exists to
        // avoid trusting a client clock for in the first place.
        if (result.ok && result.data.completed) {
          timerFiredRef.current = true;
          router.push(`/results/${session.id}`);
        }
        // Otherwise leave timerFiredRef false: the next poll tick (or the
        // next visibilitychange) tries again, self-correcting once the
        // real deadline arrives or another device completes it.
      });
    }

    checkExpiry();
    const interval = setInterval(checkExpiry, 2000);
    document.addEventListener("visibilitychange", checkExpiry);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", checkExpiry);
    };
  }, [session.status, session.expires_at, session.id, router, clockOffsetMs]);

  // Backstop for the Realtime subscription's "sessions" UPDATE handler
  // below, same idea as the participants poll above: a dropped or delayed
  // WebSocket event was leaving a screen stuck on the waiting room after
  // someone else started the session, or on the swipe deck after someone
  // else ended it, until the person manually refreshed. Runs for both
  // WAITING (catches the start) and ACTIVE (catches an end triggered by
  // another participant, or by the timer firing on another device) —
  // nothing to reconcile once COMPLETED/EXPIRED/CANCELLED.
  useEffect(() => {
    if (session.status !== "WAITING" && session.status !== "ACTIVE") return;
    let cancelled = false;
    const interval = setInterval(() => {
      getSessionAction(session.id).then((result) => {
        if (!cancelled && result.ok && result.data) setSession(result.data);
      });
    }, PARTICIPANTS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session.status, session.id]);

  // Realtime: participant joins and the session's own status/timer fields
  // (PRD section 44). The server remains authoritative — this just relays
  // the rows it already wrote.
  useEffect(() => {
    const supabase = createClient();
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
          setParticipants((prev) =>
            prev.some((p) => p.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          setSession(payload.new as SessionRow);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id]);

  if (myParticipantId === undefined || myGuestId === null) {
    return null;
  }

  if (myParticipantId === null || !participants.some((p) => p.id === myParticipantId)) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-foreground-muted">
          Looks like you haven&apos;t joined this SyncUp yet.
        </p>
        <Link
          href={`/join/${session.code}`}
          className="rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
        >
          Join with code {session.code}
        </Link>
      </div>
    );
  }

  if (session.status === "COMPLETED") {
    // The redirect effect above is already navigating away — render
    // nothing rather than a stale WAITING/ACTIVE view for the instant
    // before that happens.
    return null;
  }

  if (session.status === "EXPIRED" || session.status === "CANCELLED") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">This SyncUp has ended.</h1>
        <Link
          href="/create"
          className="rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
        >
          Start a New One
        </Link>
      </div>
    );
  }

  const isCreator = myGuestId === session.creator_guest_id;
  const hostParticipantId =
    participants.find((p) => p.guest_id === session.creator_guest_id)?.id ?? null;
  const hostName =
    participants.find((p) => p.guest_id === session.creator_guest_id)?.display_name ?? "the host";

  async function completeNow() {
    if (!myGuestId) return;
    setEnding(true);
    const result = await completeSessionByCreatorAction({
      sessionId: session.id,
      creatorGuestId: myGuestId,
    });
    setEnding(false);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    // Navigate directly rather than waiting for the realtime UPDATE to
    // round-trip back to this same device that just triggered it.
    router.push(`/results/${session.id}`);
  }

  // "Reveal Results" (everyone already finished naturally) skips the
  // confirmation — there's no real "are you sure" tension there. "End Now"
  // (ending early, mid-swipe, for the rest of the group) still confirms,
  // since that one can genuinely cut someone off early by mistake.
  function handleEndNow() {
    if (window.confirm("End this SyncUp now and reveal the results?")) completeNow();
  }

  if (session.status === "ACTIVE") {
    return (
      <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-6 text-center">
        <h1 className="sr-only">
          Deciding <CategoryLabel category={session.category} />
        </h1>
        {session.expires_at && (
          <SessionTimer expiresAt={session.expires_at} clockOffsetMs={clockOffsetMs} />
        )}

        {sessionItems.length === 0 ? (
          <p className="text-foreground-muted">Finding movies everyone might like…</p>
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
            className="text-sm text-foreground-muted underline underline-offset-2 disabled:opacity-50"
          >
            {ending ? "Ending…" : "End SyncUp Now"}
          </button>
        )}
      </div>
    );
  }

  // WAITING
  return (
    <>
      {/* Same atmospheric glow as the join screens (join/page.tsx,
          JoinSessionView) — this was the one screen in that trio still
          reading as flat/empty. Fixed, not absolute, so it doesn't need a
          relative ancestor sized to the viewport (matches results page's
          reasoning); the content div right below gets `relative` itself so
          it still paints above this rather than under it (a position:fixed
          sibling otherwise paints over a plain static one regardless of
          DOM order). */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[50vh] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.14] blur-[80px]"
      />
      <div className="relative flex w-full flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-tight tracking-tight">Your SyncUp</h1>
          <p className="text-foreground-muted">
            Deciding <CategoryLabel category={session.category} />
          </p>
        </div>

        <div className="rounded-card border border-border bg-surface px-10 py-6 shadow-card">
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
            className="w-full rounded-pill border border-border px-8 py-4 text-lg font-semibold shadow-card transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
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

        <ParticipantList
          participants={participants}
          myParticipantId={myParticipantId}
          hostParticipantId={hostParticipantId}
        />

        {isCreator ? (
          <div className="flex w-full flex-col items-center gap-2">
            <button
              type="button"
              disabled={starting || participants.length < MIN_TO_START}
              onClick={async () => {
                if (!myGuestId) return;
                setStarting(true);
                setStartError(null);
                const result = await startSessionAction({
                  sessionId: session.id,
                  guestId: myGuestId,
                });
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
                setSession(result.data);
              }}
              className="w-full rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97] disabled:bg-border disabled:text-foreground-muted disabled:shadow-none"
            >
              {starting ? "Starting…" : "Start SyncUp"}
            </button>
            {participants.length < MIN_TO_START && (
              <p className="text-sm text-foreground-muted">
                Need at least {MIN_TO_START} people to start.
              </p>
            )}
            {startError && <p className="text-sm text-red-500">{startError}</p>}
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">
            Waiting for the host to start the SyncUp…
          </p>
        )}
      </div>
    </>
  );
}
