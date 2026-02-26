import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '../common/Button';
import { useNodes } from '../../stores/flowchartStore';
import {
  useScenarioStore,
  useScenarios,
} from '../../stores/scenarioStore';
import {
  useCalculationStore,
  useCalculationResults,
} from '../../stores/calculationStore';
import type { FlowchartNode } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface QuantityInputTableProps {
  className?: string;
  filterTags?: string[];
}

interface EditableCellProps {
  value: number;
  onChange: (value: number) => void;
  calculatedTime?: number;
  nodeUnitTime?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatTime(minutes: number): string {
  if (minutes === 0) return '0m';
  if (minutes < 60) return `${minutes.toFixed(0)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins.toFixed(0)}m`;
}

function formatHours(hours: number): string {
  if (hours === 0) return '0h';
  if (hours < 8) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 8);
  const remainingHours = hours % 8;
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours.toFixed(1)}h`;
}

// ============================================================================
// EditableCell Component
// ============================================================================

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onChange,
  calculatedTime,
  nodeUnitTime,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const handleFocus = () => {
    setIsEditing(true);
    setInputValue(value.toString());
  };

  const handleBlur = () => {
    setIsEditing(false);
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue);
    } else {
      setInputValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(value.toString());
    }
  };

  return (
    <div className="flex flex-col">
      {isEditing ? (
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-20 px-2 py-1 text-sm border border-primary-500 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          autoFocus
          min="0"
          step="1"
        />
      ) : (
        <input
          type="text"
          value={value}
          onFocus={handleFocus}
          readOnly
          className="w-20 px-2 py-1 text-sm border border-transparent hover:border-gray-300 rounded cursor-pointer bg-transparent"
        />
      )}
      {calculatedTime !== undefined && nodeUnitTime !== undefined && nodeUnitTime > 0 && (
        <span className="text-xs text-gray-400 mt-0.5">
          {formatTime(calculatedTime)}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// QuantityInputTable Component
// ============================================================================

export const QuantityInputTable: React.FC<QuantityInputTableProps> = ({
  className = '',
  filterTags = [],
}) => {
  const nodes = useNodes();
  const scenarios = useScenarios();
  const { updateQuantity, saveScenarios } = useScenarioStore();
  const { calculateScenario, calculateAll } = useCalculationStore();
  const calculationResults = useCalculationResults();

  // Get process and delay nodes only (exclude start, end, etc.)
  // Filter by tags if filterTags is provided
  const processNodes = useMemo(() => {
    const baseNodes = nodes.filter(
      (node) => node.data.nodeType === 'process' || node.data.nodeType === 'subprocess' || node.data.nodeType === 'delay'
    );

    // If no filter tags selected, show all process nodes
    if (filterTags.length === 0) {
      return baseNodes;
    }

    // Filter nodes that have at least one matching tag
    return baseNodes.filter((node) => {
      const nodeTags = node.data.tags || [];
      return nodeTags.some((tag) => filterTags.includes(tag));
    });
  }, [nodes, filterTags]);

  // Calculate all scenarios on mount
  React.useEffect(() => {
    if (scenarios.length > 0 && processNodes.length > 0) {
      calculateAll();
    }
  }, [scenarios.length, processNodes.length]);

  // Handle quantity change
  const handleQuantityChange = useCallback(
    (scenarioId: string, nodeId: string, quantity: number) => {
      updateQuantity(scenarioId, nodeId, quantity);
      calculateScenario(scenarioId);
    },
    [updateQuantity, calculateScenario]
  );

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    const headers = ['Node', ...scenarios.map((s) => s.name)];
    const rows = processNodes.map((node) => {
      const row = [node.data.label];
      scenarios.forEach((scenario) => {
        const quantity = scenario.quantities[node.id] || 0;
        row.push(quantity.toString());
      });
      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scenario-quantities.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }, [scenarios, processNodes]);

  // Import from CSV
  const handleImportCSV = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());
      const headers = lines[0].split(',');

      // Map scenario names to IDs
      const scenarioMap = new Map<string, string>();
      scenarios.forEach((s) => scenarioMap.set(s.name, s.id));

      // Parse rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const nodeName = values[0];

        // Find node by name
        const node = processNodes.find((n) => n.data.label === nodeName);
        if (!node) continue;

        // Update quantities for each scenario
        headers.slice(1).forEach((header, index) => {
          const scenarioId = scenarioMap.get(header.trim());
          if (scenarioId && values[index + 1]) {
            const quantity = parseFloat(values[index + 1]);
            if (!isNaN(quantity)) {
              updateQuantity(scenarioId, node.id, quantity);
            }
          }
        });
      }

      // Recalculate all scenarios
      calculateAll();
      saveScenarios();
    };
    input.click();
  }, [scenarios, processNodes, updateQuantity, calculateAll, saveScenarios]);

  // Get calculated time for a node in a scenario
  const getNodeTime = useCallback(
    (scenarioId: string, nodeId: string, node: FlowchartNode): number => {
      const results = useCalculationStore.getState().results.get(scenarioId);
      if (!results) return 0;
      const nodeResult = results.nodeResults.find((nr) => nr.nodeId === nodeId);
      return nodeResult?.totalMinutes || 0;
    },
    []
  );

  if (scenarios.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 text-gray-500 ${className}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-2 text-gray-300"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        <p className="text-sm font-medium">No scenarios available</p>
        <p className="text-xs text-gray-400">Create a scenario to input quantities</p>
      </div>
    );
  }

  if (processNodes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 text-gray-500 ${className}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-2 text-gray-300"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <p className="text-sm font-medium">No process nodes available</p>
        <p className="text-xs text-gray-400">Add process nodes to the flowchart</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header with Import/Export buttons */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleImportCSV}
            leftIcon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            }
          >
            Import CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            }
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Node column header */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Process Node
              </th>
              {/* Scenario column headers */}
              {scenarios.map((scenario) => (
                <th
                  key={scenario.id}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: scenario.color }}
                    />
                    <span>{scenario.name}</span>
                    {scenario.isBaseline && (
                      <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                        B
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processNodes.map((node) => (
              <tr key={node.id} className="hover:bg-gray-50">
                {/* Node name */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {node.data.label}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          node.data.nodeType === 'process'
                            ? 'bg-blue-100 text-blue-700'
                            : node.data.nodeType === 'subprocess'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {node.data.nodeType}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {node.data.unitTimeMinutes} min/unit
                    </span>
                  </div>
                </td>
                {/* Quantity cells for each scenario */}
                {scenarios.map((scenario) => {
                  const quantity = scenario.quantities[node.id] || 0;
                  const calculatedTime =
                    quantity * (node.data.unitTimeMinutes || 0);

                  return (
                    <td key={scenario.id} className="px-4 py-3">
                      <EditableCell
                        value={quantity}
                        onChange={(value) =>
                          handleQuantityChange(scenario.id, node.id, value)
                        }
                        calculatedTime={calculatedTime}
                        nodeUnitTime={node.data.unitTimeMinutes}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {/* Footer with totals */}
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                Total Time
              </td>
              {scenarios.map((scenario) => {
                const results = calculationResults.get(scenario.id);
                const totalMinutes = results?.totalMinutes || 0;

                return (
                  <td key={scenario.id} className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">
                      {formatTime(totalMinutes)}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      {formatHours(totalMinutes / 60)}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Help text */}
      <p className="mt-2 text-xs text-gray-500">
        Click on a cell to edit the quantity. Press Enter to save, Escape to cancel.
      </p>
    </div>
  );
};

export default QuantityInputTable;
