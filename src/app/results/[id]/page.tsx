import Link from "next/link";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/validation";
import { buttonPrimary } from "@/lib/ui";
import { getSessionById } from "@/services/sessions";
import { getMatches } from "@/services/matching";
import { ResultsView } from "@/components/ResultsView";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  // Fetched together; matches is simply empty until the session completes.
  const [session, matches] = await Promise.all([getSessionById(id), getMatches(id)]);
  if (!session) notFound();

  if (session.status !== "COMPLETED") {
    return (
      <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center justify-center gap-6 overflow-y-auto overscroll-contain px-6 py-12 text-center">
        <p className="text-foreground-muted">
          Results aren&apos;t ready yet — this SyncUp is still in progress.
        </p>
        <Link href={`/session/${id}`} className={buttonPrimary}>
          Back to session
        </Link>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col gap-8 overflow-y-auto overscroll-contain px-6 py-12">
      {/* Fixed rather than absolute, so a long result list scrolls past
          the glow instead of carrying it away with the first screenful. */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[18vh] h-80 w-80 -translate-x-1/2 rounded-full bg-primary/[0.18] blur-[80px]"
      />
      <ResultsView session={session} matches={matches} />
    </main>
  );
}
