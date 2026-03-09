import { useMemo } from 'react';
import { useNodes } from '../stores/flowchartStore';
import { getTagColorByIndex, assignUniqueTagColors, getStableColorIndex, type TagColor } from '../utils/tagColors';

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
      const rawRole = node.data?.role;
      // Handle backward compatibility: role could be string or string[]
      const roles: string[] = Array.isArray(rawRole)
        ? rawRole
        : rawRole
          ? [rawRole as string]
          : [];
      if (roles.length > 0) {
        roles.forEach((r) => allRoles.add(r));
      }
    }

    // Assign unique colors to each role
    return assignUniqueTagColors(Array.from(allRoles));
  }, [nodes]);

  /**
   * Get the color for a specific role
   */
  const getRoleColor = (roleName: string): TagColor => {
    // Always use stable hash-based color assignment
    return getTagColorByIndex(getStableColorIndex(roleName));
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
