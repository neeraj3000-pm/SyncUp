// The fanned three-card mark from the app icon, scaled up — the one
// shared "brand illustration" moment, so any screen that uses it stays in
// sync with the others instead of drifting into its own one-off version.
// Fixed hex values, not theme tokens: this mirrors the actual icon file,
// which is a single static asset that never changes color between light
// and dark — --foreground/--secondary would flip on it in a way the real
// icon never does.
//
// Deliberately a fixed size: a flex-1 illustration doesn't reliably shrink
// under overflow and pushed content below the fold on short screens.
// Callers put a plain zero-basis spacer next to it to absorb extra space.
//
// The border-border outline keeps the leftmost card (#2b2d42, identical to
// the dark-mode background) visible in dark mode.
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
