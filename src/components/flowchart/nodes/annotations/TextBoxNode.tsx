/**
 * Text Box Annotation Node
 * An editable text box with optional background for annotations and labels
 * Double-click to edit text inline
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import type { AnnotationNodeData } from '../../../../types';
import { useFlowchartStore } from '../../../../stores/flowchartStore';

function TextBoxNode({ id, data, selected }: NodeProps) {
  const nodeData = (data as AnnotationNodeData) || {};
  const {
    label = 'Double-click to edit',
    fillColor = '#ffffff',
    strokeColor = '#64748b',
    strokeWidth = 1,
    hideBorder = false,
    locked = false,
  } = nodeData;

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(label);
  const [isResizing, setIsResizing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const updateNode = useFlowchartStore((state) => state.updateNode);

  // Update local state when prop changes
  useEffect(() => {
    setEditText(label);
  }, [label]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!locked) {
      setIsEditing(true);
    }
  }, [locked]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editText !== label) {
      updateNode(id, { label: editText });
    }
  }, [editText, label, id, updateNode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditText(label);
      setIsEditing(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
  }, [label, handleBlur]);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  return (
    <>
      <NodeResizer
        minWidth={60}
        minHeight={30}
        isVisible={selected && !locked && !isEditing}
        lineClassName="!bg-blue-400"
        handleClassName="!w-3 !h-3 !bg-white !border-2 !border-blue-400 !rounded-sm"
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
      />
      <div
        className={`
          w-full h-full p-2
          ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
          ${locked ? 'opacity-70' : ''}
          ${isResizing ? 'pointer-events-none' : ''}
          transition-opacity duration-150
          ${!isEditing && !locked ? 'cursor-text' : ''}
        `}
        style={{
          backgroundColor: fillColor,
          borderColor: hideBorder ? 'transparent' : strokeColor,
          borderWidth: hideBorder ? 0 : strokeWidth,
          borderStyle: 'solid',
          borderRadius: 4,
        }}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <textarea
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full h-full bg-transparent resize-none outline-none text-sm text-slate-700"
            style={{ minHeight: 20 }}
          />
        ) : (
          <div className="w-full h-full text-sm text-slate-700 whitespace-pre-wrap break-words overflow-hidden">
            {label || 'Double-click to edit'}
          </div>
        )}
      </div>
    </>
  );
}

export default memo(TextBoxNode);
