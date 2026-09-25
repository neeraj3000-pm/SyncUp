"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoredParticipantId } from "@/lib/guest";
import { JoinForm } from "@/components/JoinForm";
import { CategoryLabel } from "@/components/CategoryLabel";
import { CardFanHero } from "@/components/CardFanHero";

export function JoinSessionView({
  sessionId,
  category,
  creatorName,
}: {
  sessionId: string;
  category: string;
  creatorName: string | null;
}) {
  const router = useRouter();
  // undefined = "still checking localStorage" — avoids flashing the name
  // form for someone who already joined and is just reopening the link.
  const storedParticipantId = useStoredParticipantId(sessionId);

  useEffect(() => {
    if (storedParticipantId) {
      router.replace(`/session/${sessionId}`);
    }
  }, [storedParticipantId, sessionId, router]);

  if (storedParticipantId !== null) return null;

  return (
    <>
      {/* Same atmospheric glow as join/page.tsx and the waiting room —
          fixed, not absolute (see SessionRoom's comment on why), so the
          relative content div below still paints above it. */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[50vh] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.14] blur-[80px]"
      />
      {/* flex-1 + min-h-0: fills the rest of main's height itself, so
          CardFanHero's own flex-1 has something to grow into and actually
          fills the empty space above the heading — same "brand
          illustration in the leftover space" move as landing, just above
          a bottom-anchored form instead of between two buttons and a
          footer. */}
      <div className="relative flex w-full min-h-0 flex-1 flex-col items-center gap-6 text-center">
        <CardFanHero />
        <div className="flex flex-col gap-2">
          <h1 className="text-lg">
            {creatorName ? (
              <>
                <span className="mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary align-middle text-xs font-bold text-white">
                  {creatorName.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <span className="font-semibold">{creatorName}</span> wants to
                decide <CategoryLabel category={category} />
              </>
            ) : (
              <>
                Someone wants to decide <CategoryLabel category={category} />
              </>
            )}
          </h1>
        </div>

        <div className="w-full">
          <JoinForm sessionId={sessionId} />
        </div>
      </div>
    </>
  );
}
