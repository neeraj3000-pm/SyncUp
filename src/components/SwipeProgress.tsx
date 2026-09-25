import type { ParticipantProgress } from "@/services/swipes";

// PRD section 28: communicates activity ("Neeraj — 23/50", "Rahul — Done")
// without ever showing what anyone actually swiped — swipe_count and
// finished_at are the only fields session_progress() exposes (migration
// 0001/0003), by design.
export function SwipeProgress({
  progress,
  totalItems,
  myParticipantId,
  hostParticipantId,
}: {
  progress: ParticipantProgress[];
  totalItems: number;
  myParticipantId: string;
  hostParticipantId?: string | null;
}) {
  if (progress.length === 0) return null;

  return (
    <ul className="flex w-full flex-col gap-2" role="status" aria-live="polite">
      {progress.map((p) => (
        <li
          key={p.participant_id}
          className="flex items-center justify-between rounded-card border border-border bg-surface px-4 py-2 text-sm shadow-card"
        >
          <span>
            {p.display_name}
            {p.participant_id === myParticipantId && (
              <span className="text-foreground-muted"> (you)</span>
            )}
            {p.participant_id === hostParticipantId && (
              <span className="text-foreground-muted"> (Host)</span>
            )}
          </span>
          <span className="font-semibold">
            {p.finished_at ? <span className="text-sync">Done</span> : `${p.swipe_count}/${totalItems}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
