import { memo, useState, useRef, useCallback } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Route } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import NodeRole from './NodeRole';
import NodeSystems from './NodeSystems';
import FlowOrderBadge from './FlowOrderBadge';
import { useHierarchicalFlowOrder } from '../../../contexts/FlowOrderContext';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';
import InlineLabelEditor from './InlineLabelEditor';

/**
 * DecisionNode - Amber diamond-shaped node for conditional branching
 * Uses hybrid handles allowing flexible connection directions.
 * Branch semantics are defined by editable connection labels, not fixed ports.
 */
function DecisionNode({ id, data, selected }: NodeProps) {
  const { label = 'Decision', tags, role, locked, systems } = (data as BaseNodeData) || {};
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const flowOrder = useHierarchicalFlowOrder(id);
  const isMuted = useIsNodeMuted(id);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!locked) {
      setIsEditing(true);
    }
  }, [locked]);

  // Diamond dimensions
  const diamondSize = 60;
  const halfDiagonal = (diamondSize * Math.sqrt(2)) / 2; // ~42.4px

  // Container size needs to fit the rotated diamond
  const containerSize = Math.ceil(halfDiagonal * 2) + 20; // ~105px

  // Diamond center position within container
  const centerOffset = containerSize / 2;

  return (
    <div className={`relative transition-opacity duration-200 ${isMuted ? 'opacity-30 grayscale' : ''}`} style={{ width: containerSize, height: containerSize }}>
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      {/* Handles - Hybrid (can be input or output) */}
      <HybridHandle
        id="top"
        position={Position.Top}
        nodeId={id}
        nodeColor="yellow"
        style={{ top: 0, left: centerOffset, transform: 'translate(-50%, -50%)' }}
      />
      <HybridHandle
        id="bottom"
        position={Position.Bottom}
        nodeId={id}
        nodeColor="yellow"
        style={{ bottom: 0, left: centerOffset, transform: 'translate(-50%, 50%)' }}
      />
      <HybridHandle
        id="left"
        position={Position.Left}
        nodeId={id}
        nodeColor="yellow"
        style={{ left: 0, top: centerOffset, transform: 'translate(-50%, -50%)' }}
      />
      <HybridHandle
        id="right"
        position={Position.Right}
        nodeId={id}
        nodeColor="yellow"
        style={{ right: 0, top: centerOffset, transform: 'translate(50%, -50%)' }}
      />

      {/* Diamond Shape Container */}
      <div
        className={`
          absolute
          bg-amber-500 hover:bg-amber-600
          border-2 border-amber-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
          ${locked ? 'border-dashed opacity-80' : ''}
        `}
        style={{
          width: diamondSize,
          height: diamondSize,
          left: centerOffset - diamondSize / 2,
          top: centerOffset - diamondSize / 2,
          transform: 'rotate(45deg)',
          borderRadius: '4px',
        }}
      >
        {/* Content Container - Counter-rotate to keep content upright */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: 'rotate(-45deg)' }}
        >
          <Route className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Label below the diamond */}
      <div
        className="absolute -translate-x-1/2"
        style={{ top: '100%', left: centerOffset, marginTop: '28px' }}
        onDoubleClick={handleDoubleClick}
      >
        <span
          className={`text-sm font-medium text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${locked ? '' : 'cursor-text'}`}
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

      {/* Role indicator above node */}
      {role && (
        <div
          className="absolute pointer-events-none -translate-x-1/2"
          style={{ bottom: '100%', left: centerOffset, marginBottom: '36px' }}
        >
          <NodeRole role={role} />
        </div>
      )}

      {/* Systems indicator below label */}
      {systems && systems.length > 0 && (
        <div
          className="absolute pointer-events-none -translate-x-1/2"
          style={{ top: '100%', left: centerOffset, marginTop: '60px' }}
        >
          <NodeSystems systems={systems} />
        </div>
      )}

      {/* Tags indicator below systems */}
      <div
        className="absolute pointer-events-none -translate-x-1/2"
        style={{ top: '100%', left: centerOffset, marginTop: '104px' }}
      >
        <NodeTags tags={tags} />
      </div>
    </div>
  );
}

export default memo(DecisionNode);
