import React, { useState, useCallback, useMemo } from 'react';
import { useUpdateNodeInternals } from '@xyflow/react';
import { useFlowchartStore, useSelectedNode, useNodes } from '../../stores/flowchartStore';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TagInput } from '../common/TagInput';
import { AnnotationPropertiesPanel } from './AnnotationPropertiesPanel';
import type { ProcessNodeData, UnitType, FrequencyType, ProcessNodeType, Port, AnnotationNodeData } from '../../types';
import { Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface UnitTypeOption {
  value: UnitType;
  label: string;
}

// ============================================================================
// Constants
// ============================================================================

const UNIT_TYPE_OPTIONS: UnitTypeOption[] = [
  { value: 'documents', label: 'Documents' },
  { value: 'applications', label: 'Applications' },
  { value: 'cases', label: 'Cases' },
  { value: 'customers', label: 'Customers' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'custom', label: 'Custom' },
];

interface FrequencyOption {
  value: FrequencyType;
  label: string;
}

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'asNeeded', label: 'As Needed' },
];

const NODE_TYPE_LABELS: Record<ProcessNodeType, string> = {
  start: 'Start',
  end: 'End',
  process: 'Process',
  manualProcess: 'Manual Process',
  decision: 'Decision',
  subprocess: 'Subprocess',
  boundaryPort: 'Boundary Port',
  junction: 'Junction',
  reference: 'Reference',
  connector: 'Connector',
  terminator: 'Terminator',
};

// Default colors for each node type
const NODE_TYPE_DEFAULT_COLORS: Record<ProcessNodeType, string> = {
  start: '#10b981',    // Emerald
  end: '#ef4444',      // Red
  process: '#3b82f6', // Blue
  manualProcess: '#f97316', // Orange
  decision: '#f59e0b', // Amber
  subprocess: '#8b5cf6', // Purple
  boundaryPort: '#10b981', // Green (input)
  junction: '#7c3aed', // Violet
  reference: '#0ea5e9', // Sky
  connector: '#14b8a6', // Teal
  terminator: '#f43f5e', // Rose
};

