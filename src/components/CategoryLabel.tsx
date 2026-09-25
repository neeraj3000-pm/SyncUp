import type { SessionCategory } from "@/services/sessions";
import { EatIcon, WatchIcon } from "@/components/icons/CategoryIcons";

// The single source for "what does this category say/look like," so
// SessionRoom's waiting room and JoinSessionView (previously two separate
// copies of the same emoji-suffixed string) can't drift from each other,
// or from the create page's own icons.
const LABEL: Record<SessionCategory, string> = {
  WATCH: "what to watch",
  EAT: "where to eat",
};

const ICON: Record<SessionCategory, typeof WatchIcon> = {
  WATCH: WatchIcon,
  EAT: EatIcon,
};

export function CategoryLabel({ category }: { category: string }) {
  const isKnown = category === "WATCH" || category === "EAT";
  if (!isKnown) return <>{category}</>;

  const Icon = ICON[category];
  // inline-block + align-middle on the icon itself, not an inline-flex
  // wrapper around both — inline-flex has no real baseline of its own, so
  // browsers fall back to aligning its margin-box bottom edge against the
  // surrounding sentence's text baseline, which is what was floating the
  // icon above and to the side of the word before it (worse on Android
  // Chrome than in the earlier desktop-browser testing here). This is the
  // standard, predictable pattern for "icon next to inline text" instead.
  return (
    <span className="whitespace-nowrap">
      {LABEL[category]}
      <Icon className="ml-1 inline-block h-4 w-4 align-middle" />
    </span>
  );
}
