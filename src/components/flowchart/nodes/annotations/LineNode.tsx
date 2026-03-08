/**
 * Line Annotation Node
 * A resizable horizontal line for visual separation
 */

import { memo, useState, useCallback } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import type { AnnotationNodeData } from '../../../../types';

function LineNode({ data, selected }: NodeProps) {
  const nodeData = (data as AnnotationNodeData) || {};
  const {
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
        minWidth={30}
        minHeight={2}
        isVisible={selected && !locked}
        lineClassName="!bg-blue-400"
        handleClassName="!w-3 !h-3 !bg-white !border-2 !border-blue-400 !rounded-sm"
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
      />
      <div
        className={`
          w-full h-full flex items-center justify-center
          ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
          ${locked ? 'opacity-70' : ''}
          ${isResizing ? 'pointer-events-none' : ''}
          transition-opacity duration-150
        `}
      >
        {!hideBorder && (
          <div
            className="w-full rounded-full"
            style={{
              backgroundColor: strokeColor,
              height: strokeWidth,
            }}
          />
        )}
      </div>
    </>
  );
}

export default memo(LineNode);
