import React, { useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useFlowchartStore } from '../../stores/flowchartStore';
import { Button } from '../common/Button';
import type { EdgeType } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface EdgeTypeOption {
  value: EdgeType;
  label: string;
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

const EDGE_TYPE_OPTIONS: EdgeTypeOption[] = [
  { value: 'smoothstep', label: 'Step', description: 'Right-angle corners' },
  { value: 'bezier', label: 'Curved', description: 'Smooth curve' },
  { value: 'straight', label: 'Straight', description: 'Direct line' },
  { value: 'simplebezier', label: 'Simple Curve', description: 'Gentle curve' },
];

// ============================================================================
// Component
// ============================================================================

export const EdgePropertiesPanel: React.FC = () => {
  const edges = useFlowchartStore((state) => state.edges);
  const updateEdge = useFlowchartStore((state) => state.updateEdge);
  const deleteEdge = useFlowchartStore((state) => state.deleteEdge);
  const setDefaultEdgeType = useFlowchartStore((state) => state.setDefaultEdgeType);
  const { getEdges } = useReactFlow();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Find selected edge
  const selectedEdge = edges.find((e) => e.selected);

  const handleEdgeTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as EdgeType;
      if (selectedEdge) {
        updateEdge(selectedEdge.id, { type: newType });
      }
      // Persist the selected line style as default for future connections
      setDefaultEdgeType(newType);
    },
    [selectedEdge, updateEdge, setDefaultEdgeType]
  );

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedEdge) {
        updateEdge(selectedEdge.id, { label: e.target.value });
      }
    },
    [selectedEdge, updateEdge]
  );

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (selectedEdge) {
      deleteEdge(selectedEdge.id);
      setShowDeleteConfirm(false);
    }
  }, [selectedEdge, deleteEdge]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // No edge selected state
  if (!selectedEdge) {
    return null;
  }

  return (
    <div className="h-full bg-white border-l border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Connection Properties</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedEdge.sourceHandle ? `${selectedEdge.sourceHandle} → ` : ''}
              Connection
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Edge
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Style Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Connection Style
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="edgeType"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Line Style
              </label>
              <select
                id="edgeType"
                value={selectedEdge.type || 'smoothstep'}
                onChange={handleEdgeTypeChange}
                className="block w-full rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {EDGE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="edgeLabel"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Label (optional)
              </label>
              <input
                id="edgeLabel"
                type="text"
                value={selectedEdge.label || ''}
                onChange={handleLabelChange}
                className="block w-full rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm placeholder-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter connection label"
              />
            </div>
          </div>
        </section>

        {/* Connection Info */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Connection Info
          </h3>
          <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium">From:</span> {selectedEdge.source.slice(0, 8)}...
            </p>
            <p>
              <span className="font-medium">To:</span> {selectedEdge.target.slice(0, 8)}...
            </p>
            {selectedEdge.sourceHandle && (
              <p>
                <span className="font-medium">Handle:</span> {selectedEdge.sourceHandle}
              </p>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Actions
          </h3>
          <div className="space-y-2">
            {!showDeleteConfirm ? (
              <Button
                variant="danger"
                size="md"
                fullWidth
                onClick={handleDeleteClick}
                leftIcon={
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                }
              >
                Delete Connection
              </Button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
                <p className="text-sm text-red-700 font-medium">
                  Are you sure you want to delete this connection?
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleConfirmDelete}
                  >
                    Yes, Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelDelete}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default EdgePropertiesPanel;
