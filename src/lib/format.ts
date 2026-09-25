// Joins the non-empty parts of a metadata line with " · ".
export function joinParts(parts: (string | null | undefined | false)[]): string {
  return parts.filter(Boolean).join(" · ");
}
