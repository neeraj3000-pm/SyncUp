import type { ParticipantRow } from "@/services/sessions";

// Alternates the two brand accents already in the palette (never the
// branded green — CLAUDE.md reserves that for Sync/agreement states only)
// so the list reads as a little more alive than a bare checkmark, without
// introducing new hues or turning it into per-person color-coding that
// means anything.
const AVATAR_COLORS = ["bg-primary", "bg-secondary"];

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
      {participants.map((p, i) => (
        <li
          key={p.id}
          className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 shadow-card"
        >
          <span
            aria-hidden
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
          >
            {p.display_name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">
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
          <span className="flex-shrink-0 font-semibold text-sync">✓</span>
        </li>
      ))}
    </ul>
  );
}
