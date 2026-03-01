import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { isNode } from '@xyflow/react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  BackgroundVariant,
  MarkerType,
  SelectionMode,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type {
  Connection,
  NodeTypes,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
} from '@xyflow/react';

import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { useFlowchartStore } from '../../stores/flowchartStore';
import type { FlowchartNode, FlowchartEdge, ProcessNodeType } from '../../types';
import type { BoundaryPortNodeData } from './nodes/BoundaryPortNode';
import ContextMenu from './ContextMenu';
import SheetBar, { type SheetInfo } from './SheetBar';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// =============================================================================
// Local Types
// =============================================================================

interface ContextMenuPosition {
  x: number;
  y: number;
}

// =============================================================================
// Types
// =============================================================================

interface FlowCanvasProps {
  /** Whether the canvas is in read-only mode */
  readOnly?: boolean;
  /** Custom class name for the canvas container */
  className?: string;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Callback when the canvas background is clicked */
  onCanvasClick?: () => void;
  /** Grid size for snap to grid functionality */
  gridSize?: number;
  /** Whether snap to grid is enabled */
  snapToGrid?: boolean;
  /** Whether to show the grid background */
  showGrid?: boolean;
  /** Whether to show the minimap */
  showMinimap?: boolean;
}

// =============================================================================
// Flow Canvas Inner Component (needs useReactFlow hook)
// =============================================================================

interface FlowCanvasInnerProps extends FlowCanvasProps {
  /** Node types to register with React Flow */
  customNodeTypes?: NodeTypes;
}

