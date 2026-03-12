/**
 * InlineLabelEditor - Reusable component for inline label editing
 * Used by flowchart nodes that support double-click to edit labels
 *
 * Usage:
 * - Parent passes `label`, `isEditing`, `editText`, `inputRef`, and handlers
 * - Renders textarea when editing, div when displaying
 */

import { memo, useEffect, useCallback } from 'react';
import { useFlowchartStore } from '../../../stores/flowchartStore';

interface InlineLabelEditorProps {
  id: string;
  label: string;
  isEditing: boolean;
  editText: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  setIsEditing: (editing: boolean) => void;
  setEditText: (text: string) => void;
  className?: string;
  placeholder?: string;
}

function InlineLabelEditor({
  id,
  label,
  isEditing,
  editText,
  inputRef,
  setIsEditing,
  setEditText,
  className = '',
  placeholder = 'Double-click to edit',
}: InlineLabelEditorProps) {
  const updateNode = useFlowchartStore((state) => state.updateNode);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, inputRef]);

  // Update local state when prop changes (from external updates)
  useEffect(() => {
    setEditText(label);
  }, [label, setEditText]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editText !== label) {
      updateNode(id, { label: editText });
    }
  }, [editText, label, id, updateNode, setIsEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditText(label);
        setIsEditing(false);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Regular Enter saves and exits (single-line behavior)
        e.preventDefault();
        handleBlur();
      }
      // Shift+Enter creates new line (multi-line behavior)
    },
    [label, setIsEditing, setEditText, handleBlur]
  );

  if (isEditing) {
    return (
      <textarea
        ref={inputRef}
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full bg-transparent resize-none outline-none ${className}`}
        style={{
          minHeight: '1.5em',
        }}
      />
    );
  }

  return (
    <div className={className} title={label}>
      {label || placeholder}
    </div>
  );
}

export default memo(InlineLabelEditor);
