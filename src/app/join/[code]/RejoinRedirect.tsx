"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStoredParticipantId } from "@/lib/guest";

// Someone already in this session reopening the invite link goes back to
// where they belong; everyone else sees `children` (the "already started" /
// "ended" screen).
export function RejoinRedirect({
  sessionId,
  href,
  children,
}: {
  sessionId: string;
  href: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const storedParticipantId = useStoredParticipantId(sessionId);

  useEffect(() => {
    if (storedParticipantId) router.replace(href);
  }, [storedParticipantId, href, router]);

  return storedParticipantId === null ? children : null;
}
