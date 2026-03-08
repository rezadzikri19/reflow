/**
 * ControlPointHandle - Draggable handle for edge control points
 * Allows users to drag control points to customize edge paths
 */

import { memo, useCallback, useState, useRef } from 'react';
import type { EdgeControlPoint } from '../../../types';

// ============================================================================
// Types
// ============================================================================

interface ControlPointHandleProps {
  /** The control point data */
  point: EdgeControlPoint;
  /** Callback when control point is dragged */
  onDrag: (pointId: string, x: number, y: number) => void;
  /** Callback when drag ends (for saving) */
  onDragEnd: () => void;
  /** Callback to remove this control point */
  onRemove: (pointId: string) => void;
  /** Whether this is the first render (for animations) */
  isNew?: boolean;
}

// ============================================================================
// Delete Button Component
// ============================================================================

interface DeleteButtonProps {
  onClick: () => void;
}

function DeleteButton({ onClick }: DeleteButtonProps) {
  return (
    <g
      className="control-point-delete-btn"
      transform="translate(12, -12)"
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
    >
      {/* Red circular background */}
      <circle
        r={8}
        fill="#EF4444"
        stroke="white"
        strokeWidth={1.5}
      />
      {/* X icon */}
      <path
        d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
}

// ============================================================================
// Component
// ============================================================================

function ControlPointHandleComponent({
  point,
  onDrag,
  onDragEnd,
  onRemove,
  isNew = false,
}: ControlPointHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; pointX: number; pointY: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointX: point.x,
      pointY: point.y,
    };
    setIsDragging(true);
  }, [point.x, point.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStartRef.current || !isDragging) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Calculate new position
    const newX = dragStartRef.current.pointX + dx;
    const newY = dragStartRef.current.pointY + dy;

    onDrag(point.id, newX, newY);
  }, [isDragging, point.id, onDrag]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    const target = e.target as HTMLElement;
    target.releasePointerCapture(e.pointerId);

    dragStartRef.current = null;
    setIsDragging(false);
    onDragEnd();
  }, [isDragging, onDragEnd]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(point.id);
  }, [point.id, onRemove]);

  const handleDelete = useCallback(() => {
    onRemove(point.id);
  }, [point.id, onRemove]);

  return (
    <g
      className="control-point-handle"
      transform={`translate(${point.x}, ${point.y})`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Outer glow for visibility */}
      <circle
        r={12}
        fill="transparent"
        stroke="#3B82F6"
        strokeWidth={2}
        strokeOpacity={0.3}
        className={isNew ? 'animate-ping' : ''}
        style={{ pointerEvents: 'none' }}
      />
      {/* Main handle - matches NodeResizer style */}
      <rect
        x={-6}
        y={-6}
        width={12}
        height={12}
        rx={2}
        fill="white"
        stroke="#3B82F6"
        strokeWidth={2}
        className="nodrag nopan"
        style={{
          pointerEvents: 'all',
          cursor: isDragging ? 'grabbing' : 'grab',
          transform: isDragging ? 'scale(1.1)' : 'scale(1)',
          transformOrigin: 'center',
          transition: isDragging ? 'none' : 'transform 0.15s ease',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={handleContextMenu}
      />
      {/* Delete button - always visible when control point is shown */}
      {!isDragging && (
        <DeleteButton onClick={handleDelete} />
      )}
    </g>
  );
}

export default memo(ControlPointHandleComponent);
