import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronRight, Copy, Trash2, Edit2, Check, X } from 'lucide-react';
import { useFlowchartStore } from '../../stores/flowchartStore';
import type { Sheet } from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface SheetInfo {
  id: string;
  label: string;
  nodeCount: number;
}

interface SheetBarProps {
  /** Currently active subprocess ID (null = main flowchart view) */
  activeSubprocessId: string | null;
  /** List of all subprocess sheets (for reference, not tabs) */
  sheets: SheetInfo[];
  /** Callback when a subprocess is selected (for backward compatibility) */
  onSheetSelect: (id: string | null) => void;
  /** Callback when a subprocess is closed */
  onSheetClose: (id: string) => void;
  /** Stack of parent subprocess IDs for breadcrumb navigation */
  subprocessNavigationStack?: string[];
  /** Map of subprocess IDs to their labels for breadcrumb display */
  subprocessLabels?: Map<string, string>;
  /** Callback to navigate to a specific subprocess in history (for breadcrumb clicks) */
  onNavigateToSubprocess?: (id: string | null) => void;
}

// =============================================================================
// SheetBar Component
// =============================================================================

const SheetBar: React.FC<SheetBarProps> = ({
  activeSubprocessId,
  onSheetSelect,
  // Note: onSheetClose is kept for backward compatibility but not used
  // sheets prop is not used - we get sheets from the store directly
  subprocessNavigationStack = [],
  subprocessLabels = new Map(),
  onNavigateToSubprocess,
}) => {
  // Suppress unused variable warning - used in breadcrumb logic
  void onSheetSelect;
  // Sheet management from store
  const flowchartSheets = useFlowchartStore((state) => state.sheets);
  const activeSheetId = useFlowchartStore((state) => state.activeSheetId);
  const createSheet = useFlowchartStore((state) => state.createSheet);
  const deleteSheet = useFlowchartStore((state) => state.deleteSheet);
  const renameSheet = useFlowchartStore((state) => state.renameSheet);
  const setActiveSheet = useFlowchartStore((state) => state.setActiveSheet);
  const duplicateSheet = useFlowchartStore((state) => state.duplicateSheet);

  // Local state for editing
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenuSheetId, setContextMenuSheetId] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingSheetId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSheetId]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuSheetId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (id: string | null) => {
    if (onNavigateToSubprocess) {
      onNavigateToSubprocess(id);
    } else {
      onSheetSelect(id);
    }
  };

  // Handle creating new sheet
  const handleCreateSheet = () => {
    createSheet();
  };

  // Handle sheet tab click
  const handleSheetClick = (sheetId: string) => {
    if (sheetId !== activeSheetId) {
      setActiveSheet(sheetId);
    }
  };

  // Handle start editing
  const handleStartEditing = (sheet: Sheet) => {
    setEditingSheetId(sheet.id);
    setEditingName(sheet.name);
    setContextMenuSheetId(null);
  };

  // Handle save editing
  const handleSaveEditing = () => {
    if (editingSheetId && editingName.trim()) {
      renameSheet(editingSheetId, editingName.trim());
    }
    setEditingSheetId(null);
    setEditingName('');
  };

  // Handle cancel editing
  const handleCancelEditing = () => {
    setEditingSheetId(null);
    setEditingName('');
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEditing();
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, sheetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuSheetId(sheetId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  // Handle delete sheet
  const handleDeleteSheet = (sheetId: string) => {
    if (flowchartSheets.length > 1) {
      deleteSheet(sheetId);
    }
    setContextMenuSheetId(null);
  };

  // Handle duplicate sheet
  const handleDuplicateSheet = (sheetId: string) => {
    duplicateSheet(sheetId);
    setContextMenuSheetId(null);
  };

  // Get the active sheet name for breadcrumb
  const activeSheet = flowchartSheets.find(s => s.id === activeSheetId);
  const sheetName = activeSheet?.name || 'Sheet';

  return (
    <div className="flex flex-col bg-gray-100 border-t border-gray-300">
      {/* Breadcrumb navigation for subprocess drill-down */}
      {activeSubprocessId && (
        <div className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => handleBreadcrumbClick(null)}
            className="hover:text-blue-600 hover:underline"
          >
            {sheetName}
          </button>
          {subprocessNavigationStack.map((parentId) => (
            <React.Fragment key={parentId}>
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <button
                onClick={() => handleBreadcrumbClick(parentId)}
                className="hover:text-blue-600 hover:underline"
              >
                {subprocessLabels.get(parentId) || 'Subprocess'}
              </button>
            </React.Fragment>
          ))}
          <ChevronRight className="w-3 h-3 text-gray-400" />
          <span className="font-medium text-gray-900">
            {subprocessLabels.get(activeSubprocessId) || 'Subprocess'}
          </span>
        </div>
      )}

      {/* Sheet tabs for independent diagrams (like Excel) */}
      <div className="flex items-end px-2 py-1 gap-1">
        {flowchartSheets.map((sheet) => (
          <div
            key={sheet.id}
            className="relative"
          >
            {editingSheetId === sheet.id ? (
              // Editing mode
              <div className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-400 rounded-t-md">
                <input
                  ref={inputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-24 px-1 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSaveEditing}
                  className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={handleCancelEditing}
                  className="p-0.5 text-red-600 hover:bg-red-100 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              // Normal tab mode
              <button
                onClick={() => handleSheetClick(sheet.id)}
                onContextMenu={(e) => handleContextMenu(e, sheet.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-md
                  border transition-colors
                  ${activeSheetId === sheet.id
                    ? 'bg-white border-gray-300 border-b-white text-gray-900 font-medium -mb-px'
                    : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-300 border-b-gray-300'
                  }
                `}
              >
                <span className="truncate max-w-[120px]" title={sheet.name}>
                  {sheet.name}
                </span>
                <span className="text-gray-400 text-xs">
                  ({sheet.nodes.length})
                </span>
              </button>
            )}

            {/* Context menu */}
            {contextMenuSheetId === sheet.id && (
              <div
                ref={contextMenuRef}
                className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[140px]"
                style={{
                  left: contextMenuPosition.x,
                  bottom: window.innerHeight - contextMenuPosition.y,
                }}
              >
                <button
                  onClick={() => handleStartEditing(sheet)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Rename
                </button>
                <button
                  onClick={() => handleDuplicateSheet(sheet.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </button>
                {flowchartSheets.length > 1 && (
                  <button
                    onClick={() => handleDeleteSheet(sheet.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add new sheet button */}
        <button
          onClick={handleCreateSheet}
          className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
          title="Add new sheet"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SheetBar;
