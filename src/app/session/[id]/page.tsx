import { notFound } from "next/navigation";
import { getParticipants, getSessionById } from "@/services/sessions";
import { getSessionItems } from "@/services/candidates";
import { SessionRoom } from "@/components/SessionRoom";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) notFound();

  const [participants, sessionItems] = await Promise.all([
    getParticipants(id),
    getSessionItems(id),
  ]);
  // Captured here, server-side, so SessionRoom can work out how far off a
  // client's own clock is (wrong timezone, unsynced system clock) and
  // correct the visual countdown by that amount — see its comment on why.
  const serverNow = new Date().toISOString();

  return (
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center gap-8 overflow-y-auto overscroll-contain px-6 py-6">
      {/* Top-anchored, not justify-end: pushing the WAITING-room content
          toward the bottom of the viewport for easier one-handed reach
          sounded good in principle, but on a real (shorter) phone
          viewport it meant content taller than the screen overflowed
          off the TOP instead of the bottom — hiding the "Your SyncUp"
          heading above the fold rather than requiring an obvious scroll
          down. Normal top-down flow guarantees the heading is always
          visible; SessionRoom's own layout below still gets the Start
          button as close to the bottom as the content allows. */}
      <SessionRoom
        session={session}
        participants={participants}
        sessionItems={sessionItems}
        serverNow={serverNow}
      />
    </main>
  );
}
