// =============================================================================
// DateTimePicker Component
// =============================================================================

import React from 'react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

// =============================================================================
// Types
// =============================================================================

export interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  label?: string;
  error?: string;
  minDate?: Date;
  disabled?: boolean;
}

interface PresetOption {
  label: string;
  value: () => Date;
}

// =============================================================================
// Preset Options
// =============================================================================

const PRESETS: PresetOption[] = [
  {
    label: '1 Hour',
    value: () => new Date(Date.now() + 60 * 60 * 1000),
  },
  {
    label: '1 Day',
    value: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  {
    label: '1 Week',
    value: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    label: '1 Month',
    value: () => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d;
    },
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

function dateToLocalDateTimeString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function localDateTimeStringToDate(str: string): Date {
  return new Date(str);
}

// =============================================================================
// Component
// =============================================================================

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  label = 'Expires at',
  error,
  minDate,
  disabled,
}) => {
  const minDateTime = minDate || new Date();
  const minStr = dateToLocalDateTimeString(minDateTime);

  const handlePresetClick = (preset: PresetOption) => {
    onChange(preset.value());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = localDateTimeStringToDate(e.target.value);
    if (!isNaN(date.getTime())) {
      onChange(date);
    }
  };

  const handleClear = () => {
    // Reset to default (1 hour from now)
    onChange(PRESETS[0].value());
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handlePresetClick(preset)}
            disabled={disabled}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* DateTime Input */}
      <div className="flex gap-2">
        <Input
          type="datetime-local"
          value={value ? dateToLocalDateTimeString(value) : ''}
          onChange={handleInputChange}
          min={minStr}
          error={error}
          disabled={disabled}
          fullWidth
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
        >
          Clear
        </Button>
      </div>

      {/* Selected Date Display */}
      {value && (
        <p className="text-sm text-gray-500">
          Selected: {value.toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default DateTimePicker;
