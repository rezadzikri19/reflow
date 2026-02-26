import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ScenarioEditor } from './ScenarioEditor';
import {
  useScenarioStore,
  useScenarios,
  useActiveScenarioId,
  useBaselineScenarioId,
} from '../../stores/scenarioStore';
import type { Scenario } from '../../types';

// ============================================================================
// ScenarioItem Component
// ============================================================================

interface ScenarioItemProps {
  scenario: Scenario;
  isActive: boolean;
  isBaseline: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

const ScenarioItem: React.FC<ScenarioItemProps> = ({
  scenario,
  isActive,
  isBaseline,
  onEdit,
  onDelete,
  onSelect,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div
      className={`
        flex items-center justify-between p-3 rounded-lg border
        transition-all duration-150 cursor-pointer
        ${isActive
          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        {/* Color indicator */}
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: scenario.color }}
        />

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{scenario.name}</span>
            {isBaseline && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                Baseline
              </span>
            )}
          </div>
          {isActive && (
            <span className="text-xs text-primary-600">Active</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="text-gray-500 hover:text-gray-700"
        >
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
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </Button>
        <Button
          variant={showDeleteConfirm ? 'danger' : 'ghost'}
          size="sm"
          onClick={handleDelete}
          className={showDeleteConfirm ? '' : 'text-gray-500 hover:text-red-600'}
        >
          {showDeleteConfirm ? (
            'Confirm'
          ) : (
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
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          )}
        </Button>
        {showDeleteConfirm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(false)}
            className="text-gray-500"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ScenarioList Component
// ============================================================================

export const ScenarioList: React.FC = () => {
  const scenarios = useScenarios();
  const activeScenarioId = useActiveScenarioId();
  const baselineScenarioId = useBaselineScenarioId();
  const { addScenario, deleteScenario, setActiveScenario } = useScenarioStore();

  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleAddScenario = () => {
    const newId = addScenario();
    setEditingScenarioId(newId);
    setIsEditorOpen(true);
  };

  const handleEditScenario = (scenarioId: string) => {
    setEditingScenarioId(scenarioId);
    setIsEditorOpen(true);
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    await deleteScenario(scenarioId);
  };

  const handleSelectScenario = (scenarioId: string) => {
    setActiveScenario(scenarioId);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingScenarioId(null);
  };

  const editingScenario = scenarios.find((s) => s.id === editingScenarioId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Scenarios</h3>
        <Button
          variant="primary"
          size="sm"
          onClick={handleAddScenario}
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          Add Scenario
        </Button>
      </div>

      {/* Scenario List */}
      <div className="flex-1 overflow-y-auto">
        {scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
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
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <p className="text-sm">No scenarios yet</p>
            <p className="text-xs text-gray-400">Click "Add Scenario" to create one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scenarios.map((scenario) => (
              <ScenarioItem
                key={scenario.id}
                scenario={scenario}
                isActive={scenario.id === activeScenarioId}
                isBaseline={scenario.id === baselineScenarioId}
                onEdit={() => handleEditScenario(scenario.id)}
                onDelete={() => handleDeleteScenario(scenario.id)}
                onSelect={() => handleSelectScenario(scenario.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scenario Editor Modal */}
      <Modal
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        title="Edit Scenario"
        size="md"
      >
        {editingScenario && (
          <ScenarioEditor
            scenario={editingScenario}
            onSave={handleCloseEditor}
            onCancel={handleCloseEditor}
          />
        )}
      </Modal>
    </div>
  );
};

export default ScenarioList;
