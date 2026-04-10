import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useFlowchartStore } from '../../stores/flowchartStore';
import { Button } from '../common/Button';
import type { EdgeType, EdgeStyleOptions, EdgeControlPoint, EdgeData } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface EdgeTypeOption {
  value: EdgeType;
  label: string;
  description: string;
}

interface ColorOption {
  value: string;
  label: string;
  color: string;
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

const COLOR_OPTIONS: ColorOption[] = [
  { value: '#6B7280', label: 'Gray', color: '#6B7280' },
  { value: '#22C55E', label: 'Green', color: '#22C55E' },
  { value: '#3B82F6', label: 'Blue', color: '#3B82F6' },
  { value: '#F59E0B', label: 'Amber', color: '#F59E0B' },
  { value: '#EF4444', label: 'Red', color: '#EF4444' },
  { value: '#8B5CF6', label: 'Purple', color: '#8B5CF6' },
  { value: '#EC4899', label: 'Pink', color: '#EC4899' },
  { value: '#06B6D4', label: 'Cyan', color: '#06B6D4' },
];

const DASH_OPTIONS = [
  { value: '', label: 'Solid' },
  { value: '6,3', label: 'Dashed' },
  { value: '2,2', label: 'Dotted' },
  { value: '10,5,2,5', label: 'Dash-dot' },
];

// Default colors based on direction
const DEFAULT_INPUT_COLOR = '#22C55E';
const DEFAULT_OUTPUT_COLOR = '#3B82F6';
const DEFAULT_REGULAR_COLOR = '#6B7280';
const DEFAULT_DASH = '6,3'; // Dashed for boundary connections
const DEFAULT_REGULAR_DASH = ''; // Solid for regular connections

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an edge ID represents a virtual boundary edge
 */
function isBoundaryEdge(edgeId: string): boolean {
  return edgeId.startsWith('boundary-edge-in-') || edgeId.startsWith('boundary-edge-out-');
}

/**
 * Parse boundary edge ID to extract port ID, direction, and connection index
 */
function parseBoundaryEdgeId(edgeId: string): { portId: string; direction: 'input' | 'output'; connectionIndex: number } | null {
  const inputMatch = edgeId.match(/^boundary-edge-in-(.+?)(?:-(\d+))?$/);
  const outputMatch = edgeId.match(/^boundary-edge-out-(.+?)(?:-(\d+))?$/);

  if (inputMatch) {
    return {
      portId: inputMatch[1],
      direction: 'input',
      connectionIndex: inputMatch[2] ? parseInt(inputMatch[2], 10) : 0,
    };
  } else if (outputMatch) {
    return {
      portId: outputMatch[1],
      direction: 'output',
      connectionIndex: outputMatch[2] ? parseInt(outputMatch[2], 10) : 0,
    };
  }
  return null;
}

// ============================================================================
// Component
// ============================================================================

export const EdgePropertiesPanel: React.FC = () => {
  const edges = useFlowchartStore((state) => state.edges);
  const selectedEdgeId = useFlowchartStore((state) => state.selectedEdgeId);
  const defaultEdgeType = useFlowchartStore((state) => state.defaultEdgeType);
  const updateEdge = useFlowchartStore((state) => state.updateEdge);
  const deleteEdge = useFlowchartStore((state) => state.deleteEdge);
  const setDefaultEdgeType = useFlowchartStore((state) => state.setDefaultEdgeType);
  const updateBoundaryConnectionStyle = useFlowchartStore((state) => state.updateBoundaryConnectionStyle);
  const removeBoundaryPortConnection = useFlowchartStore((state) => state.removeBoundaryPortConnection);
  const addControlPoint = useFlowchartStore((state) => state.addControlPoint);
  const removeControlPoint = useFlowchartStore((state) => state.removeControlPoint);
  const clearControlPoints = useFlowchartStore((state) => state.clearControlPoints);
  const nodes = useFlowchartStore((state) => state.nodes);
  const { getEdges } = useReactFlow();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localLabel, setLocalLabel] = useState<string | undefined>(undefined);
  const [localStyle, setLocalStyle] = useState<EdgeStyleOptions | undefined>(undefined);

  // Find selected edge (check both store edges and virtual edges from React Flow)
  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;

