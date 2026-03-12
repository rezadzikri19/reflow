/**
 * Utility functions for node color customization
 */

import type { ProcessNodeType } from '../types';

// Map of preset colors to their closest HybridHandle nodeColor
export const PRESET_COLOR_MAP: Record<string, string> = {
  '#3b82f6': 'blue',   // blue
  '#10b981': 'green',  // emerald
  '#f59e0b': 'yellow', // amber
  '#ef4444': 'red',    // red
  '#8b5cf6': 'purple', // purple
  '#ec4899': 'red',    // pink (closest is red)
  '#f97316': 'orange', // orange
  '#14b8a6': 'green',  // teal (closest is green)
  '#06b6d4': 'blue',   // cyan (closest is blue)
  '#6366f1': 'purple', // indigo
  '#f43f5e': 'red',    // rose
  '#7c3aed': 'purple', // violet
  '#0ea5e9': 'blue',   // sky
  '#84cc16': 'green',  // lime (closest is green)
  '#64748b': 'gray',   // slate
  '#6b7280': 'gray',   // gray
};

// Default handle colors for each node type
export const NODE_TYPE_HANDLE_COLORS: Record<ProcessNodeType, string> = {
  start: 'green',
  end: 'red',
  process: 'blue',
  manualProcess: 'orange',
  decision: 'yellow',
  subprocess: 'purple',
  boundaryPort: 'green',
  junction: 'purple',
  reference: 'blue',
  connector: 'green',
  terminator: 'red',
};

/**
 * Get the closest nodeColor for HybridHandle based on hex color
 * @param color - Custom hex color
 * @param nodeType - Node type for default handle color fallback
 */
export function getNodeColorForHandle(color?: string, nodeType?: ProcessNodeType): string {
  if (!color) {
    // Return default handle color based on node type, or blue as fallback
    return nodeType ? NODE_TYPE_HANDLE_COLORS[nodeType] : 'blue';
  }
  return PRESET_COLOR_MAP[color.toLowerCase()] || 'blue';
}

/**
 * Default color palettes for each node type
 * badgeBg and badgeText are for the label badge below the node (light bg with dark text for most nodes)
 * badgeDarkBg and badgeDarkText are for inline badges (dark bg with white text, like ProcessNode)
 */
