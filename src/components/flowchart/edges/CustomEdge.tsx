import { memo } from 'react';
import {
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getSimpleBezierPath,
  type EdgeProps,
  Position,
} from '@xyflow/react';

/**
 * CustomEdge - Edge component with visual selection feedback
 * Supports multiple edge types: smoothstep, bezier, straight, simplebezier
 */
function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  type = 'smoothstep',
}: EdgeProps) {
  // Get the appropriate path based on edge type
  let edgePath: string;

  const pathParams = {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: sourcePosition || Position.Right,
    targetPosition: targetPosition || Position.Left,
  };

  switch (type) {
    case 'bezier':
      [edgePath] = getBezierPath(pathParams);
      break;
    case 'straight':
      [edgePath] = getStraightPath(pathParams);
      break;
    case 'simplebezier':
      [edgePath] = getSimpleBezierPath(pathParams);
      break;
    case 'smoothstep':
    default:
      [edgePath] = getSmoothStepPath(pathParams);
      break;
  }

  return (
    <>
      {/* Selection glow/background - wider path behind for selection effect */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={6}
          strokeOpacity={0.3}
          className="animate-pulse"
        />
      )}
      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? '#3B82F6' : style.stroke || '#6B7280',
        }}
      />
    </>
  );
}

export default memo(CustomEdge);
