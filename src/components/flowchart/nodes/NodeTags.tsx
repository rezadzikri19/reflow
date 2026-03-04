import { memo, useState, useRef, useEffect } from 'react';
import { useTagColors } from '../../../hooks/useTagColors';

type IndicatorType = 'tags' | 'documents' | 'data';

interface NodeTagsProps {
  /** Array of tag strings to display */
  tags?: string[];
  /** Maximum number of tags to show before truncating */
  maxVisible?: number;
  /** Additional CSS classes */
  className?: string;
  /** Label to show in the expanded tooltip (e.g., "Tags", "Documents", "Data") */
  label?: string;
  /** Type of indicator - determines the shape */
  type?: IndicatorType;
}

/**
 * NodeTags - Displays colored tag indicators on nodes
 * Shows small colored chips for each tag, with overflow indicator
 * On hover, displays an expanded list of all items
 * Colors are unique within the flowchart
 * Uses white background with colored border for visibility on all node colors
 */
function NodeTags({ tags, maxVisible = 3, className = '', label = 'Tags', type = 'tags' }: NodeTagsProps) {
  const { getTagColor } = useTagColors();
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');

  useEffect(() => {
    if (isHovered && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // If the container is in the bottom half of the viewport, show tooltip above
      if (rect.top > viewportHeight / 2) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, [isHovered]);

  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  // Get shape classes based on type
  const getShapeClasses = (color: { border: string }) => {
    const baseClasses = 'shrink-0 bg-white border-2 transition-transform hover:scale-110';
    switch (type) {
      case 'documents':
        // Square shape for documents
        return `w-3 h-3 rounded-sm ${baseClasses} ${color.border}`;
      case 'data':
        // Diamond shape for data (rotated square)
        return `w-2.5 h-2.5 rounded-sm ${baseClasses} ${color.border} rotate-45`;
      default:
        // Circle shape for tags
        return `w-3 h-3 rounded-full ${baseClasses} ${color.border}`;
    }
  };

  // Get indicator icon/label based on type
  const getIndicatorIcon = () => {
    switch (type) {
      case 'documents':
        return (
          <svg className="w-3 h-3 text-white/70" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
      case 'data':
        return (
          <svg className="w-3 h-3 text-white/70" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3 text-white/70" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center gap-1 flex-wrap ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Type indicator icon */}
      {getIndicatorIcon()}

      {visibleTags.map((tag) => {
        const color = getTagColor(tag);
        return (
          <div
            key={tag}
            className={getShapeClasses(color)}
          />
        );
      })}
      {remainingCount > 0 && (
        <span className="text-xs text-white/90 font-medium bg-black/20 px-1.5 py-0.5 rounded">
          +{remainingCount}
        </span>
      )}

      {/* Expanded tooltip on hover */}
      {isHovered && (
        <div
          className={`
            absolute z-50 left-1/2 -translate-x-1/2
            ${position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'}
            min-w-[120px] max-w-[200px]
            bg-white rounded-lg shadow-lg border border-gray-200
            p-2 animate-in fade-in duration-150
          `}
          style={{
            animation: 'fadeIn 150ms ease-out',
          }}
        >
          {/* Label header */}
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 pb-1 border-b border-gray-100">
            {label}
          </div>

          {/* Tag list */}
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => {
              const color = getTagColor(tag);
              return (
                <span
                  key={tag}
                  className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${color.bg} ${color.text}
                  `}
                  title={tag}
                >
                  <span className="truncate max-w-[150px]">{tag}</span>
                </span>
              );
            })}
          </div>

          {/* Arrow pointer */}
          <div
            className={`
              absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-gray-200
              ${position === 'bottom' ? '-top-1 border-l border-t rotate-45' : '-bottom-1 border-r border-b rotate-45'}
            `}
          />
        </div>
      )}
    </div>
  );
}

export default memo(NodeTags);
