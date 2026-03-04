/**
 * HybridHandle Component
 *
 * A hybrid handle that can act as either source or target based on connections.
 * Uses React Flow's dual-handle technique: renders both a source and target handle
 * at the same position. The direction is determined by how connections are made.
 *
 * Visual indicators:
 * - Neutral (unconnected): Gray or node-colored
 * - Input (receiving connections): Green
 * - Output (sending connections): Blue
 */

import { memo, useMemo } from 'react';
import { Handle, Position, useEdges } from '@xyflow/react';
import type { FlowchartEdge } from '../../../types/index';
import {
  type PortDirection,
  getPortDirection,
  buildHandleClassName,
} from '../../../utils/handleUtils';

export interface HybridHandleProps {
  /** The position of the handle (Left, Right, Top, Bottom) */
  position: Position;
  /** Unique identifier for this handle (optional for default handle) */
  id?: string;
  /** The node's primary color for neutral state */
  nodeColor?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray' | 'orange';
  /** The node ID (required for edge lookup) */
  nodeId: string;
  /** Optional z-index for the handle */
  zIndex?: number;
  /** Optional custom style */
  style?: React.CSSProperties;
  /** Whether to force a specific type (for edge cases) */
  forceType?: 'source' | 'target';
  /** Optional additional className */
  className?: string;
}

/**
 * HybridHandle renders both source and target handles at the same position.
 * The visual appearance changes based on connected edges:
 * - Unconnected: Shows neutral color
 * - Has incoming connections: Shows input color (green)
 * - Has outgoing connections: Shows output color (blue)
 */
function HybridHandle({
  position,
  id,
  nodeColor = 'blue',
  nodeId,
  zIndex,
  style,
  forceType,
  className = '',
}: HybridHandleProps) {
  // Get edges from React Flow
  const edges = useEdges() as FlowchartEdge[];

  // Determine the port direction based on connected edges
  const direction: PortDirection = useMemo(() => {
    return getPortDirection(nodeId, id || null, edges);
  }, [nodeId, id, edges]);

  // Build the className for the handle
  const handleClassName = useMemo(() => {
    const baseClasses = buildHandleClassName(direction, nodeColor);
    return `${baseClasses} ${className}`.trim();
  }, [direction, nodeColor, className]);

  // Common handle props
  const commonProps = {
    position,
    id: id || undefined,
    className: handleClassName,
    style: {
      ...style,
      ...(zIndex !== undefined ? { zIndex } : {}),
    },
  };

  // If forcing a specific type, only render that handle
  if (forceType === 'source') {
    return <Handle type="source" {...commonProps} />;
  }
  if (forceType === 'target') {
    return <Handle type="target" {...commonProps} />;
  }

  // Render both handles at the same position
  // React Flow will use the appropriate one based on the connection direction
  return (
    <>
      {/* Target handle - receives incoming connections */}
      <Handle type="target" {...commonProps} />
      {/* Source handle - sends outgoing connections */}
      <Handle type="source" {...commonProps} />
    </>
  );
}

export default memo(HybridHandle);
