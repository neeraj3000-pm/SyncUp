import type { SessionCategory } from "@/services/sessions";
import { EatIcon, WatchIcon } from "@/components/icons/CategoryIcons";

// The single source for how a category reads inline in a sentence.
const LABEL: Record<SessionCategory, string> = {
  WATCH: "what to watch",
  EAT: "where to eat",
};

const ICON: Record<SessionCategory, typeof WatchIcon> = {
  WATCH: WatchIcon,
  EAT: EatIcon,
};

export function CategoryLabel({ category }: { category: SessionCategory }) {
  const Icon = ICON[category];
  // inline-block + align-middle on the icon itself, not an inline-flex
  // wrapper: inline-flex has no baseline of its own, so browsers misalign
  // it against the surrounding sentence (most visibly on Android Chrome).
  return (
    <span className="whitespace-nowrap">
      {LABEL[category]}
      <Icon className="ml-1 inline-block h-4 w-4 align-middle" />
    </span>
  );
}