    // First check store edges
    const storeEdge = edges.find((e) => e.id === selectedEdgeId);
    if (storeEdge) return storeEdge;

    // Then check React Flow's edges (for virtual boundary edges)
    const flowEdges = getEdges();
    const virtualEdge = flowEdges.find((e) => e.id === selectedEdgeId);
    return virtualEdge || null;
  }, [selectedEdgeId, edges, getEdges]);

  // Check if selected edge is a boundary edge
  const boundaryInfo = selectedEdge ? parseBoundaryEdgeId(selectedEdge.id) : null;
  const isBoundary = selectedEdge ? isBoundaryEdge(selectedEdge.id) : false;

  // Get the current style and label for the boundary connection from the virtual edge
  const boundaryConnectionData = useMemo((): { style: EdgeStyleOptions; label: string } | undefined => {
    if (!isBoundary || !boundaryInfo || !selectedEdge) return undefined;

    // For boundary edges, we need to get the data from the virtual edge (React Flow's version)
    const edgeData = selectedEdge.data as EdgeData | undefined;
    const customStyle = edgeData?.customStyle || {};
    const label = selectedEdge.label as string | undefined;

    return { style: customStyle, label: label || '' };
  }, [isBoundary, boundaryInfo, selectedEdge]);

  // Sync local label with boundaryConnectionData when selection changes
  // Only sync on initial load (localLabel is undefined), to avoid overwriting user input
  useEffect(() => {
    if (isBoundary && boundaryConnectionData && localLabel === undefined) {
      // Only sync if there's an existing label to sync
      if (boundaryConnectionData.label) {
        setLocalLabel(boundaryConnectionData.label);
      } else {
        // Set to empty string to mark as initialized
        setLocalLabel('');
      }
    }

    // Also sync style on selection change
    if (isBoundary && boundaryConnectionData && localStyle === undefined) {
      setLocalStyle(boundaryConnectionData.style);
    }
  }, [selectedEdgeId, isBoundary]);

  const handleEdgeTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as EdgeType;

      if (isBoundary && boundaryInfo) {
        // Update boundary connection edge type
        const currentStyle = localStyle ?? boundaryConnectionData?.style ?? {};
        // Update local state for immediate feedback
        setLocalStyle({ ...currentStyle, edgeType: newType });
        // Construct the edge ID that matches the format in the store
        const edgeId = boundaryInfo.direction === 'input'
          ? `boundary-edge-in-${boundaryInfo.portId}`
          : `boundary-edge-out-${boundaryInfo.portId}`;
        updateBoundaryConnectionStyle(
          edgeId,
          boundaryInfo.direction,
          boundaryInfo.connectionIndex,
          { ...currentStyle, edgeType: newType },
          undefined
        );
        // Don't update global default for boundary connections
      } else if (selectedEdge) {
        // Update regular edge type
        updateEdge(selectedEdge.id, { type: newType });
        // Only update global default for regular edges
        setDefaultEdgeType(newType);
      }
    },
    [selectedEdge, isBoundary, boundaryInfo, boundaryConnectionData, updateEdge, setDefaultEdgeType, updateBoundaryConnectionStyle]
  );

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      // Always update local state first for immediate feedback
      if (isBoundary && boundaryInfo) {
        setLocalLabel(newValue);
      }

      if (!selectedEdge) return;

      if (isBoundary && boundaryInfo) {
        // Update boundary connection label
        const edgeId = boundaryInfo.direction === 'input'
          ? `boundary-edge-in-${boundaryInfo.portId}`
          : `boundary-edge-out-${boundaryInfo.portId}`;

        updateBoundaryConnectionStyle(
          edgeId,
          boundaryInfo.direction,
          boundaryInfo.connectionIndex,
          undefined,
          newValue
        );
      } else {
        // Update regular edge label
        updateEdge(selectedEdge.id, { label: newValue });
      }
    },
    [selectedEdge, isBoundary, boundaryInfo, updateEdge, updateBoundaryConnectionStyle]
  );

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!selectedEdge) return;

      const newColor = e.target.value;

      if (isBoundary && boundaryInfo) {
        // Update boundary connection color
        const currentStyle = localStyle ?? boundaryConnectionData?.style ?? {};
        // Update local state for immediate feedback
        setLocalStyle({ ...currentStyle, stroke: newColor });
        const edgeId = boundaryInfo.direction === 'input'
          ? `boundary-edge-in-${boundaryInfo.portId}`
          : `boundary-edge-out-${boundaryInfo.portId}`;
        updateBoundaryConnectionStyle(
          edgeId,
          boundaryInfo.direction,
          boundaryInfo.connectionIndex,
          { ...currentStyle, stroke: newColor },
          undefined
        );
      } else {
        // Update regular edge style
        const currentStyle = (selectedEdge.style as React.CSSProperties) || {};
        updateEdge(selectedEdge.id, {
          style: { ...currentStyle, stroke: newColor }
        });
      }
    },
    [selectedEdge, isBoundary, boundaryInfo, boundaryConnectionData, updateEdge, updateBoundaryConnectionStyle]
  );

  const handleDashChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!selectedEdge) return;

      const newDash = e.target.value;

      if (isBoundary && boundaryInfo) {
        // Update boundary connection dash pattern
        const currentStyle = localStyle ?? boundaryConnectionData?.style ?? {};
        // Update local state for immediate feedback
        setLocalStyle({ ...currentStyle, strokeDasharray: newDash || undefined });
        const edgeId = boundaryInfo.direction === 'input'
          ? `boundary-edge-in-${boundaryInfo.portId}`
          : `boundary-edge-out-${boundaryInfo.portId}`;
        updateBoundaryConnectionStyle(
          edgeId,
          boundaryInfo.direction,
          boundaryInfo.connectionIndex,
          { ...currentStyle, strokeDasharray: newDash || undefined },
          undefined
        );
      } else {
        // Update regular edge style
        const currentStyle = (selectedEdge.style as React.CSSProperties) || {};
        updateEdge(selectedEdge.id, {
          style: { ...currentStyle, strokeDasharray: newDash || undefined }
        });
      }
    },
    [selectedEdge, isBoundary, boundaryInfo, localStyle, boundaryConnectionData, updateEdge, updateBoundaryConnectionStyle]
  );

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!selectedEdge) return;

    if (isBoundary && boundaryInfo) {
      // For boundary edges, remove the specific connection
      const edge = edges.find((e) => e.id === boundaryInfo.portId);
      if (edge) {
        const connections = boundaryInfo.direction === 'input'
          ? edge.originalTargets
          : edge.originalSources;

        if (connections && connections[boundaryInfo.connectionIndex]) {
          const conn = connections[boundaryInfo.connectionIndex];
          removeBoundaryPortConnection(
            boundaryInfo.portId,
            boundaryInfo.direction,
            conn.nodeId,
            conn.handleId
          );
        }
      }
    } else {
      // Regular edge deletion
      deleteEdge(selectedEdge.id);
    }
    setShowDeleteConfirm(false);
  }, [selectedEdge, isBoundary, boundaryInfo, edges, deleteEdge, removeBoundaryPortConnection]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Get control points from edge data
  const controlPoints = useMemo(() => {
    if (!selectedEdge || isBoundary) return [];
    return ((selectedEdge.data as { controlPoints?: EdgeControlPoint[] })?.controlPoints || []);
  }, [selectedEdge, isBoundary]);

  // Handle adding control point at midpoint
  const handleAddControlPoint = useCallback(() => {
    if (!selectedEdge || isBoundary) return;

    // Find source and target nodes
    const sourceNode = nodes.find(n => n.id === selectedEdge.source);
    const targetNode = nodes.find(n => n.id === selectedEdge.target);

    if (!sourceNode || !targetNode) return;

    // Calculate midpoint between source and target
    const midX = (sourceNode.position.x + targetNode.position.x) / 2;
    const midY = (sourceNode.position.y + targetNode.position.y) / 2;

    addControlPoint(selectedEdge.id, { x: midX, y: midY });
  }, [selectedEdge, isBoundary, nodes, addControlPoint]);

  // Handle removing a control point
  const handleRemoveControlPoint = useCallback((pointId: string) => {
    if (!selectedEdge) return;
    removeControlPoint(selectedEdge.id, pointId);
  }, [selectedEdge, removeControlPoint]);

  // Handle clearing all control points
  const handleClearControlPoints = useCallback(() => {
    if (!selectedEdge) return;
    clearControlPoints(selectedEdge.id);
  }, [selectedEdge, clearControlPoints]);

  // Get current label - for boundary edges, use local state only
  const currentLabel = isBoundary
    ? localLabel
    : (selectedEdge?.label as string || '');

  // Determine default color based on edge type
  const defaultColor = isBoundary
    ? (boundaryInfo?.direction === 'input' ? DEFAULT_INPUT_COLOR : DEFAULT_OUTPUT_COLOR)
    : DEFAULT_REGULAR_COLOR;

  // Determine default dash based on edge type
  const defaultDash = isBoundary ? DEFAULT_DASH : DEFAULT_REGULAR_DASH;

  const currentStyle = isBoundary
    ? (localStyle ?? boundaryConnectionData?.style ?? {})
    : (((selectedEdge?.style as React.CSSProperties) || {}) as EdgeStyleOptions);

  // Get current edge type
  const currentEdgeType = isBoundary
    ? ((localStyle?.edgeType ?? boundaryConnectionData?.style?.edgeType) || defaultEdgeType)
    : (selectedEdge?.type || defaultEdgeType);

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
              {isBoundary ? 'Boundary Connection' : 'Regular Connection'}
            </p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isBoundary
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {isBoundary ? 'Boundary' : 'Edge'}
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
            {/* Line Style - for both regular and boundary edges */}
            <div>
              <label
                htmlFor="edgeType"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Line Style
              </label>
              <select
                id="edgeType"
                value={currentEdgeType}
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

            {/* Color */}
            <div>
              <label
                htmlFor="edgeColor"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Color
              </label>
              <div className="flex gap-2">
                <select
                  id="edgeColor"
                  value={currentStyle.stroke || defaultColor}
                  onChange={handleColorChange}
                  className="flex-1 rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div
                  className="w-10 h-10 rounded-md border border-gray-300"
                  style={{ backgroundColor: currentStyle.stroke || defaultColor }}
                />
              </div>
            </div>

            {/* Dash Pattern */}
            <div>
              <label
                htmlFor="edgeDash"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Line Pattern
              </label>
              <select
                id="edgeDash"
                value={currentStyle.strokeDasharray || defaultDash}
                onChange={handleDashChange}
                className="block w-full rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {DASH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Label */}
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
                value={isBoundary ? (localLabel !== undefined ? localLabel : '') : (selectedEdge?.label as string || '')}
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
            {isBoundary && boundaryInfo ? (
              <>
                <p>
                  <span className="font-medium">Type:</span> Boundary Connection
                </p>
                <p>
                  <span className="font-medium">Direction:</span> {boundaryInfo.direction === 'input' ? 'Input (external → internal)' : 'Output (internal → external)'}
                </p>
                <p>
                  <span className="font-medium">Connection Index:</span> {boundaryInfo.connectionIndex}
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </section>

        {/* Control Points Section - Only for regular edges */}
        {!isBoundary && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Control Points
            </h3>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Double-click on the connection line to add control points, or use the button below. Drag handles to adjust the path.
              </p>

              {/* Control points list */}
              {controlPoints.length > 0 && (
                <div className="bg-gray-50 rounded-md p-2 space-y-1">
                  {controlPoints.map((point, index) => (
                    <div
                      key={point.id}
                      className="flex items-center justify-between bg-white rounded px-2 py-1.5 border border-gray-200"
                    >
                      <span className="text-xs text-gray-600">
                        Point {index + 1}: ({Math.round(point.x)}, {Math.round(point.y)})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveControlPoint(point.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove control point"
                      >
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddControlPoint}
                  className="flex-1"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  }
                >
                  Add Point
                </Button>
                {controlPoints.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearControlPoints}
                    className="text-gray-500 hover:text-red-500"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {controlPoints.length === 0 && (
                <p className="text-xs text-gray-400 italic">
                  No control points. Double-click on the connection line to add one.
                </p>
              )}
            </div>
          </section>
        )}

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
                {isBoundary ? 'Remove Connection' : 'Delete Connection'}
              </Button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
                <p className="text-sm text-red-700 font-medium">
                  {isBoundary
                    ? 'Are you sure you want to remove this boundary connection?'
                    : 'Are you sure you want to delete this connection?'}
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleConfirmDelete}
                  >
                    Yes, {isBoundary ? 'Remove' : 'Delete'}
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