const DEFAULT_NODE_COLORS: Record<string, { bg: string; border: string; textLight: string; badgeBg: string; badgeText: string; badgeDarkBg: string; ring: string }> = {
  process: { bg: 'bg-blue-500', border: 'border-blue-700', textLight: 'text-blue-100', badgeBg: 'bg-blue-100', badgeText: 'text-blue-800', badgeDarkBg: 'bg-blue-700', ring: 'ring-blue-400' },
  decision: { bg: 'bg-amber-500', border: 'border-amber-700', textLight: 'text-amber-100', badgeBg: 'bg-amber-100', badgeText: 'text-amber-800', badgeDarkBg: 'bg-amber-700', ring: 'ring-amber-400' },
  subprocess: { bg: 'bg-purple-500', border: 'border-purple-700', textLight: 'text-purple-100', badgeBg: 'bg-purple-100', badgeText: 'text-purple-800', badgeDarkBg: 'bg-purple-700', ring: 'ring-purple-400' },
  start: { bg: 'bg-emerald-500', border: 'border-emerald-700', textLight: 'text-emerald-100', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-800', badgeDarkBg: 'bg-emerald-700', ring: 'ring-emerald-400' },
  end: { bg: 'bg-red-500', border: 'border-red-700', textLight: 'text-red-100', badgeBg: 'bg-red-100', badgeText: 'text-red-800', badgeDarkBg: 'bg-red-700', ring: 'ring-red-400' },
  manualProcess: { bg: 'bg-orange-500', border: 'border-orange-700', textLight: 'text-orange-100', badgeBg: 'bg-orange-100', badgeText: 'text-orange-800', badgeDarkBg: 'bg-orange-700', ring: 'ring-orange-400' },
  terminator: { bg: 'bg-rose-500', border: 'border-rose-700', textLight: 'text-rose-100', badgeBg: 'bg-rose-100', badgeText: 'text-rose-800', badgeDarkBg: 'bg-rose-700', ring: 'ring-rose-400' },
  junction: { bg: 'bg-violet-500', border: 'border-violet-700', textLight: 'text-violet-100', badgeBg: 'bg-violet-100', badgeText: 'text-violet-800', badgeDarkBg: 'bg-violet-700', ring: 'ring-violet-400' },
  connector: { bg: 'bg-teal-500', border: 'border-teal-700', textLight: 'text-teal-100', badgeBg: 'bg-teal-100', badgeText: 'text-teal-800', badgeDarkBg: 'bg-teal-700', ring: 'ring-teal-400' },
  reference: { bg: 'bg-sky-500', border: 'border-sky-700', textLight: 'text-sky-100', badgeBg: 'bg-sky-100', badgeText: 'text-sky-800', badgeDarkBg: 'bg-sky-700', ring: 'ring-sky-400' },
};

/**
 * Get color shades for node styling
 * All text/icons are always white for readability
 * @param color - Custom hex color
 * @param nodeType - Node type for default color fallback
 */
export function getNodeColorStyles(color?: string, nodeType?: ProcessNodeType) {
  if (!color) {
    const defaults = nodeType ? DEFAULT_NODE_COLORS[nodeType] : DEFAULT_NODE_COLORS.process;
    return {
      bg: defaults.bg,
      bgHover: defaults.bg.replace('500', '600'),
      border: defaults.border,
      borderLight: defaults.border.replace('700', '400'),
      text: 'text-white',
      textLight: 'text-white',
      textDark: 'text-white',
      // For badges below nodes (light background, dark text)
      badgeBg: defaults.badgeBg,
      badgeText: defaults.badgeText,
      // For inline badges (dark background, white text like ProcessNode)
      badge: defaults.badgeDarkBg,
      badgeTextAlt: 'text-white',
      ring: defaults.ring,
      bgLight: defaults.bg,
      // Handle colors for non-HybridHandle nodes (like StartNode, EndNode)
      handleBgLight: nodeType === 'start' ? '#a7f3d0' : nodeType === 'end' ? '#fecaca' : nodeType === 'terminator' ? '#ffe4e6' : nodeType === 'junction' ? '#ddd6fe' : nodeType === 'connector' ? '#99f6e4' : nodeType === 'reference' ? '#bae6fd' : '#bfdbfe',
      handleBorder: nodeType === 'start' ? '#047857' : nodeType === 'end' ? '#b91c1c' : nodeType === 'terminator' ? '#be123c' : nodeType === 'junction' ? '#6d28d9' : nodeType === 'connector' ? '#0f766e' : nodeType === 'reference' ? '#0369a1' : '#1d4ed8',
    };
  }

  // For custom colors, use inline styles - all text/icons are white
  return {
    bg: '',
    bgHover: '',
    border: '',
    borderLight: '',
    text: 'text-white',
    textLight: 'text-white',
    textDark: 'text-white',
    badgeBg: '',
    badgeText: '',
    badge: '',
    badgeTextAlt: 'text-white',
    ring: '',
    bgLight: '',
    customBg: color,
    customBorder: adjustColorBrightness(color, -35),
    customText: '#ffffff',
    customTextLight: '#ffffff',
    customBadge: adjustColorBrightness(color, -30),
    customBadgeText: '#ffffff',
    customRing: adjustColorBrightness(color, 20),
  };
}

/**
 * Adjust color brightness
 * @param color - Hex color
 * @param amount - Amount to adjust (-100 to 100)
 */
function adjustColorBrightness(color: string, amount: number): string {
  // Remove # if present
  let hex = color.replace('#', '');

  // Parse RGB values
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Adjust brightness
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
