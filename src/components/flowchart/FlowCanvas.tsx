import { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
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
import { useFlowchartStore } from '../../stores/flowchartStore';
import type { FlowchartNode, FlowchartEdge, ProcessNodeType } from '../../types';

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
      // Apply changes to get updated nodes
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
    [nodes, readOnly, deleteNode, setSelectedNode, selectedNodeId, setNodes, markDirty]
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
    (_event: React.MouseEvent, node: FlowchartNode) => {
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
   * Handle keyboard events (delete selected elements)
   */
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Delete or Backspace key
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Don't delete if we're editing an input
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }

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

      // Escape key deselects
      if (event.key === 'Escape') {
        setSelectedNode(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, getNodes, getEdges, deleteNodes, deleteEdges, setSelectedNode]);

  // =============================================================================
  // MiniMap Node Color
  // =============================================================================

  const minimapNodeColor = useCallback((node: FlowchartNode) => {
    switch (node.type) {
      case 'start':
        return '#10B981'; // green
      case 'end':
        return '#EF4444'; // red
      case 'process':
        return '#3B82F6'; // blue
      case 'decision':
        return '#F59E0B'; // amber
      case 'subprocess':
        return '#8B5CF6'; // violet
      case 'parallel':
        return '#06B6D4'; // cyan
      case 'delay':
        return '#EC4899'; // pink
      default:
        return '#6B7280'; // gray
    }
  }, []);

  // =============================================================================
  // Edge Options
  // =============================================================================

  const defaultEdgeOptions = {
    type: 'smoothstep',
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
    <div
      ref={reactFlowWrapper}
      className={`w-full h-full ${className}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={registeredNodeTypes}
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
            {nodes.length} node{nodes.length !== 1 ? 's' : ''} | {edges.length} connection{edges.length !== 1 ? 's' : ''}
          </div>
        </Panel>

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
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// =============================================================================
// Flow Canvas Component (with ReactFlowProvider)
// =============================================================================

export default function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

// =============================================================================
// Exports
// =============================================================================

export type { FlowCanvasProps };
