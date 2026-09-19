import type { MatchRow } from "@/services/matching";
import { SyncScore } from "@/components/SyncScore";

// PRD section 32/33: the card itself stays simple — title, poster, score,
// and how many people picked it. Tapping opens the detail sheet for
// everything else (cast, trailer, where to watch).
export function ResultCard({ match, onTap }: { match: MatchRow; onTap: () => void }) {
  const meta = match.item.metadata as { year?: string | null };

  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-4 rounded-card border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-raised"
    >
      {match.item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={match.item.image_url}
          alt={match.item.title}
          className="h-24 w-16 flex-shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="h-24 w-16 flex-shrink-0 rounded-md bg-surface-raised" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-semibold">{match.item.title}</p>
        <p className="text-sm text-foreground-muted">{meta.year}</p>
        <p className="text-xs text-foreground-muted">
          {match.liked_count}/{match.participant_count} picked it
        </p>
      </div>

      <SyncScore score={match.sync_score} />
    </button>
  );
}
