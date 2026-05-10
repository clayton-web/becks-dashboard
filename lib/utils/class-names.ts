/**
 * Zero-dependency class name joiner. Replace with `clsx` + `tailwind-merge` later if needed.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
