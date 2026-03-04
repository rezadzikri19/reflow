import { useMemo } from 'react';
import { useNodes } from '../stores/flowchartStore';
import { getTagColorByIndex, assignUniqueTagColors, type TagColor } from '../utils/tagColors';

const ROLE_COLOR_COUNT = 17;

/**
 * Hook to manage unique role colors across all nodes in the flowchart
 * Ensures that each role gets a unique color within the flowchart
 */
export function useRoleColors() {
  const nodes = useNodes();

  // Get all unique roles from all nodes and assign colors
  const roleColorMap = useMemo(() => {
    const allRoles = new Set<string>();

    // Collect all roles from all nodes
    for (const node of nodes) {
      const role = node.data?.role as string | undefined;
      if (role) {
        allRoles.add(role);
      }
    }

    // Assign unique colors to each role
    return assignUniqueTagColors(Array.from(allRoles));
  }, [nodes]);

  /**
   * Get the color for a specific role
   */
  const getRoleColor = (roleName: string): TagColor => {
    const index = roleColorMap.get(roleName);
    if (index !== undefined) {
      return getTagColorByIndex(index);
    }
    // Fallback: assign a color based on role name hash for new roles not yet in map
    return getTagColorByIndex(hashString(roleName) % ROLE_COLOR_COUNT);
  };

  /**
   * Get all unique roles in the flowchart with their colors
   */
  const getAllRoles = (): { role: string; color: TagColor }[] => {
    return Array.from(roleColorMap.entries())
      .sort((a, b) => a[1] - b[1]) // Sort by color index for consistent ordering
      .map(([role, index]) => ({
        role,
        color: getTagColorByIndex(index),
      }));
  };

  return {
    getRoleColor,
    getAllRoles,
    roleCount: roleColorMap.size,
  };
}

/**
 * Simple hash function for fallback color assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
