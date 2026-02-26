import React from 'react';
import { useTagColors } from '../../hooks/useTagColors';

// ============================================================================
// Types
// ============================================================================

export interface TagFilterProps {
  /** All available tags from nodes */
  availableTags: string[];
  /** Currently selected filter tags */
  selectedTags: string[];
  /** Callback when selection changes */
  onSelectionChange: (tags: string[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export const TagFilter: React.FC<TagFilterProps> = ({
  availableTags = [],
  selectedTags = [],
  onSelectionChange,
}) => {
  const { getTagColor } = useTagColors();

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onSelectionChange(selectedTags.filter((t) => t !== tag));
    } else {
      onSelectionChange([...selectedTags, tag]);
    }
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  if (availableTags.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Filter by Tags</h3>
        {selectedTags.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear All
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {availableTags.sort().map((tag) => {
          const isSelected = selectedTags.includes(tag);
          const color = getTagColor(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`
                inline-flex items-center px-3 py-1 text-sm font-medium rounded-full
                transition-colors duration-150
                ${isSelected
                  ? `${color.solid} text-white`
                  : `${color.bg} ${color.text} ${color.hover}`
                }
              `}
            >
              {tag}
              {isSelected && (
                <svg
                  className="ml-1.5 w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {selectedTags.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Showing nodes with any of the selected tags
        </p>
      )}
    </div>
  );
};

export default TagFilter;
