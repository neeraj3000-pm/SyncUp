// Shared class strings for the app's two button styles, usable on <button>,
// <Link> and <a> alike. Plain strings (not @apply) so Tailwind's scanner
// still sees every class.
export const buttonPrimary =
  "rounded-pill bg-primary px-8 py-4 text-center text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97] disabled:bg-border disabled:text-foreground-muted disabled:shadow-none";

export const buttonSecondary =
  "rounded-pill border border-border px-8 py-4 text-center text-lg font-semibold shadow-card transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97] disabled:opacity-50";
