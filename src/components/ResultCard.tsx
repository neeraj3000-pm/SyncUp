import type { MatchRow } from "@/services/matching";
import { joinParts } from "@/lib/format";
import { SyncScore } from "@/components/SyncScore";

// PRD section 32/33: the card itself stays simple — title, poster, score,
// and how many people picked it. Tapping opens the detail sheet for
// everything else (cast, trailer, where to watch).
export function ResultCard({ match, onTap }: { match: MatchRow; onTap: () => void }) {
  const meta = match.item.metadata as {
    year?: string | null;
    cuisine?: string | null;
    address?: string | null;
  };
  const subtitle =
    match.item.category === "WATCH" ? meta.year : joinParts([meta.cuisine, meta.address]);
  // PRD section 32/33: a perfect match gets a standout treatment — reserved
  // for 100% so it stays a genuine "everyone agreed" signal, not decoration
  // repeated on every card in the list.
  const isPerfect = Math.round(match.sync_score) === 100;

  return (
    <button
      type="button"
      onClick={onTap}
      className="relative flex w-full items-center gap-4 overflow-hidden rounded-card border border-border bg-surface p-3 text-left shadow-card transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.98]"
    >
      {isPerfect && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-hover"
        />
      )}
      {match.item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={match.item.image_url}
          alt={match.item.title}
          loading="lazy"
          decoding="async"
          className="h-24 w-16 flex-shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="h-24 w-16 flex-shrink-0 rounded-md bg-surface-raised" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-semibold">{match.item.title}</p>
        <p className="text-sm text-foreground-muted">{subtitle}</p>
        <p className="text-xs text-foreground-muted">
          {match.liked_count}/{match.participant_count} picked it
        </p>
        {match.super_like_count > 0 && (
          <p className="text-xs font-semibold text-secondary">
            {match.super_like_count === match.participant_count
              ? "⭐ Everyone loved this"
              : `⭐ ${match.super_like_count} super-liked this`}
          </p>
        )}
      </div>

      <SyncScore score={match.sync_score} />
    </button>
  );
}
