import React from 'react';
import { X, FileSpreadsheet, ChevronRight } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface SheetInfo {
  id: string;
  label: string;
  nodeCount: number;
}

interface SheetBarProps {
  /** Currently active sheet ID (null = main flowchart view) */
  activeSheetId: string | null;
  /** List of all subprocess sheets */
  sheets: SheetInfo[];
  /** Callback when a sheet is selected */
  onSheetSelect: (id: string | null) => void;
  /** Callback when a sheet is closed */
  onSheetClose: (id: string) => void;
  /** Stack of parent sheet IDs for breadcrumb navigation */
  sheetNavigationStack?: string[];
  /** Map of subprocess IDs to their labels for breadcrumb display */
  subprocessLabels?: Map<string, string>;
  /** Callback to navigate to a specific sheet in history (for breadcrumb clicks) */
  onNavigateToSheet?: (id: string | null) => void;
}

// =============================================================================
// SheetBar Component
// =============================================================================

const SheetBar: React.FC<SheetBarProps> = ({
  activeSheetId,
  sheets,
  onSheetSelect,
  onSheetClose,
  sheetNavigationStack = [],
  subprocessLabels = new Map(),
  onNavigateToSheet,
}) => {
  // Don't render if there are no sheets and no active sheet
  if (sheets.length === 0 && !activeSheetId) {
    return null;
  }

  const handleClose = (e: React.MouseEvent, sheetId: string) => {
    e.stopPropagation(); // Prevent selecting the sheet when closing
    onSheetClose(sheetId);
  };

  // Use onNavigateToSheet if available for breadcrumb navigation, fallback to onSheetSelect
  const handleBreadcrumbClick = (id: string | null) => {
    if (onNavigateToSheet) {
      onNavigateToSheet(id);
    } else {
      onSheetSelect(id);
    }
  };

  return (
    <div className="flex flex-col bg-gray-100 border-t border-gray-300 min-h-[36px]">
      {/* Breadcrumb navigation - only show when there's a navigation stack */}
      {sheetNavigationStack.length > 0 && activeSheetId && (
        <div className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => handleBreadcrumbClick(null)}
            className="hover:text-blue-600 hover:underline"
          >
            Main
          </button>
          {sheetNavigationStack.map((parentId) => (
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
            {subprocessLabels.get(activeSheetId) || 'Subprocess'}
          </span>
        </div>
      )}

      {/* Sheet tabs */}
      <div className="flex items-center px-2 py-1">
        {/* Main tab - always present */}
        <button
          onClick={() => onSheetSelect(null)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-md
            border border-b-0 transition-colors
            ${activeSheetId === null
              ? 'bg-white border-gray-300 text-gray-900 font-medium'
              : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-300'
            }
          `}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Main</span>
        </button>

        {/* Subprocess sheets */}
        {sheets.map((sheet) => (
          <button
            key={sheet.id}
            onClick={() => onSheetSelect(sheet.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-md ml-1
              border border-b-0 transition-colors group
              ${activeSheetId === sheet.id
                ? 'bg-white border-gray-300 text-gray-900 font-medium'
                : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-300'
              }
            `}
          >
            <span className="truncate max-w-[120px]" title={sheet.label}>
              {sheet.label}
            </span>
            <span className="text-gray-400 text-xs">
              ({sheet.nodeCount})
            </span>
            {activeSheetId === sheet.id && (
              <span
                onClick={(e) => handleClose(e, sheet.id)}
                className="ml-1 p-0.5 rounded hover:bg-gray-400 text-gray-500 hover:text-gray-700"
                title="Close sheet"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SheetBar;
