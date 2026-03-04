/**
 * Handle Utilities for Hybrid/Dynamic Ports
 *
 * This module provides utilities for determining port direction and styling
 * for hybrid handles that can act as either input or output based on connections.
 */

import type { FlowchartEdge } from '../types/index';

/**
 * Port direction determined by connected edges
 */
export type PortDirection = 'input' | 'output' | 'neutral';

/**
 * Node types that use fixed handles (not hybrid)
 */
const FIXED_HANDLE_NODE_TYPES = new Set(['start', 'end', 'decision']);

/**
 * Check if a node type should use fixed handles instead of hybrid
 */
export function shouldUseFixedHandles(nodeType: string): boolean {
  return FIXED_HANDLE_NODE_TYPES.has(nodeType);
}

/**
 * Determine the direction of a port based on connected edges
 *
 * @param nodeId - The node ID
 * @param handleId - The handle ID (or null for default handle)
 * @param edges - All edges in the flowchart
 * @returns The determined port direction
 */
export function getPortDirection(
  nodeId: string,
  handleId: string | null | undefined,
  edges: FlowchartEdge[]
): PortDirection {
  const normalizedHandleId = handleId || null;

  // Check if this handle is a source (has outgoing edges)
  const isSource = edges.some(
    (edge) => edge.source === nodeId && (edge.sourceHandle || null) === normalizedHandleId
  );

  // Check if this handle is a target (has incoming edges)
  const isTarget = edges.some(
    (edge) => edge.target === nodeId && (edge.targetHandle || null) === normalizedHandleId
  );

  if (isSource && !isTarget) {
    return 'output';
  } else if (isTarget && !isSource) {
    return 'input';
  } else if (isSource && isTarget) {
    // Handle is both source and target - this is a bidirectional case
    // Default to output as it's more common in flowcharts
    return 'output';
  }

  return 'neutral';
}

/**
 * Tailwind CSS classes for handle colors based on direction
 */
interface HandleColorClasses {
  background: string;
  border: string;
  hover: string;
}

/**
 * Get Tailwind CSS classes for handle styling based on direction
 *
 * @param direction - The port direction
 * @param nodeColor - The node's primary color (used for neutral state)
 * @returns Object with Tailwind classes for background, border, and hover states
 */
export function getHandleColorClasses(
  direction: PortDirection,
  nodeColor: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray' | 'orange' = 'blue'
): HandleColorClasses {
  // Color mapping for neutral state (matches node color)
  const neutralColors: Record<string, HandleColorClasses> = {
    blue: {
      background: '!bg-blue-300',
      border: '!border-blue-700',
      hover: 'hover:!bg-blue-200',
    },
    green: {
      background: '!bg-green-300',
      border: '!border-green-700',
      hover: 'hover:!bg-green-200',
    },
    yellow: {
      background: '!bg-yellow-300',
      border: '!border-yellow-700',
      hover: 'hover:!bg-yellow-200',
    },
    red: {
      background: '!bg-red-300',
      border: '!border-red-700',
      hover: 'hover:!bg-red-200',
    },
    purple: {
      background: '!bg-purple-300',
      border: '!border-purple-700',
      hover: 'hover:!bg-purple-200',
    },
    gray: {
      background: '!bg-gray-300',
      border: '!border-gray-700',
      hover: 'hover:!bg-gray-200',
    },
    orange: {
      background: '!bg-orange-300',
      border: '!border-orange-700',
      hover: 'hover:!bg-orange-200',
    },
  };

  switch (direction) {
    case 'input':
      return {
        background: '!bg-green-400',
        border: '!border-green-600',
        hover: 'hover:!bg-green-300',
      };
    case 'output':
      return {
        background: '!bg-blue-400',
        border: '!border-blue-600',
        hover: 'hover:!bg-blue-300',
      };
    case 'neutral':
    default:
      return neutralColors[nodeColor] || neutralColors.blue;
  }
}

/**
 * Build the complete className string for a handle
 *
 * @param direction - The port direction
 * @param nodeColor - The node's primary color
 * @param baseClasses - Additional base classes to include
 * @returns Complete className string
 */
export function buildHandleClassName(
  direction: PortDirection,
  nodeColor: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray' | 'orange' = 'blue',
  baseClasses: string = '!w-3 !h-3 !border-2'
): string {
  const colors = getHandleColorClasses(direction, nodeColor);
  return `${baseClasses} ${colors.background} ${colors.border} ${colors.hover}`.trim();
}

/**
 * Get all handle IDs that are connected for a given node
 *
 * @param nodeId - The node ID
 * @param edges - All edges in the flowchart
 * @returns Set of connected handle IDs
 */
export function getConnectedHandleIds(
  nodeId: string,
  edges: FlowchartEdge[]
): Set<string | null> {
  const connectedHandles = new Set<string | null>();

  edges.forEach((edge) => {
    if (edge.source === nodeId) {
      connectedHandles.add(edge.sourceHandle || null);
    }
    if (edge.target === nodeId) {
      connectedHandles.add(edge.targetHandle || null);
    }
  });

  return connectedHandles;
}
