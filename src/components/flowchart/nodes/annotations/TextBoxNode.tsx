/**
 * Text Box Annotation Node
 * An editable text box with optional background for annotations and labels
 * Double-click to edit text inline
 * Enter creates new line, Shift+Enter to save, Escape to cancel
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import type { AnnotationNodeData, TextAlignment, TextVerticalAlignment } from '../../../../types';
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
    textAlign = 'left',
    textVerticalAlign = 'top',
    fontSize = 14,
    fontWeight = 'normal',
    fontStyle = 'normal',
    textColor = '#334155',
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
    } else if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter saves and exits edit mode
      e.preventDefault();
      handleBlur();
    }
    // Regular Enter creates a new line (default textarea behavior)
  }, [label, handleBlur]);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Map vertical alignment to flex alignment
  const flexAlignMap: Record<TextVerticalAlignment, string> = {
    top: 'flex-start',
    middle: 'center',
    bottom: 'flex-end',
  };

  // Map text alignment
  const textAlignMap: Record<TextAlignment, string> = {
    left: 'left',
    center: 'center',
    right: 'right',
  };

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
          w-full h-full p-2 flex
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
          justifyContent: textAlignMap[textAlign],
          alignItems: flexAlignMap[textVerticalAlign],
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
            className="w-full h-full bg-transparent resize-none outline-none"
            style={{
              minHeight: 20,
              fontSize,
              fontWeight,
              fontStyle,
              color: textColor,
              textAlign: textAlignMap[textAlign],
            }}
          />
        ) : (
          <div
            className="w-full whitespace-pre-wrap break-words overflow-hidden"
            style={{
              fontSize,
              fontWeight,
              fontStyle,
              color: textColor,
              textAlign: textAlignMap[textAlign],
            }}
          >
            {label || 'Double-click to edit'}
          </div>
        )}
      </div>
    </>
  );
}

export default memo(TextBoxNode);
