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
 * Supports labels and custom styles
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
}: EdgeProps) {
  // Get the appropriate path based on edge type
  let edgePath: string;
  let labelX: number;
  let labelY: number;

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
