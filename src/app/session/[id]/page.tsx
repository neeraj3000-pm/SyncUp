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
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center">
      {/* No padding/overflow/gap here — each of SessionRoom's branches
          owns its own now, since the WAITING branch needs a fixed
          footer (the Start button, always on screen) with only the
          content above it scrolling, while ACTIVE fills this whole
          area itself. A shared "one size fits all" wrapper couldn't do
          both. Top-anchored is still the rule throughout: pushing
          content toward the bottom (the earlier reachability pass)
          overflowed off the TOP on a short real phone viewport, hiding
          the heading — normal top-down flow keeps it always visible. */}
      <SessionRoom
        session={session}
        participants={participants}
        sessionItems={sessionItems}
        serverNow={serverNow}
      />
    </main>
  );
}
