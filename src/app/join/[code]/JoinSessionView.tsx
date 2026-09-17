"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoredParticipantId } from "@/lib/guest";
import { JoinForm } from "@/components/JoinForm";

const CATEGORY_LABEL: Record<string, string> = {
  WATCH: "what to watch 🎬",
  EAT: "where to eat 🍔",
};

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

  const label = CATEGORY_LABEL[category] ?? category;

  return (
    <div className="flex w-full flex-col items-center gap-8 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-lg">
          {creatorName ? (
            <>
              <span className="font-semibold">{creatorName}</span> wants to
              decide {label}
            </>
          ) : (
            <>Someone wants to decide {label}</>
          )}
        </p>
      </div>

      <div className="w-full">
        <JoinForm sessionId={sessionId} />
      </div>
    </div>
  );
}