// Preset colors for node customization (includes all node type defaults)
const PRESET_NODE_COLORS = [
  { name: 'Blue (Process)', value: '#3b82f6', nodeType: 'process' },
  { name: 'Amber (Decision)', value: '#f59e0b', nodeType: 'decision' },
  { name: 'Purple (Subprocess)', value: '#8b5cf6', nodeType: 'subprocess' },
  { name: 'Emerald (Start)', value: '#10b981', nodeType: 'start' },
  { name: 'Red (End)', value: '#ef4444', nodeType: 'end' },
  { name: 'Orange (Manual)', value: '#f97316', nodeType: 'manualProcess' },
  { name: 'Rose (Terminator)', value: '#f43f5e', nodeType: 'terminator' },
  { name: 'Violet (Junction)', value: '#7c3aed', nodeType: 'junction' },
  { name: 'Teal (Connector)', value: '#14b8a6', nodeType: 'connector' },
  { name: 'Sky (Reference)', value: '#0ea5e9', nodeType: 'reference' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Gray', value: '#6b7280' },
];

// ============================================================================
// Component
// ============================================================================

export const NodePropertiesPanel: React.FC = () => {
  const selectedNode = useSelectedNode();
  const nodes = useNodes();
  const edges = useFlowchartStore((state) => state.edges);
  const updateNode = useFlowchartStore((state) => state.updateNode);
  const deleteNode = useFlowchartStore((state) => state.deleteNode);
  const addNode = useFlowchartStore((state) => state.addNode);
  const addManualPort = useFlowchartStore((state) => state.addManualPort);
  const updateManualPort = useFlowchartStore((state) => state.updateManualPort);
  const deleteManualPort = useFlowchartStore((state) => state.deleteManualPort);
  const updateEdge = useFlowchartStore((state) => state.updateEdge);
  const deleteEdge = useFlowchartStore((state) => state.deleteEdge);
  const updateNodeInternals = useUpdateNodeInternals();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get referenced node info for reference nodes
  const referencedNodeInfo = useMemo(() => {
    if (!selectedNode || (selectedNode.data as ProcessNodeData).nodeType !== 'reference') {
      return { id: undefined, node: undefined, label: undefined, role: undefined };
    }
    const referencedNodeId = (selectedNode.data as { referencedNodeId?: string }).referencedNodeId;
    const referencedNode = nodes.find(n => n.id === referencedNodeId);
    return {
      id: referencedNodeId,
      node: referencedNode,
      label: referencedNode ? (referencedNode.data as ProcessNodeData).label : undefined,
      role: referencedNode ? (referencedNode.data as ProcessNodeData).role : undefined,
    };
  }, [selectedNode, nodes]);

  // Get all existing tags from all nodes for autocomplete suggestions
  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach((node) => {
      const nodeTags = (node.data as ProcessNodeData).tags || [];
      nodeTags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [nodes]);

  // Get all existing documents from all nodes for autocomplete suggestions
  const allExistingDocuments = useMemo(() => {
    const docSet = new Set<string>();
    nodes.forEach((node) => {
      const nodeDocs = (node.data as ProcessNodeData).documents || [];
      nodeDocs.forEach((doc) => docSet.add(doc));
    });
    return Array.from(docSet).sort();
  }, [nodes]);

  // Get all existing data elements from all nodes for autocomplete suggestions
  const allExistingData = useMemo(() => {
    const dataSet = new Set<string>();
    nodes.forEach((node) => {
      const nodeData = (node.data as ProcessNodeData).data || [];
      nodeData.forEach((d) => dataSet.add(d));
    });
    return Array.from(dataSet).sort();
  }, [nodes]);

  // Get all existing roles from all nodes for autocomplete suggestions
  const allExistingRoles = useMemo(() => {
    const roleSet = new Set<string>();
    nodes.forEach((node) => {
      const rawRole = (node.data as ProcessNodeData).role;
      // Handle backward compatibility: role could be string or string[]
      const nodeRoles: string[] = Array.isArray(rawRole)
        ? rawRole
        : rawRole
          ? [rawRole]
          : [];
      nodeRoles.forEach((r) => roleSet.add(r));
    });
    return Array.from(roleSet).sort();
  }, [nodes]);

  // Get all existing systems from all nodes for autocomplete suggestions
  const allExistingSystems = useMemo(() => {
    const systemSet = new Set<string>();
    nodes.forEach((node) => {
      const nodeSystems = (node.data as ProcessNodeData).systems || [];
      nodeSystems.forEach((s) => systemSet.add(s));
    });
    return Array.from(systemSet).sort();
  }, [nodes]);

  // Compute all ports (edge-based + stored) for subprocess nodes
  const { allInputPorts, allOutputPorts } = useMemo(() => {
    if (!selectedNode || (selectedNode.data as ProcessNodeData).nodeType !== 'subprocess') {
      return { allInputPorts: [], allOutputPorts: [] };
    }

    const nodeId = selectedNode.id;
    const nodeData = selectedNode.data as ProcessNodeData;
    const inputs: { id: string; label: string; edgeId?: string; direction: 'input' | 'output'; handlePosition?: 'top' | 'bottom' | 'left' | 'right' }[] = [];
    const outputs: { id: string; label: string; edgeId?: string; direction: 'input' | 'output'; handlePosition?: 'top' | 'bottom' | 'left' | 'right' }[] = [];

    // Create maps of stored ports by ID for quick lookup
    const storedInputPorts = new Map((nodeData.inputPorts || []).map(p => [p.id, p]));
    const storedOutputPorts = new Map((nodeData.outputPorts || []).map(p => [p.id, p]));

    // Add edge-based ports
    edges.forEach((edge) => {
      // Incoming edge (external -> subprocess) - input port
      if (edge.target === nodeId && (edge.originalTarget || edge.originalTargets)) {
        const portId = edge.targetHandle || `port-in-${edge.id}`;
        const internalTargets = edge.originalTargets || [
          { nodeId: edge.originalTarget!, handleId: edge.originalTargetHandle }
        ];
        const internalNode = nodes.find(n => n.id === internalTargets[0].nodeId);
        const defaultLabel = internalNode ? (internalNode.data as ProcessNodeData).label || internalTargets[0].nodeId : internalTargets[0].nodeId;

        // Check if there's a stored port with this ID
        const storedPort = storedInputPorts.get(portId);

        inputs.push({
          id: portId,
          label: (edge.data as { portLabel?: string })?.portLabel || defaultLabel,
          edgeId: edge.id,
          direction: 'input',
          handlePosition: storedPort?.handlePosition,
        });
      }

      // Outgoing edge (subprocess -> external) - output port
      if (edge.source === nodeId && (edge.originalSource || edge.originalSources)) {
        const portId = edge.sourceHandle || `port-out-${edge.id}`;
        const internalSources = edge.originalSources || [
          { nodeId: edge.originalSource!, handleId: edge.originalSourceHandle }
        ];
        const internalNode = nodes.find(n => n.id === internalSources[0].nodeId);
        const defaultLabel = internalNode ? (internalNode.data as ProcessNodeData).label || internalSources[0].nodeId : internalSources[0].nodeId;

        // Check if there's a stored port with this ID
        const storedPort = storedOutputPorts.get(portId);

        outputs.push({
          id: portId,
          label: (edge.data as { portLabel?: string })?.portLabel || defaultLabel,
          edgeId: edge.id,
          direction: 'output',
          handlePosition: storedPort?.handlePosition,
        });
      }
    });

    // Add stored ports that weren't added as edge-based ports
    const existingInputIds = new Set(inputs.map(p => p.id));
    const existingOutputIds = new Set(outputs.map(p => p.id));

    (nodeData.inputPorts || []).forEach((port: Port) => {
      if (!existingInputIds.has(port.id)) {
        inputs.push({
          id: port.id,
          label: port.label || 'Input',
          direction: 'input',
          handlePosition: port.handlePosition,
        });
      }
    });

    (nodeData.outputPorts || []).forEach((port: Port) => {
      if (!existingOutputIds.has(port.id)) {
        outputs.push({
          id: port.id,
          label: port.label || 'Output',
          direction: 'output',
          handlePosition: port.handlePosition,
        });
      }
    });

    return { allInputPorts: inputs, allOutputPorts: outputs };
  }, [selectedNode, edges, nodes]);

  // Handler for updating port label
  const handlePortLabelChange = useCallback((port: { id: string; label: string; edgeId?: string; direction: 'input' | 'output' }, newLabel: string) => {
    if (!selectedNode) return;

    if (port.edgeId) {
      // Edge-based port: update the edge's portLabel
      const edge = edges.find(e => e.id === port.edgeId);
      if (edge) {
        updateEdge(port.edgeId, { data: { ...(edge.data as Record<string, unknown>), portLabel: newLabel } });
      }
    } else {
      // Stored port: update the port's label
      updateManualPort(selectedNode.id, port.id, { label: newLabel });
    }
  }, [selectedNode, updateManualPort, updateEdge, edges]);

  // Handler for updating port handle position
  const handlePortPositionChange = useCallback((port: { id: string; edgeId?: string; direction: 'input' | 'output' }, newPosition: 'top' | 'bottom' | 'left' | 'right') => {
    if (!selectedNode) return;

    // Stored ports (including auto-generated ones from grouping) can have position changed
    // Edge-based ports that have a corresponding stored port can also be updated
    updateManualPort(selectedNode.id, port.id, { handlePosition: newPosition });
    // Force React Flow to recalculate handle positions
    updateNodeInternals(selectedNode.id);
  }, [selectedNode, updateManualPort, updateNodeInternals]);

  // Handler for deleting port
  const handlePortDelete = useCallback((port: { id: string; label: string; edgeId?: string; direction: 'input' | 'output' }) => {
    if (!selectedNode) return;

    if (port.edgeId) {
      // For edge-based ports, just delete the edge
      deleteEdge(port.edgeId);
    } else {
      // For stored ports, delete the port
      deleteManualPort(selectedNode.id, port.id);
    }
    // Force React Flow to recalculate handle positions
    updateNodeInternals(selectedNode.id);
  }, [selectedNode, deleteManualPort, deleteEdge, updateNodeInternals]);

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { label: e.target.value });
      }
    },
    [selectedNode, updateNode]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { description: e.target.value });
      }
    },
    [selectedNode, updateNode]
  );

  const handleColorChange = useCallback(
    (color: string | undefined) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { color });
      }
    },
    [selectedNode, updateNode]
  );

  const handlePainPointsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { painPoints: e.target.value });
      }
    },
    [selectedNode, updateNode]
  );

  const handleImprovementChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { improvement: e.target.value });
      }
    },
    [selectedNode, updateNode]
  );

  const handleFrequencyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { frequency: e.target.value as FrequencyType });
      }
    },
    [selectedNode, updateNode]
  );

  const handleUnitTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (selectedNode) {
        updateNode(selectedNode.id, {
          unitType: e.target.value as UnitType,
          customUnitName: e.target.value === 'custom' ? '' : undefined,
        });
      }
    },
    [selectedNode, updateNode]
  );

  const handleCustomUnitNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { customUnitName: e.target.value });
      }
    },
    [selectedNode, updateNode]
  );

  const handleUnitTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNode) {
        const value = parseFloat(e.target.value) || 0;
        updateNode(selectedNode.id, { unitTimeMinutes: value });
      }
    },
    [selectedNode, updateNode]
  );

  const handleDefaultQuantityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNode) {
        const value = parseInt(e.target.value, 10) || 0;
        updateNode(selectedNode.id, { defaultQuantity: value });
      }
    },
    [selectedNode, updateNode]
  );

  const handleRequiresFTEChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNode) {
        const nodeData = selectedNode.data as ProcessNodeData;
        updateNode(selectedNode.id, {
          requiresFTE: e.target.checked,
          ftePerUnit: e.target.checked ? (nodeData.ftePerUnit || 1) : undefined,
        });
      }
    },
    [selectedNode, updateNode]
  );

  const handleFTEPerUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNode) {
        const value = parseFloat(e.target.value) || 0;
        updateNode(selectedNode.id, { ftePerUnit: value });
      }
    },
    [selectedNode, updateNode]
  );

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (selectedNode) {
      deleteNode(selectedNode.id);
      setShowDeleteConfirm(false);
    }
  }, [selectedNode, deleteNode]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const handleDuplicateNode = useCallback(() => {
    if (selectedNode) {
      const offset = 50;
      const nodeData = selectedNode.data as ProcessNodeData;
      addNode(nodeData.nodeType, {
        x: selectedNode.position.x + offset,
        y: selectedNode.position.y + offset,
      });
    }
  }, [selectedNode, addNode]);

  const handleTagsChange = useCallback(
    (tags: string[]) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { tags });
      }
    },
    [selectedNode, updateNode]
  );

  const handleDocumentsChange = useCallback(
    (documents: string[]) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { documents });
      }
    },
    [selectedNode, updateNode]
  );

  const handleDataChange = useCallback(
    (data: string[]) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { data });
      }
    },
    [selectedNode, updateNode]
  );

  const handleSystemsChange = useCallback(
    (systems: string[]) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { systems });
      }
    },
    [selectedNode, updateNode]
  );

  const handleRiskChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { risk: e.target.value });
      }
    },
    [selectedNode, updateNode]
  );

  const handleRoleChange = useCallback(
    (role: string[]) => {
      if (selectedNode) {
        updateNode(selectedNode.id, { role });
      }
    },
    [selectedNode, updateNode]
  );

  // No node selected state
  if (!selectedNode) {
    return (
      <div className="h-full bg-white border-l border-gray-200 p-6 flex flex-col items-center justify-center">
        <div className="text-gray-400 text-center">
          <svg
            className="mx-auto h-12 w-12 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
          <p className="text-sm font-medium text-gray-500">No node selected</p>
          <p className="text-xs text-gray-400 mt-1">
            Click on a node to edit its properties
          </p>
        </div>
      </div>
    );
  }

  // Check if this is an annotation node
  const isAnnotationNode = selectedNode.type?.startsWith('annotation');

  if (isAnnotationNode) {
    return (
      <AnnotationPropertiesPanel
        nodeId={selectedNode.id}
        nodeData={selectedNode.data as AnnotationNodeData}
      />
    );
  }

  const nodeData = selectedNode.data as ProcessNodeData;
  const nodeType = nodeData.nodeType;
  // All regular nodes (not annotations) can have process properties
  const supportsAllProperties = true; // All non-annotation nodes support full properties

  return (
    <div className="h-full bg-white border-l border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Node Properties</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Type: {NODE_TYPE_LABELS[nodeType]}
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            {NODE_TYPE_LABELS[nodeType]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Basic Properties Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Basic Properties
          </h3>
          <div className="space-y-4">
            {/* Reference nodes have auto-synced labels - show as read-only */}
            {nodeType === 'reference' ? (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">Label (auto-synced)</p>
                <p className="text-sm text-gray-800">{nodeData.label}</p>
                <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
              </div>
            ) : (
              <Input
                label="Label"
                value={nodeData.label}
                onChange={handleLabelChange}
                fullWidth
                placeholder="Enter node label"
              />
            )}

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Description
              </label>
              {nodeType === 'reference' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <p className="text-sm text-gray-800">{nodeData.description || 'None'}</p>
                  <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
                </div>
              ) : (
                <textarea
                  id="description"
                  value={nodeData.description || ''}
                  onChange={handleDescriptionChange}
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm placeholder-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter node description"
                />
              )}
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Color
              </label>
              {nodeType === 'reference' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Preset Colors */}
                  <div className="flex flex-wrap gap-2">
                    {PRESET_NODE_COLORS.map((preset) => {
                      const isDefaultForType = NODE_TYPE_DEFAULT_COLORS[nodeType] === preset.value;
                      const isSelected = nodeData.color === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => handleColorChange(preset.value)}
                          className={`
                            w-8 h-8 rounded-md border-2 transition-all hover:scale-110
                            ${isSelected || (!nodeData.color && isDefaultForType)
                              ? 'border-gray-800 ring-2 ring-gray-400'
                              : 'border-gray-200'
                            }
                          `}
                          style={{ backgroundColor: preset.value }}
                          title={preset.name}
                        />
                      );
                    })}
                  </div>
                  {/* Custom Color Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={nodeData.color && !PRESET_NODE_COLORS.some(p => p.value === nodeData.color) ? nodeData.color : NODE_TYPE_DEFAULT_COLORS[nodeType]}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={nodeData.color || ''}
                      onChange={(e) => handleColorChange(e.target.value)}
                      placeholder={NODE_TYPE_DEFAULT_COLORS[nodeType]}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                    {nodeData.color && (
                      <button
                        type="button"
                        onClick={() => handleColorChange(undefined)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Tags Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Tags
          </h3>
          {nodeType === 'reference' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Tags (auto-synced)</p>
              <div className="flex flex-wrap gap-1">
                {(nodeData.tags || []).length > 0 ? (
                  nodeData.tags!.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
            </div>
          ) : (
            <TagInput
              label=""
              value={nodeData.tags || []}
              onChange={handleTagsChange}
              suggestions={allExistingTags}
              placeholder="Add a tag..."
              helperText="Press Enter or comma to add a tag"
            />
          )}
        </section>

        {/* Documents Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Documents
          </h3>
          {nodeType === 'reference' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Documents (auto-synced)</p>
              <div className="flex flex-wrap gap-1">
                {(nodeData.documents || []).length > 0 ? (
                  nodeData.documents!.map((doc) => (
                    <span key={doc} className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                      {doc}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
            </div>
          ) : (
            <TagInput
              label=""
              value={nodeData.documents || []}
              onChange={handleDocumentsChange}
              suggestions={allExistingDocuments}
              placeholder="Add a document..."
              helperText="Press Enter or comma to add a document"
            />
          )}
        </section>

        {/* Data Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Data
          </h3>
          {nodeType === 'reference' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Data (auto-synced)</p>
              <div className="flex flex-wrap gap-1">
                {(nodeData.data || []).length > 0 ? (
                  nodeData.data!.map((d) => (
                    <span key={d} className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                      {d}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
            </div>
          ) : (
            <TagInput
              label=""
              value={nodeData.data || []}
              onChange={handleDataChange}
              suggestions={allExistingData}
              placeholder="Add a data element..."
              helperText="Press Enter or comma to add a data element"
            />
          )}
        </section>

        {/* Systems Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Systems
          </h3>
          {nodeType === 'reference' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Systems (auto-synced)</p>
              <div className="flex flex-wrap gap-1">
                {(nodeData.systems || []).length > 0 ? (
                  nodeData.systems!.map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
            </div>
          ) : (
            <TagInput
              label=""
              value={nodeData.systems || []}
              onChange={handleSystemsChange}
              suggestions={allExistingSystems}
              placeholder="Add a system..."
              helperText="Press Enter or comma to add a system"
            />
          )}
        </section>

        {/* Pain Points Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Pain Points
          </h3>
          {nodeType === 'reference' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Pain Points (auto-synced)</p>
              <p className="text-sm text-gray-800">{nodeData.painPoints || 'None'}</p>
              <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
            </div>
          ) : (
            <div>
              <textarea
                id="painPoints"
                value={nodeData.painPoints || ''}
                onChange={handlePainPointsChange}
                rows={3}
                className="block w-full rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm placeholder-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Current issues, bottlenecks, or inefficiencies"
              />
            </div>
          )}
        </section>

        {/* Improvement Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Improvement
          </h3>
          {nodeType === 'reference' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Improvement (auto-synced)</p>
              <p className="text-sm text-gray-800">{nodeData.improvement || 'None'}</p>
              <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
            </div>
          ) : (
            <div>
              <textarea
                id="improvement"
                value={nodeData.improvement || ''}
                onChange={handleImprovementChange}
                rows={3}
                className="block w-full rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm placeholder-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Proposed optimizations, automation ideas, or solutions"
              />
            </div>
          )}
        </section>

        {/* Risk Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Risk
          </h3>
          {nodeType === 'reference' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Risk (auto-synced)</p>
              <p className="text-sm text-gray-800">{nodeData.risk || 'None'}</p>
              <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
            </div>
          ) : (
            <div>
              <textarea
                id="risk"
                value={nodeData.risk || ''}
                onChange={handleRiskChange}
                rows={3}
                className="block w-full rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm placeholder-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Potential risks or concerns associated with this process"
              />
            </div>
          )}
        </section>

        {/* Frequency Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Frequency
          </h3>
          {nodeType === 'reference' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Frequency (auto-synced)</p>
              <p className="text-sm text-gray-800 capitalize">{nodeData.frequency || 'None'}</p>
              <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
            </div>
          ) : (
            <div>
              <label
                htmlFor="frequency"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                How often is this process performed?
              </label>
              <select
              id="frequency"
              value={nodeData.frequency || ''}
              onChange={handleFrequencyChange}
              className="block w-full rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select frequency...</option>
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            </div>
          )}
        </section>

        {/* Role Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Role
          </h3>
          {nodeType === 'reference' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Role (auto-synced)</p>
              <p className="text-sm text-gray-800">
                {(() => {
                  if (!referencedNodeInfo.node) return 'None';
                  const rawRole = (referencedNodeInfo.node.data as ProcessNodeData).role;
                  const roles: string[] = Array.isArray(rawRole) ? rawRole : rawRole ? [rawRole] : [];
                  return roles.join(', ') || 'None';
                })()}
              </p>
              <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
            </div>
          ) : (
            <TagInput
              label=""
              value={Array.isArray(nodeData.role) ? nodeData.role : nodeData.role ? [nodeData.role] : []}
              onChange={handleRoleChange}
              suggestions={allExistingRoles}
              placeholder="Add roles..."
              helperText="Assign responsibility roles to this node"
            />
          )}
        </section>

        {/* Process Node Properties */}
        {supportsAllProperties && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Process Settings
            </h3>
            <div className="space-y-4">
              {nodeType === 'reference' ? (
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">Unit Type (auto-synced)</p>
                    <p className="text-sm text-gray-800">
                      {UNIT_TYPE_OPTIONS.find(o => o.value === nodeData.unitType)?.label || nodeData.unitType || 'Documents'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
                  </div>
                  {nodeData.unitType === 'custom' && (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                      <p className="text-xs text-gray-500 font-medium mb-1">Custom Unit Name (auto-synced)</p>
                      <p className="text-sm text-gray-800">{nodeData.customUnitName || 'None'}</p>
                      <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
                    </div>
                  )}
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">Unit Time (auto-synced)</p>
                    <p className="text-sm text-gray-800">{nodeData.unitTimeMinutes ?? 0} minutes</p>
                    <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">Default Quantity (auto-synced)</p>
                    <p className="text-sm text-gray-800">{nodeData.defaultQuantity ?? 1}</p>
                    <p className="text-xs text-gray-400 mt-1">Synced with referenced node</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="unitType"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Unit Type
                    </label>
                    <select
                      id="unitType"
                      value={nodeData.unitType || 'documents'}
                      onChange={handleUnitTypeChange}
                      className="block w-full rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {UNIT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {nodeData.unitType === 'custom' && (
                    <Input
                      label="Custom Unit Name"
                      value={nodeData.customUnitName || ''}
                      onChange={handleCustomUnitNameChange}
                      fullWidth
                      placeholder="Enter custom unit name"
                    />
                  )}

                  <Input
                    label="Unit Time (minutes)"
                    type="number"
                    min={0}
                    step={0.1}
                    value={nodeData.unitTimeMinutes ?? 0}
                    onChange={handleUnitTimeChange}
                    fullWidth
                    helperText="Time to process one unit"
                  />

                  <Input
                    label="Default Quantity"
                    type="number"
                    min={0}
                    step={1}
                    value={nodeData.defaultQuantity ?? 1}
                    onChange={handleDefaultQuantityChange}
                    fullWidth
                    helperText="Default number of units"
                  />
                </>
              )}
            </div>
          </section>
        )}

        {/* FTE Settings */}
        {supportsAllProperties && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              FTE Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiresFTE"
                  checked={nodeData.requiresFTE ?? false}
                  onChange={handleRequiresFTEChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="requiresFTE"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Requires FTE
                </label>
              </div>

              {(nodeData.requiresFTE ?? false) && (
                <Input
                  label="FTE Per Unit"
                  type="number"
                  min={0}
                  step={0.01}
                  value={nodeData.ftePerUnit || 0}
                  onChange={handleFTEPerUnitChange}
                  fullWidth
                  helperText="Full-time equivalents per unit"
                />
              )}
            </div>
          </section>
        )}

        {/* Reference Node Properties */}
        {nodeType === 'reference' && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Reference Settings
            </h3>
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-md p-3">
                <p className="text-xs text-sky-600 font-medium mb-1">Referenced Node</p>
                {referencedNodeInfo.node ? (
                  <p className="text-sm text-sky-800">
                    {referencedNodeInfo.label || referencedNodeInfo.id}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No node referenced
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Actions
          </h3>
          <div className="space-y-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleDuplicateNode}
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              }
            >
              Duplicate Node
            </Button>

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
                Delete Node
              </Button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
                <p className="text-sm text-red-700 font-medium">
                  Are you sure you want to delete this node?
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

        {/* Ports Section (for Subprocess nodes only) */}
        {nodeType === 'subprocess' && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Ports
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Add ports to define connection points for the subprocess.
            </p>

            {/* Input Ports */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <ArrowLeft className="w-4 h-4 text-green-500" />
                  <span>Input Ports</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    addManualPort(selectedNode.id, 'input');
                    updateNodeInternals(selectedNode.id);
                  }}
                  className="!p-1 !h-auto"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {allInputPorts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No input ports</p>
                ) : (
                  allInputPorts.map((port) => (
                    <div
                      key={port.id}
                      className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-2 py-1.5"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                      <input
                        type="text"
                        value={port.label}
                        onChange={(e) => handlePortLabelChange(port, e.target.value)}
                        className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700"
                        placeholder="Port name"
                      />
                      {/* Position selector - for ports with handlePosition (stored or auto-generated) */}
                      {port.handlePosition !== undefined && (
                        <select
                          value={port.handlePosition || 'left'}
                          onChange={(e) => handlePortPositionChange(port, e.target.value as 'top' | 'bottom' | 'left' | 'right')}
                          className="text-xs bg-white border border-gray-300 rounded px-1 py-0.5 text-gray-600"
                          title="Port position"
                        >
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                        </select>
                      )}
                      <button
                        onClick={() => handlePortDelete(port)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete port"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Output Ports */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <ArrowRight className="w-4 h-4 text-blue-500" />
                  <span>Output Ports</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    addManualPort(selectedNode.id, 'output');
                    updateNodeInternals(selectedNode.id);
                  }}
                  className="!p-1 !h-auto"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {allOutputPorts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No output ports</p>
                ) : (
                  allOutputPorts.map((port) => (
                    <div
                      key={port.id}
                      className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-2 py-1.5"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                      <input
                        type="text"
                        value={port.label}
                        onChange={(e) => handlePortLabelChange(port, e.target.value)}
                        className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700"
                        placeholder="Port name"
                      />
                      {/* Position selector - for ports with handlePosition (stored or auto-generated) */}
                      {port.handlePosition !== undefined && (
                        <select
                          value={port.handlePosition || 'right'}
                          onChange={(e) => handlePortPositionChange(port, e.target.value as 'top' | 'bottom' | 'left' | 'right')}
                          className="text-xs bg-white border border-gray-300 rounded px-1 py-0.5 text-gray-600"
                          title="Port position"
                        >
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                        </select>
                      )}
                      <button
                        onClick={() => handlePortDelete(port)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete port"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default NodePropertiesPanel;
