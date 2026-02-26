import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useScenarioStore } from '../../stores/scenarioStore';
import type { Scenario } from '../../types';
import { SCENARIO_COLORS } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface ScenarioEditorProps {
  scenario: Scenario;
  onSave: () => void;
  onCancel: () => void;
}

// ============================================================================
// ColorPicker Component
// ============================================================================

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Color</label>
      <div className="flex flex-wrap gap-2">
        {SCENARIO_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`
              w-8 h-8 rounded-full transition-all duration-150
              ${value === color
                ? 'ring-2 ring-offset-2 ring-primary-500 scale-110'
                : 'hover:scale-105'
              }
            `}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <label className="text-sm text-gray-500">Custom:</label>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-300"
        />
        <span className="text-sm text-gray-500 font-mono">{value}</span>
      </div>
    </div>
  );
};

// ============================================================================
// ScenarioEditor Component
// ============================================================================

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  scenario,
  onSave,
  onCancel,
}) => {
  const { updateScenario, setBaselineScenario, baselineScenarioId } = useScenarioStore();

  const [name, setName] = useState(scenario.name);
  const [color, setColor] = useState(scenario.color);
  const [isBaseline, setIsBaseline] = useState(scenario.isBaseline);
  const [nameError, setNameError] = useState<string | null>(null);

  // Reset form when scenario changes
  useEffect(() => {
    setName(scenario.name);
    setColor(scenario.color);
    setIsBaseline(scenario.isBaseline);
    setNameError(null);
  }, [scenario]);

  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setNameError('Scenario name is required');
      return false;
    }
    if (value.length > 50) {
      setNameError('Scenario name must be 50 characters or less');
      return false;
    }
    setNameError(null);
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    validateName(value);
  };

  const handleSave = () => {
    if (!validateName(name)) {
      return;
    }

    // Update scenario properties
    updateScenario(scenario.id, {
      name: name.trim(),
      color,
    });

    // Handle baseline change
    if (isBaseline && baselineScenarioId !== scenario.id) {
      setBaselineScenario(scenario.id);
    } else if (!isBaseline && baselineScenarioId === scenario.id) {
      // If unchecking baseline, set to null (or could set to first other scenario)
      setBaselineScenario(null);
    }

    onSave();
  };

  const handleCancel = () => {
    // Reset to original values
    setName(scenario.name);
    setColor(scenario.color);
    setIsBaseline(scenario.isBaseline);
    setNameError(null);
    onCancel();
  };

  return (
    <div className="space-y-6">
      {/* Name Input */}
      <Input
        label="Scenario Name"
        value={name}
        onChange={handleNameChange}
        error={nameError || undefined}
        placeholder="Enter scenario name"
        fullWidth
      />

      {/* Color Picker */}
      <ColorPicker value={color} onChange={setColor} />

      {/* Baseline Toggle */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isBaseline}
            onChange={(e) => setIsBaseline(e.target.checked)}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Set as Baseline</span>
            <p className="text-xs text-gray-500">
              The baseline scenario is used as a reference for comparison
            </p>
          </div>
        </label>
      </div>

      {/* Scenario Info */}
      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
        <div className="flex justify-between mb-1">
          <span>Created:</span>
          <span>{new Date(scenario.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Last Updated:</span>
          <span>{new Date(scenario.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default ScenarioEditor;
