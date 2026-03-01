import React, { useState, useCallback, useMemo } from 'react';
import { useFlowchartStore, useSelectedNode, useNodes } from '../../stores/flowchartStore';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TagInput } from '../common/TagInput';
import type { ProcessNodeData, UnitType, ProcessNodeType, ManualPort } from '../../types';
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

const NODE_TYPE_LABELS: Record<ProcessNodeType, string> = {
  start: 'Start',
  end: 'End',
  process: 'Process',
  decision: 'Decision',
  subprocess: 'Subprocess',
  parallel: 'Parallel',
  delay: 'Delay',
};

// ============================================================================
// Component
// ============================================================================

export const NodePropertiesPanel: React.FC = () => {
  const selectedNode = useSelectedNode();
  const nodes = useNodes();
  const updateNode = useFlowchartStore((state) => state.updateNode);
  const deleteNode = useFlowchartStore((state) => state.deleteNode);
  const addNode = useFlowchartStore((state) => state.addNode);
  const addManualPort = useFlowchartStore((state) => state.addManualPort);
  const updateManualPort = useFlowchartStore((state) => state.updateManualPort);
  const deleteManualPort = useFlowchartStore((state) => state.deleteManualPort);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get all existing tags from all nodes for autocomplete suggestions
  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach((node) => {
      const nodeTags = (node.data as ProcessNodeData).tags || [];
      nodeTags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [nodes]);

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
        updateNode(selectedNode.id, {
          requiresFTE: e.target.checked,
          ftePerUnit: e.target.checked ? (selectedNode.data.ftePerUnit || 1) : undefined,
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

  const handleParallelCapacityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNode) {
        const value = parseInt(e.target.value, 10) || 1;
        updateNode(selectedNode.id, { parallelCapacity: value });
      }
    },
    [selectedNode, updateNode]
  );

  const handleDelayDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNode) {
        const value = parseFloat(e.target.value) || 0;
        updateNode(selectedNode.id, { unitTimeMinutes: value });
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
      addNode(selectedNode.data.nodeType, {
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

  const nodeData = selectedNode.data as ProcessNodeData;
  const nodeType = nodeData.nodeType;
  const isProcessNode = nodeType === 'process' || nodeType === 'subprocess';
  const isDelayNode = nodeType === 'delay';
  const isParallelNode = nodeType === 'parallel';

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
            <Input
              label="Label"
              value={nodeData.label}
              onChange={handleLabelChange}
              fullWidth
              placeholder="Enter node label"
            />

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Description
              </label>
              <textarea
                id="description"
                value={nodeData.description || ''}
                onChange={handleDescriptionChange}
                rows={3}
                className="block w-full rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm placeholder-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter node description"
              />
            </div>
          </div>
        </section>

        {/* Tags Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Tags
          </h3>
          <TagInput
            label=""
            value={nodeData.tags || []}
            onChange={handleTagsChange}
            suggestions={allExistingTags}
            placeholder="Add a tag..."
            helperText="Press Enter or comma to add a tag"
          />
        </section>

        {/* Process Node Properties */}
        {isProcessNode && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Process Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="unitType"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Unit Type
                </label>
                <select
                  id="unitType"
                  value={nodeData.unitType}
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
                value={nodeData.unitTimeMinutes}
                onChange={handleUnitTimeChange}
                fullWidth
                helperText="Time to process one unit"
              />

              <Input
                label="Default Quantity"
                type="number"
                min={0}
                step={1}
                value={nodeData.defaultQuantity}
                onChange={handleDefaultQuantityChange}
                fullWidth
                helperText="Default number of units"
              />
            </div>
          </section>
        )}

        {/* Delay Node Properties */}
        {isDelayNode && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Delay Settings
            </h3>
            <div className="space-y-4">
              <Input
                label="Delay Duration (minutes)"
                type="number"
                min={0}
                step={0.1}
                value={nodeData.unitTimeMinutes}
                onChange={handleDelayDurationChange}
                fullWidth
                helperText="Duration of the delay"
              />
            </div>
          </section>
        )}

        {/* FTE Settings (for Process and Subprocess nodes) */}
        {isProcessNode && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              FTE Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiresFTE"
                  checked={nodeData.requiresFTE}
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

              {nodeData.requiresFTE && (
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

        {/* Parallel Capacity (for Parallel nodes) */}
        {isParallelNode && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Parallel Settings
            </h3>
            <div className="space-y-4">
              <Input
                label="Parallel Capacity"
                type="number"
                min={1}
                step={1}
                value={nodeData.parallelCapacity || 1}
                onChange={handleParallelCapacityChange}
                fullWidth
                helperText="Number of parallel processes"
              />
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

        {/* Manual Ports Section (for Subprocess nodes only) */}
        {nodeType === 'subprocess' && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Manual Ports
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Add ports that exist independently of connections. Useful for defining interfaces before connecting.
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
                  onClick={() => addManualPort(selectedNode.id, 'input')}
                  className="!p-1 !h-auto"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {(nodeData.manualInputPorts || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No manual input ports</p>
                ) : (
                  (nodeData.manualInputPorts || []).map((port: ManualPort) => (
                    <div
                      key={port.id}
                      className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-2 py-1.5"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                      <input
                        type="text"
                        value={port.label}
                        onChange={(e) => updateManualPort(selectedNode.id, port.id, { label: e.target.value })}
                        className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700"
                        placeholder="Port name"
                      />
                      <button
                        onClick={() => deleteManualPort(selectedNode.id, port.id)}
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
                  onClick={() => addManualPort(selectedNode.id, 'output')}
                  className="!p-1 !h-auto"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {(nodeData.manualOutputPorts || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No manual output ports</p>
                ) : (
                  (nodeData.manualOutputPorts || []).map((port: ManualPort) => (
                    <div
                      key={port.id}
                      className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-2 py-1.5"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                      <input
                        type="text"
                        value={port.label}
                        onChange={(e) => updateManualPort(selectedNode.id, port.id, { label: e.target.value })}
                        className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700"
                        placeholder="Port name"
                      />
                      <button
                        onClick={() => deleteManualPort(selectedNode.id, port.id)}
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
