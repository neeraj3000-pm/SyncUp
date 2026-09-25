"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoredParticipantId } from "@/lib/guest";
import { JoinForm } from "@/components/JoinForm";
import { CategoryLabel } from "@/components/CategoryLabel";

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
    <div className="flex w-full flex-col items-center gap-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg">
          {creatorName ? (
            <>
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
  );
}
