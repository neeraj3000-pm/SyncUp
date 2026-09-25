// The fanned three-card mark from the app icon, scaled up — the one
// shared "brand illustration" moment, so any screen that uses it stays in
// sync with the others instead of drifting into its own one-off version.
// Fixed hex values, not theme tokens: this mirrors the actual icon file,
// which is a single static asset that never changes color between light
// and dark — --foreground/--secondary would flip on it in a way the real
// icon never does.
//
// Deliberately a fixed size, not flex-1 the way this used to grow to fill
// leftover space itself: a flex item with flex-basis 0% (Tailwind's
// flex-1) turned out not to shrink back down toward its min-height under
// real overflow the way that reasoning assumed — it just rendered at
// whatever the browser computed, past the viewport, pushing content below
// the fold. A plain zero-basis spacer div in each caller (no min-height
// of its own to get stuck above) is what reliably shrinks to nothing when
// space is tight; this component just renders at its natural size next to
// one of those.
//
// Each card also gets a border-border outline — the leftmost card's fixed
// #2b2d42 is the exact same value as --background in dark mode, so
// without one it just disappeared into the page there (only the shadow
// gave it away). border-border already flips between a near-white and a
// muted violet-navy per theme, which happens to read against all three
// fixed card colors in both themes, so one outline treatment covers it
// rather than a dark-mode-specific fix on the left card alone.
export function CardFanHero() {
  return (
    <div aria-hidden className="flex items-center justify-center py-2">
      <div className="flex items-center">
        <div className="-mr-3 h-[84px] w-[64px] rotate-[-16deg] rounded-2xl border border-border bg-[#2b2d42] shadow-[0_12px_24px_-8px_rgba(43,45,66,0.25)]" />
        <div className="z-10 h-[84px] w-[64px] rounded-2xl border border-border bg-primary shadow-[0_16px_32px_-8px_rgba(255,90,62,0.35)]" />
        <div className="-ml-3 h-[84px] w-[64px] rotate-[16deg] rounded-2xl border border-border bg-[#8d99ae] shadow-[0_12px_24px_-8px_rgba(43,45,66,0.2)]" />
      </div>
    </div>
  );
}
