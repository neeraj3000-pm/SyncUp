// The fanned three-card mark from the app icon, scaled up — the one
// shared "brand illustration" moment, so any screen that uses it stays in
// sync with the others instead of drifting into its own one-off version.
// Fixed hex values, not theme tokens: this mirrors the actual icon file,
// which is a single static asset that never changes color between light
// and dark — --foreground/--secondary would flip on it in a way the real
// icon never does. `flex-1` on the wrapper: it's meant to fill whatever
// leftover vertical space its parent gives it, not the layout containers
// used to build the effect — those stay part of it, in the page, the
// pattern set on landing.
export function CardFanHero() {
  return (
    <div aria-hidden className="relative flex min-h-[120px] flex-1 items-center justify-center">
      <div className="flex items-center">
        <div className="-mr-4 h-[98px] w-[76px] rotate-[-16deg] rounded-2xl bg-[#2b2d42] shadow-[0_12px_24px_-8px_rgba(43,45,66,0.25)]" />
        <div className="z-10 h-[98px] w-[76px] rounded-2xl bg-primary shadow-[0_16px_32px_-8px_rgba(255,90,62,0.35)]" />
        <div className="-ml-4 h-[98px] w-[76px] rotate-[16deg] rounded-2xl bg-[#8d99ae] shadow-[0_12px_24px_-8px_rgba(43,45,66,0.2)]" />
      </div>
    </div>
  );
}
