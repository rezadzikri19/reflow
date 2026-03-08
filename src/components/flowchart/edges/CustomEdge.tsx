import { memo, useCallback } from 'react';
import {
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getSimpleBezierPath,
  type EdgeProps,
  Position,
  useReactFlow,
} from '@xyflow/react';
import { useFlowchartStore } from '../../../stores/flowchartStore';
import { getPathThroughControlPoints, getPathMidpoint } from '../../../utils/edgePathUtils';
import ControlPointHandle from './ControlPointHandle';
import type { EdgeControlPoint } from '../../../types';

/**
 * CustomEdge - Edge component with visual selection feedback
 * Supports multiple edge types: smoothstep, bezier, straight, simplebezier
 * Supports labels, custom styles, and control points for custom routing
 * Automatically styles Yes/No labels from decision nodes
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
  interactionWidth,
  label,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  labelStyle,
  data,
}: EdgeProps) {
  const { screenToFlowPosition } = useReactFlow();
  const addControlPoint = useFlowchartStore((state) => state.addControlPoint);
  const updateControlPoint = useFlowchartStore((state) => state.updateControlPoint);
  const removeControlPoint = useFlowchartStore((state) => state.removeControlPoint);

  // Get control points from edge data
  const controlPoints = (data as { controlPoints?: EdgeControlPoint[] })?.controlPoints;

  // Check if we have control points - if so, use custom path
  const hasControlPoints = controlPoints && controlPoints.length > 0;

  // Get the appropriate path based on edge type and control points
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (hasControlPoints) {
    // Use custom path through control points
    edgePath = getPathThroughControlPoints(
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY },
      controlPoints,
      type as 'smoothstep' | 'bezier' | 'straight' | 'simplebezier'
    );
    const midpoint = getPathMidpoint(
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY },
      controlPoints
    );
    labelX = midpoint.x;
    labelY = midpoint.y;
  } else {
    // Use standard React Flow path generators
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
        [edgePath, labelX, labelY] = getBezierPath(pathParams);
        break;
      case 'straight':
        [edgePath, labelX, labelY] = getStraightPath(pathParams);
        break;
      case 'simplebezier':
        [edgePath, labelX, labelY] = getSimpleBezierPath(pathParams);
        break;
      case 'smoothstep':
      default:
        [edgePath, labelX, labelY] = getSmoothStepPath(pathParams);
        break;
    }
  }

  // Handle double-click to add control point
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    // Convert screen position to flow position
    const flowPosition = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });

    // Add control point at clicked position
    addControlPoint(id, { x: flowPosition.x, y: flowPosition.y });
  }, [id, screenToFlowPosition, addControlPoint]);

  // Handle control point drag
  const handleControlPointDrag = useCallback((pointId: string, x: number, y: number) => {
    updateControlPoint(id, pointId, { x, y });
  }, [id, updateControlPoint]);

  // Handle drag end (triggers save)
  const handleControlPointDragEnd = useCallback(() => {
    // Mark dirty for auto-save - the store already does this in updateControlPoint
  }, []);

  // Handle control point removal
  const handleControlPointRemove = useCallback((pointId: string) => {
    removeControlPoint(id, pointId);
  }, [id, removeControlPoint]);

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
        interactionWidth={interactionWidth}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? '#3B82F6' : style.stroke || '#6B7280',
        }}
      />
      {/* Invisible wider path for double-click detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="nodrag nopan"
        style={{ cursor: 'pointer' }}
        onDoubleClick={handleDoubleClick}
      />
      {/* Control point handles - only visible when selected */}
      {selected && controlPoints?.map((point) => (
        <ControlPointHandle
          key={point.id}
          point={point}
          onDrag={handleControlPointDrag}
          onDragEnd={handleControlPointDragEnd}
          onRemove={handleControlPointRemove}
        />
      ))}
      {/* Edge label */}
      {label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-((labelBgPadding?.[0] ?? 8) + (typeof label === 'string' ? label.length * 3 : 30))}
            y={-(labelBgPadding?.[1] ?? 10)}
            width={(labelBgPadding?.[0] ?? 8) * 2 + (typeof label === 'string' ? label.length * 6 : 60)}
            height={(labelBgPadding?.[1] ?? 10) * 2}
            fill={labelBgStyle?.fill || (label === 'Yes' ? '#dcfce7' : label === 'No' ? '#fee2e2' : '#ffffff')}
            stroke={labelBgStyle?.stroke || (label === 'Yes' ? '#86efac' : label === 'No' ? '#fca5a5' : '#e5e7eb')}
            strokeWidth={1}
            rx={labelBgBorderRadius ?? 4}
            ry={labelBgBorderRadius ?? 4}
            className="pointer-events-none"
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 'bold',
              fill: label === 'Yes' ? '#166534' : label === 'No' ? '#991b1b' : '#374151',
              ...labelStyle,
            }}
            className="pointer-events-none"
          >
            {label}
          </text>
        </g>
      )}
    </>
  );
}

export default memo(CustomEdge);
