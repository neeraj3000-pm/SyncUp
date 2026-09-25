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
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {LABEL[category]}
      <Icon className="h-4 w-4 flex-shrink-0" />
    </span>
  );
}
