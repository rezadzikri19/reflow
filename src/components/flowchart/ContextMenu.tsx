import React, { useEffect, useRef, useCallback } from 'react';
import { useUpdateNodeInternals } from '@xyflow/react';
import { Layers, Ungroup, X, ArrowLeft, ArrowRight, Link, Lock, LockOpen, Copy, Clipboard, Scissors } from 'lucide-react';
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
  /** Whether any of the selected nodes are locked */
  hasLockedNodes?: boolean;
  /** Whether any of the selected nodes are unlocked */
  hasUnlockedNodes?: boolean;
  /** Whether there is content in the clipboard */
  hasClipboardContent?: boolean;
  /** Callback to lock boundary ports */
  onLockBoundaryPorts?: (portIds: string[]) => void;
  /** Callback to unlock boundary ports */
  onUnlockBoundaryPorts?: (portIds: string[]) => void;
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
  hasLockedNodes,
  hasUnlockedNodes,
  hasClipboardContent,
  onLockBoundaryPorts,
  onUnlockBoundaryPorts,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const groupNodesIntoSubprocess = useFlowchartStore((state) => state.groupNodesIntoSubprocess);
  const ungroupSubprocess = useFlowchartStore((state) => state.ungroupSubprocess);
  const addManualPort = useFlowchartStore((state) => state.addManualPort);
  const createReferenceToNode = useFlowchartStore((state) => state.createReferenceToNode);
  const lockNodes = useFlowchartStore((state) => state.lockNodes);
  const unlockNodes = useFlowchartStore((state) => state.unlockNodes);
  const copySelectedNodes = useFlowchartStore((state) => state.copySelectedNodes);
  const pasteNodes = useFlowchartStore((state) => state.pasteNodes);
  const cutSelectedNodes = useFlowchartStore((state) => state.cutSelectedNodes);
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
    const menuHeight = 200;
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

  const handleLockNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) return;

    // Separate boundary ports from regular nodes
    const boundaryPortIds = selectedNodeIds.filter(id =>
      id.startsWith('boundary-in-') || id.startsWith('boundary-out-')
    );
    const regularNodeIds = selectedNodeIds.filter(id =>
      !id.startsWith('boundary-in-') && !id.startsWith('boundary-out-')
    );

    // Lock regular nodes
    if (regularNodeIds.length > 0) {
      lockNodes(regularNodeIds);
    }

    // Lock boundary ports via callback
    if (boundaryPortIds.length > 0 && onLockBoundaryPorts) {
      onLockBoundaryPorts(boundaryPortIds);
    }

    onClose();
  }, [selectedNodeIds, lockNodes, onClose, onLockBoundaryPorts]);

  const handleUnlockNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) return;

    // Separate boundary ports from regular nodes
    const boundaryPortIds = selectedNodeIds.filter(id =>
      id.startsWith('boundary-in-') || id.startsWith('boundary-out-')
    );
    const regularNodeIds = selectedNodeIds.filter(id =>
      !id.startsWith('boundary-in-') && !id.startsWith('boundary-out-')
    );

    // Unlock regular nodes
    if (regularNodeIds.length > 0) {
      unlockNodes(regularNodeIds);
    }

    // Unlock boundary ports via callback
    if (boundaryPortIds.length > 0 && onUnlockBoundaryPorts) {
      onUnlockBoundaryPorts(boundaryPortIds);
    }

    onClose();
  }, [selectedNodeIds, unlockNodes, onClose, onUnlockBoundaryPorts]);

  const handleCopy = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    copySelectedNodes();
    onClose();
  }, [selectedNodeIds, copySelectedNodes, onClose]);

  const handleCut = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    cutSelectedNodes();
    onClose();
  }, [selectedNodeIds, cutSelectedNodes, onClose]);

  const handlePaste = useCallback(() => {
    pasteNodes();
    onClose();
  }, [pasteNodes, onClose]);

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

      {/* Lock/Unlock options - show when there are selected nodes */}
      {selectedNodeIds.length > 0 && (hasLockedNodes || hasUnlockedNodes) && (
        <>
          <div className="my-1 border-t border-gray-100" />
          {hasUnlockedNodes && (
            <button
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              onClick={handleLockNodes}
            >
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Lock Nodes</span>
            </button>
          )}
          {hasLockedNodes && (
            <button
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              onClick={handleUnlockNodes}
            >
              <LockOpen className="w-4 h-4 text-green-500" />
              <span>Unlock Nodes</span>
            </button>
          )}
        </>
      )}

      {/* Copy/Cut/Paste options */}
      <div className="my-1 border-t border-gray-100" />

      {/* Copy option */}
      <button
        className={`
          w-full px-3 py-2 text-left text-sm flex items-center gap-2
          ${selectedNodeIds.length > 0
            ? 'text-gray-700 hover:bg-gray-100 cursor-pointer'
            : 'text-gray-400 cursor-not-allowed'
          }
        `}
        onClick={handleCopy}
        disabled={selectedNodeIds.length === 0}
        title={selectedNodeIds.length === 0 ? 'Select nodes to copy' : 'Copy selected nodes (Ctrl+C)'}
      >
        <Copy className="w-4 h-4" />
        <span>Copy</span>
        <span className="ml-auto text-xs text-gray-400">Ctrl+C</span>
      </button>

      {/* Cut option */}
      <button
        className={`
          w-full px-3 py-2 text-left text-sm flex items-center gap-2
          ${selectedNodeIds.length > 0
            ? 'text-gray-700 hover:bg-gray-100 cursor-pointer'
            : 'text-gray-400 cursor-not-allowed'
          }
        `}
        onClick={handleCut}
        disabled={selectedNodeIds.length === 0}
        title={selectedNodeIds.length === 0 ? 'Select nodes to cut' : 'Cut selected nodes (Ctrl+X)'}
      >
        <Scissors className="w-4 h-4" />
        <span>Cut</span>
        <span className="ml-auto text-xs text-gray-400">Ctrl+X</span>
      </button>

      {/* Paste option */}
      <button
        className={`
          w-full px-3 py-2 text-left text-sm flex items-center gap-2
          ${hasClipboardContent
            ? 'text-gray-700 hover:bg-gray-100 cursor-pointer'
            : 'text-gray-400 cursor-not-allowed'
          }
        `}
        onClick={handlePaste}
        disabled={!hasClipboardContent}
        title={hasClipboardContent ? 'Paste nodes (Ctrl+V)' : 'No nodes in clipboard'}
      >
        <Clipboard className="w-4 h-4" />
        <span>Paste</span>
        <span className="ml-auto text-xs text-gray-400">Ctrl+V</span>
      </button>

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
