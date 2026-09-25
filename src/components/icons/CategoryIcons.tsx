// One shared pair, used everywhere a category shows up visually (the
// create-page picker, the waiting room, the join screen) — picked from a
// set of options reviewed as a mockup first. currentColor + a plain
// width/height default (overridable via className, same as ThemeToggle's
// sun/moon icons) rather than a fixed size, since consumers need this at
// very different scales: ~34px on the create page, ~16px inline in a
// sentence elsewhere. strokeWidth is also overridable, separately from
// size — stroke width is in viewBox units, so simply sizing an instance
// up via className already scales it proportionally; this is for a
// consumer that wants visibly heavier linework on top of that, without
// changing the default weight everywhere else this icon appears.

export function WatchIcon({
  className,
  strokeWidth = 1.75,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M3 8a2 2 0 1 1 0 4v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-4a2 2 0 1 1 0-4V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v2z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Kept proportionally thinner than the outline (same ~6:7 ratio as
          the 1.5/1.75 default) rather than matching it 1:1 — the dashed
          "tear line" reads as a lighter, secondary detail against the
          ticket's own outline, in the original as much as here. */}
      <path
        d="M10 5v14"
        stroke="currentColor"
        strokeWidth={strokeWidth * (1.5 / 1.75)}
        strokeDasharray="2 2.2"
      />
    </svg>
  );
}

export function EatIcon({
  className,
  strokeWidth = 1.75,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <g transform="rotate(-18 12 12)">
        <path
          d="M8 2v6.5M6 2v3.5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2M8 8.5V21"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g transform="rotate(18 12 12)">
        <path
          d="M17 2c-2 0-3.2 1.8-3.2 4.5S15 11 17 11M17 2v19"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
