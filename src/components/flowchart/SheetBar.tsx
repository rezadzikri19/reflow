import React from 'react';
import { X, FileSpreadsheet } from 'lucide-react';

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
}

// =============================================================================
// SheetBar Component
// =============================================================================

const SheetBar: React.FC<SheetBarProps> = ({
  activeSheetId,
  sheets,
  onSheetSelect,
  onSheetClose,
}) => {
  // Don't render if there are no sheets
  if (sheets.length === 0) {
    return null;
  }

  const handleClose = (e: React.MouseEvent, sheetId: string) => {
    e.stopPropagation(); // Prevent selecting the sheet when closing
    onSheetClose(sheetId);
  };

  return (
    <div className="flex items-center bg-gray-100 border-t border-gray-300 px-2 py-1 min-h-[36px]">
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
  );
};

export default SheetBar;
