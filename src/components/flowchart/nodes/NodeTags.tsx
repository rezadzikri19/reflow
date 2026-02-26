import { memo } from 'react';
import { useTagColors } from '../../../hooks/useTagColors';

interface NodeTagsProps {
  /** Array of tag strings to display */
  tags?: string[];
  /** Maximum number of tags to show before truncating */
  maxVisible?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * NodeTags - Displays colored tag indicators on nodes
 * Shows small colored chips for each tag, with overflow indicator
 * Colors are unique within the flowchart
 * Uses white background with colored border for visibility on all node colors
 */
function NodeTags({ tags, maxVisible = 3, className = '' }: NodeTagsProps) {
  const { getTagColor } = useTagColors();

  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {visibleTags.map((tag) => {
        const color = getTagColor(tag);
        return (
          <div
            key={tag}
            className={`w-3 h-3 rounded-full shrink-0 bg-white border-2 ${color.border}`}
            title={tag}
          />
        );
      })}
      {remainingCount > 0 && (
        <span className="text-xs text-white/90 font-medium bg-black/20 px-1.5 py-0.5 rounded">
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

export default memo(NodeTags);
