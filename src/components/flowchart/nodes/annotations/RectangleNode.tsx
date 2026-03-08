/**
 * Rectangle Annotation Node
 * A resizable rectangle shape for highlighting and grouping elements
 */

import { memo, useState, useCallback } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import type { AnnotationNodeData } from '../../../../types';

function RectangleNode({ id, data, selected }: NodeProps) {
  const nodeData = (data as AnnotationNodeData) || {};
  const {
    fillColor = 'transparent',
    strokeColor = '#64748b',
    strokeWidth = 2,
    hideBorder = false,
    locked = false,
  } = nodeData;

  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  return (
    <>
      <NodeResizer
        minWidth={50}
        minHeight={30}
        isVisible={selected && !locked}
        lineClassName="!bg-blue-400"
        handleClassName="!w-3 !h-3 !bg-white !border-2 !border-blue-400 !rounded-sm"
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
      />
      <div
        className={`
          w-full h-full
          ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
          ${locked ? 'opacity-70' : ''}
          ${isResizing ? 'pointer-events-none' : ''}
          transition-opacity duration-150
        `}
        style={{
          backgroundColor: fillColor,
          borderColor: hideBorder ? 'transparent' : strokeColor,
          borderWidth: hideBorder ? 0 : strokeWidth,
          borderStyle: 'solid',
          borderRadius: 4,
        }}
      />
    </>
  );
}

export default memo(RectangleNode);