function FlowCanvasInner({
  readOnly = false,
  className = '',
  onNodeClick,
  onCanvasClick,
  gridSize = 20,
  snapToGrid = true,
  showGrid = true,
  showMinimap = true,
  customNodeTypes,
}: FlowCanvasInnerProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();

  // Store selectors
  const nodes = useFlowchartStore((state) => state.nodes);
  const edges = useFlowchartStore((state) => state.edges);
  const selectedNodeId = useFlowchartStore((state) => state.selectedNodeId);
  const addNode = useFlowchartStore((state) => state.addNode);
  const addEdge = useFlowchartStore((state) => state.addEdge);
  const setNodes = useFlowchartStore((state) => state.setNodes);
  const setEdges = useFlowchartStore((state) => state.setEdges);
  const setSelectedNode = useFlowchartStore((state) => state.setSelectedNode);
  const deleteNode = useFlowchartStore((state) => state.deleteNode);
  const deleteNodes = useFlowchartStore((state) => state.deleteNodes);
  const deleteEdge = useFlowchartStore((state) => state.deleteEdge);
  const deleteEdges = useFlowchartStore((state) => state.deleteEdges);
  const markDirty = useFlowchartStore((state) => state.markDirty);
  const activeSheetId = useFlowchartStore((state) => state.activeSheetId);
  const openSubprocessSheet = useFlowchartStore((state) => state.openSubprocessSheet);
  const closeActiveSheet = useFlowchartStore((state) => state.closeActiveSheet);
  const groupNodesIntoSubprocess = useFlowchartStore((state) => state.groupNodesIntoSubprocess);
  const defaultEdgeType = useFlowchartStore((state) => state.defaultEdgeType);

  // Context menu state
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });

  // Boundary port positions - stored separately for smooth dragging
  // These are absolute positions, not offsets
  const [boundaryPortPositions, setBoundaryPortPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Track which port is being dragged and its starting position
  const boundaryDragStateRef = useRef<{
    dragStartPositions: Record<string, { x: number; y: number }>;
    draggedPortId: string | null;
    draggedDirection: 'input' | 'output' | null;
    startPosition: { x: number; y: number } | null;
  }>({
    dragStartPositions: {},
    draggedPortId: null,
    draggedDirection: null,
    startPosition: null,
  });

  // Reset positions when sheet changes
  useEffect(() => {
    setBoundaryPortPositions({});
    boundaryDragStateRef.current = {
      dragStartPositions: {},
      draggedPortId: null,
      draggedDirection: null,
      startPosition: null,
    };
  }, [activeSheetId]);

  // Use custom node types if provided, otherwise use defaults
  const registeredNodeTypes = customNodeTypes || nodeTypes;

  // =============================================================================
  // Event Handlers
  // =============================================================================

  /**
   * Handle node changes (position, selection, dimensions, etc.)
   */
  const onNodesChange: OnNodesChange<FlowchartNode> = useCallback(
    (changes) => {
      // Handle boundary port node position changes specially
      const boundaryPortPositionChanges = changes.filter(
        (change) =>
          change.type === 'position' &&
          (change.id.startsWith('boundary-input-') || change.id.startsWith('boundary-output-'))
      );

      // If boundary port nodes are being dragged, update all ports of same direction together
      if (boundaryPortPositionChanges.length > 0) {
        boundaryPortPositionChanges.forEach((change) => {
          if (change.type !== 'position' || !change.position) return;

          const isInput = change.id.startsWith('boundary-input-');
          const direction = isInput ? 'input' : 'output';

          // On drag start, capture all port positions of the same direction
          if (change.dragging && !boundaryDragStateRef.current.draggedPortId) {
            boundaryDragStateRef.current.draggedPortId = change.id;
            boundaryDragStateRef.current.draggedDirection = direction;
            boundaryDragStateRef.current.startPosition = { ...change.position };
            // Store all current positions
            boundaryDragStateRef.current.dragStartPositions = { ...boundaryPortPositions };
          }

          // Calculate delta from start position
          const startPos = boundaryDragStateRef.current.startPosition;
          if (startPos) {
            const deltaX = change.position.x - startPos.x;
            const deltaY = change.position.y - startPos.y;

            // Update all ports of the same direction
            setBoundaryPortPositions((prev) => {
              const updated = { ...prev };

              // Get all port IDs of the same direction from dragStartPositions
              Object.keys(boundaryDragStateRef.current.dragStartPositions).forEach((portId) => {
                if ((direction === 'input' && portId.startsWith('boundary-input-')) ||
                    (direction === 'output' && portId.startsWith('boundary-output-'))) {
                  const originalPos = boundaryDragStateRef.current.dragStartPositions[portId];
                  if (originalPos) {
                    updated[portId] = {
                      x: originalPos.x + deltaX,
                      y: originalPos.y + deltaY,
                    };
                  }
                }
              });

              // Also initialize any ports that weren't in dragStartPositions
              // This handles the case where ports were just created
              if (!updated[change.id]) {
                updated[change.id] = { ...change.position };
              }

              return updated;
            });
          }

          // Reset on drag end
          if (!change.dragging) {
            boundaryDragStateRef.current = {
              dragStartPositions: {},
              draggedPortId: null,
              draggedDirection: null,
              startPosition: null,
            };
          }
        });

        // Filter out boundary port position changes so they don't affect the store
        const otherChanges = changes.filter(
          (change) =>
            !(change.type === 'position' &&
              (change.id.startsWith('boundary-input-') || change.id.startsWith('boundary-output-')))
        );

        if (otherChanges.length > 0) {
          const updatedNodes = applyNodeChanges(otherChanges, nodes);
          setNodes(updatedNodes);

          // Handle side effects for non-boundary nodes
          otherChanges.forEach((change) => {
            if (change.type === 'remove') {
              deleteNode(change.id);
            } else if (change.type === 'select') {
              if (change.selected) {
                setSelectedNode(change.id);
              } else if (selectedNodeId === change.id) {
                setSelectedNode(null);
              }
            } else if (change.type === 'position') {
              markDirty();
            }
          });
        }
        return;
      }

      // Apply changes to get updated nodes (normal case)
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);

      // Handle side effects
      changes.forEach((change) => {
        if (change.type === 'remove') {
          deleteNode(change.id);
        } else if (change.type === 'select') {
          if (change.selected) {
            setSelectedNode(change.id);
          } else if (selectedNodeId === change.id) {
            setSelectedNode(null);
          }
        } else if (change.type === 'position') {
          markDirty();
        }
      });
    },
    [nodes, readOnly, deleteNode, setSelectedNode, selectedNodeId, setNodes, markDirty, boundaryPortPositions]
  );

  /**
   * Handle edge changes
   */
  const onEdgesChange: OnEdgesChange<FlowchartEdge> = useCallback(
    (changes) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      setEdges(updatedEdges);

      changes.forEach((change) => {
        if (change.type === 'remove') {
          deleteEdge(change.id);
        }
      });
    },
    [edges, deleteEdge, setEdges]
  );

  /**
   * Handle new connections between nodes
   */
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      if (!connection.source || !connection.target) return;

      // Prevent self-connections
      if (connection.source === connection.target) return;

      addEdge(
        connection.source,
        connection.target,
        connection.sourceHandle,
        connection.targetHandle
      );
    },
    [readOnly, addEdge]
  );

  /**
   * Handle node click events
   */
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: FlowchartNode) => {
      // If Shift is held, let React Flow handle multi-selection
      if (event.shiftKey) {
        onNodeClick?.(node.id);
        return;
      }
      setSelectedNode(node.id);
      onNodeClick?.(node.id);
    },
    [setSelectedNode, onNodeClick]
  );

  /**
   * Handle canvas/pane click events
   */
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    onCanvasClick?.();
  }, [setSelectedNode, onCanvasClick]);

  /**
   * Handle drag over for drop functionality
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  /**
   * Handle drop from node palette
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (readOnly) return;

      // Get the node type from the drag data
      const nodeType = event.dataTransfer.getData('application/reactflow') as ProcessNodeType;

      if (!nodeType) return;

      // Get the position where the node was dropped
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Snap to grid if enabled
      if (snapToGrid) {
        position.x = Math.round(position.x / gridSize) * gridSize;
        position.y = Math.round(position.y / gridSize) * gridSize;
      }

      // Add the new node
      addNode(nodeType, position);
    },
    [readOnly, screenToFlowPosition, snapToGrid, gridSize, addNode]
  );

  /**
   * Handle keyboard events (delete selected elements, grouping shortcut)
   */
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts if we're editing an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for Delete or Backspace key
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Get all currently selected nodes from React Flow
        const currentNodes = getNodes();
        const selectedNodes = currentNodes.filter((node) => node.selected);
        const selectedNodeIds = selectedNodes.map((node) => node.id);

        // Get all currently selected edges from React Flow
        const currentEdges = getEdges();
        const selectedEdges = currentEdges.filter((edge) => edge.selected);
        const selectedEdgeIds = selectedEdges.map((edge) => edge.id);

        // Delete all selected nodes
        if (selectedNodeIds.length > 0) {
          deleteNodes(selectedNodeIds);
          setSelectedNode(null);
        }

        // Delete all selected edges
        if (selectedEdgeIds.length > 0) {
          deleteEdges(selectedEdgeIds);
        }
      }

      // Ctrl+G for grouping
      if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
        event.preventDefault();
        const currentNodes = getNodes();
        const selectedNodes = currentNodes.filter((node) => node.selected);
        const selectedNodeIds = selectedNodes.map((node) => node.id);

        if (selectedNodeIds.length >= 2) {
          const result = groupNodesIntoSubprocess(selectedNodeIds);
          if (result) {
            setSelectedNode(result);
          }
        }
      }

      // Escape key deselects and closes context menu
      if (event.key === 'Escape') {
        setSelectedNode(null);
        setContextMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, getNodes, getEdges, deleteNodes, deleteEdges, setSelectedNode, groupNodesIntoSubprocess]);

  // =============================================================================
  // Context Menu Handling
  // =============================================================================

  /**
   * Handle context menu (right-click) on the pane
   */
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    if (readOnly) return;

    event.preventDefault();

    const currentNodes = getNodes();
    const selectedNodes = currentNodes.filter((node) => node.selected);

    // Only show context menu if there are selected nodes
    if (selectedNodes.length > 0) {
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setContextMenuOpen(true);
    }
  }, [readOnly, getNodes]);

  /**
   * Close the context menu
   */
  const handleCloseContextMenu = useCallback(() => {
    setContextMenuOpen(false);
  }, []);

  /**
   * Get context menu validation state
   */
  const getContextMenuState = useCallback(() => {
    const currentNodes = getNodes() as FlowchartNode[];
    const selectedNodes = currentNodes.filter((node) => node.selected);
    const selectedNodeIds = selectedNodes.map((node) => node.id);

    // Check if a subprocess is selected
    const selectedSubprocess = selectedNodes.find(n => n.type === 'subprocess');
    const isSubprocessSelected = selectedNodes.length === 1 && !!selectedSubprocess;

    // Validate grouping
    let canGroup = false;
    let groupDisabledReason = '';

    if (selectedNodes.length < 2) {
      groupDisabledReason = 'Select at least 2 nodes to group';
    } else if (selectedNodes.some(n => n.type === 'start' || n.type === 'end')) {
      groupDisabledReason = 'Cannot group start or end nodes';
    } else if (selectedNodes.some(n => n.data.parentId)) {
      groupDisabledReason = 'Some nodes are already in a subprocess';
    } else if (selectedNodes.some(n => n.type === 'subprocess')) {
      groupDisabledReason = 'Cannot nest subprocesses';
    } else {
      canGroup = true;
    }

    return {
      selectedNodeIds,
      canGroup,
      groupDisabledReason,
      isSubprocessSelected,
      selectedSubprocessId: selectedSubprocess?.id,
    };
  }, [getNodes]);

  const contextMenuState = getContextMenuState();

  // =============================================================================
  // Sheet Bar
  // =============================================================================

  /**
   * Get sheet info for SheetBar
   */
  const sheets = useMemo((): SheetInfo[] => {
    return nodes
      .filter(n => n.type === 'subprocess')
      .map(n => ({
        id: n.id,
        label: n.data.label || 'Subprocess',
        nodeCount: (n.data.childNodeIds || []).length,
      }));
  }, [nodes]);

  /**
   * Handle sheet selection (null = main view, string = subprocess sheet)
   */
  const handleSheetSelect = useCallback((id: string | null) => {
    if (id === null) {
      closeActiveSheet();
    } else {
      openSubprocessSheet(id);
    }
  }, [openSubprocessSheet, closeActiveSheet]);

  // =============================================================================
  // Visible Nodes & Edges (Sheet-based)
  // =============================================================================

  /**
   * Compute boundary port nodes for sheet view
   */
  const boundaryPortNodes = useMemo(() => {
    if (!activeSheetId) return { inputs: [] as FlowchartNode[], outputs: [] as FlowchartNode[] };

    const inputPorts: FlowchartNode[] = [];
    const outputPorts: FlowchartNode[] = [];

    edges.forEach((edge) => {
      // Incoming edge (external -> subprocess) - input port
      if (edge.target === activeSheetId && edge.originalTarget) {
        const externalNode = nodes.find((n) => n.id === edge.source);
        const portId = `boundary-input-${edge.id}`;
        inputPorts.push({
          id: portId,
          type: 'boundaryPort',
          position: { x: 0, y: 0 }, // Will be positioned later
          measured: { width: 120, height: 32 }, // Provide measured dimensions
          data: {
            label: externalNode?.data?.label || 'Unknown',
            direction: 'input',
            edgeId: edge.id,
            internalNodeId: edge.originalTarget,
            internalHandleId: edge.originalTargetHandle,
          } as BoundaryPortNodeData,
        });
      }

      // Outgoing edge (subprocess -> external) - output port
      if (edge.source === activeSheetId && edge.originalSource) {
        const externalNode = nodes.find((n) => n.id === edge.target);
        const portId = `boundary-output-${edge.id}`;
        outputPorts.push({
          id: portId,
          type: 'boundaryPort',
          position: { x: 0, y: 0 }, // Will be positioned later
          measured: { width: 120, height: 32 }, // Provide measured dimensions
          data: {
            label: externalNode?.data?.label || 'Unknown',
            direction: 'output',
            edgeId: edge.id,
            internalNodeId: edge.originalSource,
            internalHandleId: edge.originalSourceHandle,
          } as BoundaryPortNodeData,
        });
      }
    });

    return { inputs: inputPorts, outputs: outputPorts };
  }, [activeSheetId, edges, nodes]);

  /**
   * Filter nodes to show based on active sheet
   * - Main view (null): show all nodes NOT inside a subprocess
   * - Sheet view (ID): show only children of that subprocess + boundary port nodes
   */
  const visibleNodes = useMemo(() => {
    if (activeSheetId === null) {
      // Main view: show all nodes NOT inside a subprocess
      return nodes.filter((node) => !node.data.parentId);
    }

    // Sheet view: show only children of this subprocess
    const internalNodes = nodes.filter((node) => node.data.parentId === activeSheetId);

    // Get boundary port nodes
    const { inputs, outputs } = boundaryPortNodes;

    // Calculate default positions for boundary port nodes based on internal nodes
    if (internalNodes.length > 0) {
      const minX = Math.min(...internalNodes.map(n => n.position.x));
      const maxX = Math.max(...internalNodes.map(n => n.position.x + (n.measured?.width || 180)));
      const yPositions = internalNodes.map(n => n.position.y);
      const avgY = yPositions.reduce((a, b) => a + b, 0) / yPositions.length;

      // Position input ports on the left side, distributed vertically
      const inputStartY = avgY - ((inputs.length - 1) * 50) / 2;
      inputs.forEach((port, index) => {
        const defaultPos = {
          x: minX - 180,
          y: inputStartY + index * 50,
        };
        // Use stored position if available, otherwise use default
        port.position = boundaryPortPositions[port.id] || defaultPos;
      });

      // Position output ports on the right side, distributed vertically
      const outputStartY = avgY - ((outputs.length - 1) * 50) / 2;
      outputs.forEach((port, index) => {
        const defaultPos = {
          x: maxX + 60,
          y: outputStartY + index * 50,
        };
        // Use stored position if available, otherwise use default
        port.position = boundaryPortPositions[port.id] || defaultPos;
      });
    }

    return [...inputs, ...internalNodes, ...outputs];
  }, [nodes, activeSheetId, boundaryPortNodes, boundaryPortPositions]);

  /**
   * Filter edges to show based on visible nodes
   * Also add virtual edges from boundary ports to internal nodes
   */
  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    // Filter edges between visible internal nodes
    let result = edges.filter((edge) => {
      return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
    });

    // Add virtual edges from boundary port nodes to internal nodes
    if (activeSheetId) {
      // Add input edges: boundary-input-{edgeId} -> originalTarget
      boundaryPortNodes.inputs.forEach((port) => {
        const portData = port.data as BoundaryPortNodeData;
        result.push({
          id: `boundary-edge-input-${portData.edgeId}`,
          source: port.id,
          target: portData.internalNodeId,
          sourceHandle: undefined,
          targetHandle: portData.internalHandleId,
          // Don't specify type - let it inherit from defaultEdgeOptions
          style: { stroke: '#22C55E', strokeWidth: 2, strokeDasharray: '6,3' },
        } as FlowchartEdge);
      });

      // Add output edges: originalSource -> boundary-output-{edgeId}
      boundaryPortNodes.outputs.forEach((port) => {
        const portData = port.data as BoundaryPortNodeData;
        result.push({
          id: `boundary-edge-output-${portData.edgeId}`,
          source: portData.internalNodeId,
          target: port.id,
          sourceHandle: portData.internalHandleId,
          targetHandle: undefined,
          // Don't specify type - let it inherit from defaultEdgeOptions
          style: { stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: '6,3' },
        } as FlowchartEdge);
      });
    }

    return result;
  }, [edges, visibleNodes, activeSheetId, boundaryPortNodes]);

  // =============================================================================
  // Edge Options
  // =============================================================================

  const defaultEdgeOptions = {
    type: defaultEdgeType,
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
    },
    style: {
      strokeWidth: 2,
      stroke: '#6B7280',
    },
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="flex flex-col h-full">
      <div
        ref={reactFlowWrapper}
        className={`flex-1 ${className}`}
        onContextMenu={handleContextMenu}
      >
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={registeredNodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          snapToGrid={snapToGrid}
          snapGrid={[gridSize, gridSize]}
          fitView
          fitViewOptions={{
            padding: 0.2,
          }}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          deleteKeyCode={null} // We handle delete manually
          multiSelectionKeyCode="Shift"
          selectionOnDrag
          panOnDrag={[1, 2]} // Pan with middle or right mouse button
          selectionMode={SelectionMode.Partial}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          className="bg-gray-50"
        >
          {/* Background with dots pattern */}
          {showGrid && (
            <Background
              variant={BackgroundVariant.Dots}
              gap={gridSize}
              size={1}
              color="#D1D5DB"
            />
          )}

          {/* Zoom and pan controls */}
          <Controls
            className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
            showZoom={true}
            showFitView={true}
            showInteractive={true}
          />

          {/* MiniMap for navigation */}
          {showMinimap && (
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'start': return '#10B981';
                  case 'end': return '#EF4444';
                  case 'process': return '#3B82F6';
                  case 'decision': return '#F59E0B';
                  case 'subprocess': return '#8B5CF6';
                  case 'parallel': return '#06B6D4';
                  case 'delay': return '#EC4899';
                  default: return '#6B7280';
                }
              }}
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          )}

          {/* Info Panel */}
          <Panel position="top-right" className="!m-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-500 border border-gray-200 shadow-sm">
              {visibleNodes.length} node{visibleNodes.length !== 1 ? 's' : ''} | {visibleEdges.length} connection{visibleEdges.length !== 1 ? 's' : ''}
              {activeSheetId && (
                <span className="ml-2 text-purple-600">| Sheet view</span>
              )}
            </div>
          </Panel>

          {/* Input/Output Labels for sheet view */}
          {activeSheetId && (visibleNodes.some(n => n.type === 'boundaryPort')) && (
            <>
              {/* Input label header */}
              {visibleNodes.some(n => n.type === 'boundaryPort' && (n.data as BoundaryPortNodeData).direction === 'input') && (
                <Panel position="top-left" className="!m-2 !mt-14">
                  <div className="text-xs text-gray-500 font-medium flex items-center gap-1 bg-white/80 px-2 py-1 rounded shadow-sm">
                    <ArrowLeft className="w-3 h-3" />
                    <span>Inputs</span>
                  </div>
                </Panel>
              )}
              {/* Output label header */}
              {visibleNodes.some(n => n.type === 'boundaryPort' && (n.data as BoundaryPortNodeData).direction === 'output') && (
                <Panel position="top-right" className="!m-2 !mt-14 !mr-48">
                  <div className="text-xs text-gray-500 font-medium flex items-center gap-1 bg-white/80 px-2 py-1 rounded shadow-sm">
                    <span>Outputs</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </Panel>
              )}
            </>
          )}

          {/* Keyboard shortcuts hint */}
          <Panel position="bottom-right" className="!m-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-500 border border-gray-200 shadow-sm">
              <div className="flex flex-col gap-1">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Del</kbd>
                  {' '}Remove selected
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Shift</kbd>
                  {' '}Multi-select
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Ctrl+G</kbd>
                  {' '}Group nodes
                </span>
              </div>
            </div>
          </Panel>
        </ReactFlow>

        {/* Context Menu for grouping/ungrouping */}
        <ContextMenu
          isOpen={contextMenuOpen}
          position={contextMenuPosition}
          onClose={handleCloseContextMenu}
          selectedNodeIds={contextMenuState.selectedNodeIds}
          canGroup={contextMenuState.canGroup}
          groupDisabledReason={contextMenuState.groupDisabledReason}
          isSubprocessSelected={contextMenuState.isSubprocessSelected}
          selectedSubprocessId={contextMenuState.selectedSubprocessId}
        />
      </div>

      {/* Sheet Bar at bottom */}
      <SheetBar
        activeSheetId={activeSheetId}
        sheets={sheets}
        onSheetSelect={handleSheetSelect}
        onSheetClose={closeActiveSheet}
      />
    </div>
  );
}

// =============================================================================
// Flow Canvas Component
// =============================================================================

export default function FlowCanvas(props: FlowCanvasProps) {
  return <FlowCanvasInner {...props} />;
}

// =============================================================================
// Exports
// =============================================================================

export type { FlowCanvasProps };
