import type { ParticipantRow } from "@/services/sessions";

// PRD section 20/27: everyone can see who's joined, but never another
// participant's individual choices — this list only ever renders names.
export function ParticipantList({
  participants,
  myParticipantId,
}: {
  participants: ParticipantRow[];
  myParticipantId: string | null;
}) {
  return (
    <ul className="flex w-full flex-col gap-2">
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
          </span>
          <span className="font-semibold text-sync">✓</span>
        </li>
      ))}
    </ul>
  );
}
