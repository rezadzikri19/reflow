import { memo, useState, useRef, useCallback } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import type { BaseNodeData } from '../../../types/index';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';
import InlineLabelEditor from './InlineLabelEditor';

/**
 * JunctionNode - Violet circular node that acts as a many-to-one connection hub
 * Multiple nodes can connect TO it, and it connects TO one other node.
 */
function JunctionNode({ id, data, selected }: NodeProps) {
  const { label = 'Junction', locked } = (data as BaseNodeData) || {};
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMuted = useIsNodeMuted(id);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!locked) {
      setIsEditing(true);
    }
  }, [locked]);

  return (
    <div className={`relative transition-opacity duration-200 ${isMuted ? 'opacity-30 grayscale' : ''}`}>
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Handles - Hybrid (can be input or output) */}
      <HybridHandle id="top" position={Position.Top} nodeId={id} nodeColor="purple" />
      <HybridHandle id="bottom" position={Position.Bottom} nodeId={id} nodeColor="purple" />
      <HybridHandle id="left" position={Position.Left} nodeId={id} nodeColor="purple" />

      <div
        className={`
          flex items-center justify-center
          w-6 h-6 rounded-full
          bg-violet-500 hover:bg-violet-600
          border-2 border-violet-700
          shadow-md hover:shadow-lg
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-violet-400 ring-offset-2' : ''}
          ${locked ? 'border-dashed opacity-80' : ''}
        `}
      >
        <HybridHandle id="right" position={Position.Right} nodeId={id} nodeColor="purple" />
      </div>

      {/* Label below the node */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: '100%', marginTop: '28px' }}
        onDoubleClick={handleDoubleClick}
      >
        <span
          className={`text-sm font-medium text-violet-800 bg-violet-100 px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${locked ? '' : 'cursor-text'}`}
        >
          <InlineLabelEditor
            id={id}
            label={label}
            isEditing={isEditing}
            editText={editText}
            inputRef={inputRef}
            setIsEditing={setIsEditing}
            setEditText={setEditText}
            className="whitespace-nowrap"
          />
        </span>
      </div>
    </div>
  );
}

export default memo(JunctionNode);
