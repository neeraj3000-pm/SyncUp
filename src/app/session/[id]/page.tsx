import { notFound } from "next/navigation";
import { getParticipants, getSessionById } from "@/services/sessions";
import { SessionRoom } from "@/components/SessionRoom";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) notFound();

  const participants = await getParticipants(id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <SessionRoom session={session} participants={participants} />
    </main>
  );
}
