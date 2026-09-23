import type { ParticipantRow } from "@/services/sessions";

// PRD section 20/27: everyone can see who's joined, but never another
// participant's individual choices — this list only ever renders names.
export function ParticipantList({
  participants,
  myParticipantId,
  hostParticipantId,
}: {
  participants: ParticipantRow[];
  myParticipantId: string | null;
  hostParticipantId?: string | null;
}) {
  return (
    <ul className="flex w-full flex-col gap-2" role="status" aria-live="polite">
      {participants.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3"
        >
          <span className="font-medium">
            {p.display_name}
            {p.id === myParticipantId && (
              <span className="text-foreground-muted"> (you)</span>
            )}
            {/* Remote groups have no side-channel to know who's driving
                Start/Reveal/End — labeling the host removes that ambiguity. */}
            {p.id === hostParticipantId && (
              <span className="text-foreground-muted"> (Host)</span>
            )}
          </span>
          <span className="font-semibold text-sync">✓</span>
        </li>
      ))}
    </ul>
  );
}
