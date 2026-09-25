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
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center justify-end gap-8 overflow-y-auto overscroll-contain px-6 pb-28 pt-12">
      {/* justify-end: the WAITING-room content (code box, participant
          list, Start button) has no flex-1 of its own, so it settles in
          the bottom two-thirds of the screen instead of dead center —
          easier to reach one-handed. The ACTIVE swipe deck's own root div
          IS flex-1 (SessionRoom), so it still fills this whole area
          regardless of this justify-content, same as before. pb-28: room
          below the Start button for ThemeToggle's fixed bottom-right
          circle, which would otherwise overlap it now that it sits this
          much lower. */}
      <SessionRoom
        session={session}
        participants={participants}
        sessionItems={sessionItems}
        serverNow={serverNow}
      />
    </main>
  );
}
