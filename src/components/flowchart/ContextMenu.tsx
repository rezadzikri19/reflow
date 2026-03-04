import React, { useEffect, useRef, useCallback } from 'react';
import { useUpdateNodeInternals } from '@xyflow/react';
import { Layers, Ungroup, X, ArrowLeft, ArrowRight, Link } from 'lucide-react';
import { useFlowchartStore } from '../../stores/flowchartStore';
import type { FlowchartNode } from '../../types';

// =============================================================================
// Types
// =============================================================================

type ContextMenuPosition = {
  x: number;
  y: number;
};

interface ContextMenuProps {
  /** Whether the menu is visible */
  isOpen: boolean;
  /** Position of the menu */
  position: ContextMenuPosition;
  /** Callback when menu closes */
  onClose: () => void;
  /** IDs of currently selected nodes */
  selectedNodeIds: string[];
  /** Whether the selection can be grouped */
  canGroup: boolean;
  /** Reason why grouping is not allowed (if canGroup is false) */
  groupDisabledReason?: string;
  /** Whether a subprocess is selected (for ungroup) */
  isSubprocessSelected: boolean;
  /** ID of selected subprocess (if any) */
  selectedSubprocessId?: string;
  /** Selected node that can be referenced (single selection, non-reference type) */
  referenceableNode?: FlowchartNode | null;
}

// =============================================================================
// Component
// =============================================================================

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  selectedNodeIds,
  canGroup,
  groupDisabledReason,
  isSubprocessSelected,
  selectedSubprocessId,
  referenceableNode,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const groupNodesIntoSubprocess = useFlowchartStore((state) => state.groupNodesIntoSubprocess);
  const ungroupSubprocess = useFlowchartStore((state) => state.ungroupSubprocess);
  const addManualPort = useFlowchartStore((state) => state.addManualPort);
  const createReferenceToNode = useFlowchartStore((state) => state.createReferenceToNode);
  const updateNodeInternals = useUpdateNodeInternals();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position to keep menu in viewport
  const adjustedPosition = useCallback(() => {
    if (!menuRef.current) return position;

    const menuWidth = 180;
    const menuHeight = 120;
    const padding = 10;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + menuWidth + padding > window.innerWidth) {
      x = window.innerWidth - menuWidth - padding;
    }

    // Adjust vertical position
    if (y + menuHeight + padding > window.innerHeight) {
      y = window.innerHeight - menuHeight - padding;
    }

    return { x: Math.max(padding, x), y: Math.max(padding, y) };
  }, [position]);

  const handleGroup = useCallback(() => {
    if (!canGroup) return;
    groupNodesIntoSubprocess(selectedNodeIds);
    onClose();
  }, [canGroup, groupNodesIntoSubprocess, selectedNodeIds, onClose]);

  const handleUngroup = useCallback(() => {
    if (!isSubprocessSelected || !selectedSubprocessId) return;
    ungroupSubprocess(selectedSubprocessId);
    onClose();
  }, [isSubprocessSelected, selectedSubprocessId, ungroupSubprocess, onClose]);

  const handleAddInputPort = useCallback(() => {
    if (!isSubprocessSelected || !selectedSubprocessId) return;
    addManualPort(selectedSubprocessId, 'input');
    updateNodeInternals(selectedSubprocessId);
    onClose();
  }, [isSubprocessSelected, selectedSubprocessId, addManualPort, updateNodeInternals, onClose]);

  const handleAddOutputPort = useCallback(() => {
    if (!isSubprocessSelected || !selectedSubprocessId) return;
    addManualPort(selectedSubprocessId, 'output');
    updateNodeInternals(selectedSubprocessId);
    onClose();
  }, [isSubprocessSelected, selectedSubprocessId, addManualPort, updateNodeInternals, onClose]);

  const handleCreateReference = useCallback(() => {
    if (!referenceableNode) return;
    createReferenceToNode(referenceableNode.id);
    onClose();
  }, [referenceableNode, createReferenceToNode, onClose]);

  if (!isOpen) return null;

  const adjustedPos = adjustedPosition();

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-in fade-in-0 zoom-in-95"
      style={{
        left: adjustedPos.x,
        top: adjustedPos.y,
      }}
    >
      {/* Group option */}
      <button
        className={`
          w-full px-3 py-2 text-left text-sm flex items-center gap-2
          ${canGroup
            ? 'text-gray-700 hover:bg-gray-100 cursor-pointer'
            : 'text-gray-400 cursor-not-allowed'
          }
        `}
        onClick={handleGroup}
        disabled={!canGroup}
        title={groupDisabledReason}
      >
        <Layers className="w-4 h-4" />
        <span>Group into Subprocess</span>
      </button>

      {/* Ungroup option */}
      {isSubprocessSelected && (
        <button
          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          onClick={handleUngroup}
        >
          <Ungroup className="w-4 h-4" />
          <span>Ungroup Subprocess</span>
        </button>
      )}

      {/* Add Manual Port options (for subprocess) */}
      {isSubprocessSelected && (
        <>
          <div className="my-1 border-t border-gray-100" />
          <button
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            onClick={handleAddInputPort}
          >
            <ArrowLeft className="w-4 h-4 text-green-500" />
            <span>Add Input Port</span>
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            onClick={handleAddOutputPort}
          >
            <ArrowRight className="w-4 h-4 text-blue-500" />
            <span>Add Output Port</span>
          </button>
        </>
      )}

      {/* Create Reference option */}
      {referenceableNode && (
        <button
          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          onClick={handleCreateReference}
        >
          <Link className="w-4 h-4 text-sky-500" />
          <span>Create Reference</span>
        </button>
      )}

      {/* Divider */}
      <div className="my-1 border-t border-gray-100" />

      {/* Cancel option */}
      <button
        className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 flex items-center gap-2"
        onClick={onClose}
      >
        <X className="w-4 h-4" />
        <span>Cancel</span>
      </button>
    </div>
  );
};

export default ContextMenu;
