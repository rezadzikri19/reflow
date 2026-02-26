// ============================================================================
// Tag Color Utilities
// ============================================================================

/**
 * Predefined color palette for tags
 * Each color has bg (background), text, hover, solid, and border variants
 * Ordered to maximize visual distinction between adjacent colors
 */
export const TAG_COLORS = [
  { bg: 'bg-red-100', text: 'text-red-800', hover: 'hover:bg-red-200', solid: 'bg-red-500', border: 'border-red-500' },
  { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200', solid: 'bg-blue-500', border: 'border-blue-500' },
  { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:bg-green-200', solid: 'bg-green-500', border: 'border-green-500' },
  { bg: 'bg-purple-100', text: 'text-purple-800', hover: 'hover:bg-purple-200', solid: 'bg-purple-500', border: 'border-purple-500' },
  { bg: 'bg-orange-100', text: 'text-orange-800', hover: 'hover:bg-orange-200', solid: 'bg-orange-500', border: 'border-orange-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', hover: 'hover:bg-cyan-200', solid: 'bg-cyan-500', border: 'border-cyan-500' },
  { bg: 'bg-pink-100', text: 'text-pink-800', hover: 'hover:bg-pink-200', solid: 'bg-pink-500', border: 'border-pink-500' },
  { bg: 'bg-teal-100', text: 'text-teal-800', hover: 'hover:bg-teal-200', solid: 'bg-teal-500', border: 'border-teal-500' },
  { bg: 'bg-amber-100', text: 'text-amber-800', hover: 'hover:bg-amber-200', solid: 'bg-amber-500', border: 'border-amber-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', hover: 'hover:bg-indigo-200', solid: 'bg-indigo-500', border: 'border-indigo-500' },
  { bg: 'bg-lime-100', text: 'text-lime-800', hover: 'hover:bg-lime-200', solid: 'bg-lime-500', border: 'border-lime-500' },
  { bg: 'bg-rose-100', text: 'text-rose-800', hover: 'hover:bg-rose-200', solid: 'bg-rose-500', border: 'border-rose-500' },
  { bg: 'bg-sky-100', text: 'text-sky-800', hover: 'hover:bg-sky-200', solid: 'bg-sky-500', border: 'border-sky-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', hover: 'hover:bg-emerald-200', solid: 'bg-emerald-500', border: 'border-emerald-500' },
  { bg: 'bg-violet-100', text: 'text-violet-800', hover: 'hover:bg-violet-200', solid: 'bg-violet-500', border: 'border-violet-500' },
  { bg: 'bg-yellow-100', text: 'text-yellow-800', hover: 'hover:bg-yellow-200', solid: 'bg-yellow-500', border: 'border-yellow-500' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', hover: 'hover:bg-fuchsia-200', solid: 'bg-fuchsia-500', border: 'border-fuchsia-500' },
] as const;

export type TagColor = typeof TAG_COLORS[number];

/**
 * Gets a color by its index in the palette
 */
export function getTagColorByIndex(index: number): TagColor {
  return TAG_COLORS[index % TAG_COLORS.length];
}

/**
 * Assigns unique color indices to a set of tags
 * Returns a map of tag name to color index
 */
export function assignUniqueTagColors(tags: string[]): Map<string, number> {
  const colorMap = new Map<string, number>();
  let colorIndex = 0;

  // Sort tags to ensure consistent ordering
  const sortedTags = [...tags].sort();

  for (const tag of sortedTags) {
    if (!colorMap.has(tag)) {
      colorMap.set(tag, colorIndex);
      colorIndex = (colorIndex + 1) % TAG_COLORS.length;
    }
  }

  return colorMap;
}
