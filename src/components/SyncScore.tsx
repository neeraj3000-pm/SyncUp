// PRD section 34: highest agreement first, unanimous (100%) framed as a
// clear "everyone's in" signal — Branded Green is reserved for exactly
// this kind of agreement state (CLAUDE.md design system).
export function SyncScore({ score }: { score: number }) {
  const rounded = Math.round(score);
  const isPerfect = rounded === 100;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-3 py-1 text-sm font-bold ${
        isPerfect ? "bg-sync text-sync-foreground" : "bg-surface-raised text-foreground"
      }`}
    >
      {isPerfect && "✓ "}
      {rounded}%
    </span>
  );
}
