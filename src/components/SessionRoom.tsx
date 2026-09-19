"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGuestId, useStoredParticipantId } from "@/lib/guest";
import { startSessionAction } from "@/services/sessions/actions";
import type { ParticipantRow, SessionRow } from "@/services/sessions";
import type { SessionItemRow } from "@/services/candidates";
import { getSessionItemsAction } from "@/services/candidates/actions";
import { completeSessionByCreatorAction, completeSessionByTimerAction } from "@/services/matching/actions";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ParticipantList } from "@/components/ParticipantList";
import { SessionTimer } from "@/components/SessionTimer";
import { SwipeDeck } from "@/components/SwipeDeck";

const CATEGORY_LABEL: Record<string, string> = {
  WATCH: "what to watch 🎬",
  EAT: "where to eat 🍔",
};

const MIN_TO_START = 2;

export function SessionRoom({
  session: initialSession,
  participants: initialParticipants,
  sessionItems: initialSessionItems,
}: {
  session: SessionRow;
  participants: ParticipantRow[];
  sessionItems: SessionItemRow[];
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
  const timerFiredRef = useRef(false);

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

  // PRD section 31: the timer running out ends the session automatically,
  // for everyone, with no button required — this is what actually enforces
  // that. complete_session_on_timer (migration 0005) re-checks expires_at
  // itself and is idempotent, so it's safe for every connected participant's
  // device to attempt this once their own clock reaches zero.
  useEffect(() => {
    if (session.status !== "ACTIVE" || !session.expires_at || timerFiredRef.current) return;
    const msRemaining = new Date(session.expires_at).getTime() - Date.now();
    const timeout = setTimeout(
      () => {
        timerFiredRef.current = true;
        completeSessionByTimerAction(session.id);
      },
      Math.max(0, msRemaining),
    );
    return () => clearTimeout(timeout);
  }, [session.status, session.expires_at, session.id]);

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
          className="rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover"
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
        <h1 className="text-2xl font-bold">This SyncUp has ended.</h1>
        <Link
          href="/create"
          className="rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover"
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
    if (!result.ok) window.alert(result.error);
    // On success, the sessions UPDATE realtime event (or this device's own
    // optimistic path) flips status to COMPLETED and the effect above redirects.
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
      <div className="flex w-full flex-1 flex-col items-center gap-6 text-center">
        {session.expires_at && <SessionTimer expiresAt={session.expires_at} />}

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
    <div className="flex w-full flex-col items-center gap-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Your SyncUp</h1>
        <p className="text-foreground-muted">
          Deciding {CATEGORY_LABEL[session.category] ?? session.category}
        </p>
      </div>

      <div className="rounded-card border border-border bg-surface px-10 py-6">
        <p className="text-sm text-foreground-muted">Share this code</p>
        <p className="font-mono text-4xl font-bold tracking-[0.2em] text-primary">
          {session.code}
        </p>
      </div>

      <div className="w-full">
        <CopyLinkButton path={`/join/${session.code}`} />
      </div>

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
              setSession(result.data);
            }}
            className="w-full rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover disabled:opacity-50"
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
  );
}
