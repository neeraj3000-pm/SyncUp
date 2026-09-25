"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoredParticipantId } from "@/lib/guest";
import { JoinForm } from "@/components/JoinForm";
import { CategoryLabel } from "@/components/CategoryLabel";
import { CardFanHero } from "@/components/CardFanHero";
import { EatIcon, WatchIcon } from "@/components/icons/CategoryIcons";

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
      {/* min-h-0 + flex-1: fills the rest of main's height itself, so the
          spacer right below has real leftover space to absorb. */}
      <div className="relative flex w-full min-h-0 flex-1 flex-col items-center gap-6 text-center">
        {/* A plain zero-basis spacer — not flex-1 on CardFanHero itself,
            which turned out not to reliably shrink back down under real
            overflow (see that component's own comment). This shrinks to
            true zero on a short viewport instead of pushing content past
            the fold. */}
        <div className="min-h-0 flex-1" />
        <CardFanHero />
        {/* Which category this particular invite is for, once more and
            bigger than CategoryLabel's small inline icon in the heading
            below — echoes the create page's own Watch/Eat icons rather
            than introducing a third icon style. */}
        {category === "WATCH" && (
          <WatchIcon className="h-14 w-14 text-primary" strokeWidth={2.25} />
        )}
        {category === "EAT" && <EatIcon className="h-14 w-14 text-primary" strokeWidth={2.25} />}
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
