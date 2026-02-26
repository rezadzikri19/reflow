// ============================================================================
// Tag Color Utilities
// ============================================================================

/**
 * Predefined color palette for tags
 * Each color has bg (background), text, and hover variants
 */
export const TAG_COLORS = [
  { bg: 'bg-red-100', text: 'text-red-800', hover: 'hover:bg-red-200', solid: 'bg-red-500' },
  { bg: 'bg-orange-100', text: 'text-orange-800', hover: 'hover:bg-orange-200', solid: 'bg-orange-500' },
  { bg: 'bg-amber-100', text: 'text-amber-800', hover: 'hover:bg-amber-200', solid: 'bg-amber-500' },
  { bg: 'bg-yellow-100', text: 'text-yellow-800', hover: 'hover:bg-yellow-200', solid: 'bg-yellow-500' },
  { bg: 'bg-lime-100', text: 'text-lime-800', hover: 'hover:bg-lime-200', solid: 'bg-lime-500' },
  { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:bg-green-200', solid: 'bg-green-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', hover: 'hover:bg-emerald-200', solid: 'bg-emerald-500' },
  { bg: 'bg-teal-100', text: 'text-teal-800', hover: 'hover:bg-teal-200', solid: 'bg-teal-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', hover: 'hover:bg-cyan-200', solid: 'bg-cyan-500' },
  { bg: 'bg-sky-100', text: 'text-sky-800', hover: 'hover:bg-sky-200', solid: 'bg-sky-500' },
  { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200', solid: 'bg-blue-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', hover: 'hover:bg-indigo-200', solid: 'bg-indigo-500' },
  { bg: 'bg-violet-100', text: 'text-violet-800', hover: 'hover:bg-violet-200', solid: 'bg-violet-500' },
  { bg: 'bg-purple-100', text: 'text-purple-800', hover: 'hover:bg-purple-200', solid: 'bg-purple-500' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', hover: 'hover:bg-fuchsia-200', solid: 'bg-fuchsia-500' },
  { bg: 'bg-pink-100', text: 'text-pink-800', hover: 'hover:bg-pink-200', solid: 'bg-pink-500' },
  { bg: 'bg-rose-100', text: 'text-rose-800', hover: 'hover:bg-rose-200', solid: 'bg-rose-500' },
] as const;

export type TagColor = typeof TAG_COLORS[number];

/**
 * Generates a simple hash from a string
 * Used to consistently pick a color for a given tag
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Gets a consistent color for a tag based on its name
 * The same tag name will always get the same color
 */
export function getTagColor(tagName: string): TagColor {
  const hash = hashString(tagName);
  const index = hash % TAG_COLORS.length;
  return TAG_COLORS[index];
}
