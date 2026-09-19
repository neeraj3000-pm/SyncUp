import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionById } from "@/services/sessions";
import { getMatches } from "@/services/matching";
import { ResultsView } from "@/components/ResultsView";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) notFound();

  if (session.status !== "COMPLETED") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <p className="text-foreground-muted">
          Results aren&apos;t ready yet — this SyncUp is still in progress.
        </p>
        <Link
          href={`/session/${id}`}
          className="rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover"
        >
          Back to session
        </Link>
      </main>
    );
  }

  const matches = await getMatches(id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <ResultsView session={session} matches={matches} />
    </main>
  );
}
