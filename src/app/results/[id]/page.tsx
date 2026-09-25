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
      <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center justify-center gap-6 overflow-y-auto overscroll-contain px-6 py-12 text-center">
        <p className="text-foreground-muted">
          Results aren&apos;t ready yet — this SyncUp is still in progress.
        </p>
        <Link
          href={`/session/${id}`}
          className="rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
        >
          Back to session
        </Link>
      </main>
    );
  }

  const matches = await getMatches(id);

  return (
    <main className="relative mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col gap-8 overflow-y-auto overscroll-contain px-6 py-12">
      {/* Same atmospheric glow the landing page and join page use — this
          is PRD's "the one moment the whole app builds toward" (see
          ResultsView), so it gets the same visual weight as the
          landing page's hero instead of reading as flatly as everything
          else did before this pass. Fixed instead of absolute: a long
          result list scrolls past it rather than the glow scrolling
          away with the first screenful, matching how it anchors to the
          viewport on landing/join too. */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[18vh] h-80 w-80 -translate-x-1/2 rounded-full bg-primary/[0.18] blur-[80px]"
      />
      <ResultsView session={session} matches={matches} />
    </main>
  );
}
