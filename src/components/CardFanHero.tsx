// The app icon's fanned cards, scaled up. Fixed colours (they mirror the
// icon, which doesn't change with the theme) and a fixed size (callers add
// a spacer to absorb extra height). The border keeps the dark card visible
// on the dark background.
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
