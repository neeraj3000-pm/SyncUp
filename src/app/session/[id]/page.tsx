import { notFound } from "next/navigation";
import { isUuid } from "@/lib/validation";
import { getParticipants, getSessionById } from "@/services/sessions";
import { getSessionItems } from "@/services/candidates";
import { SessionRoom } from "@/components/SessionRoom";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  // Independent reads, fetched together.
  const [session, participants, sessionItems] = await Promise.all([
    getSessionById(id),
    getParticipants(id),
    getSessionItems(id),
  ]);
  if (!session) notFound();

  // Captured server-side so SessionRoom can measure how far off this
  // device's own clock is and correct its countdown by that amount.
  const serverNow = new Date().toISOString();

  return (
    // No padding or scrolling here — each of SessionRoom's states owns its
    // own layout (the waiting room pins its Start button in a footer).
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center">
      <SessionRoom
        session={session}
        participants={participants}
        sessionItems={sessionItems}
        serverNow={serverNow}
      />
    </main>
  );
}
