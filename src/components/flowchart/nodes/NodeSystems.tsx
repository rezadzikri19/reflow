import { memo } from 'react';
import { Monitor } from 'lucide-react';
import { useTagColors } from '../../../hooks/useTagColors';

interface NodeSystemsProps {
  /** Systems to display */
  systems?: string[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * NodeSystems - Displays systems indicator on nodes
 * Shows badges/pills with system names and monitor icon
 * Each system gets a unique color based on tag colors
 */
function NodeSystems({ systems = [], className = '' }: NodeSystemsProps) {
  const { getTagColor } = useTagColors();

  if (systems.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {systems.map((system) => {
        const color = getTagColor(system);
        return (
          <span
            key={system}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-full ${color.bg} ${color.text} whitespace-nowrap shadow-sm`}
            title={`System: ${system}`}
          >
            <Monitor className="w-3.5 h-3.5" />
            {system}
          </span>
        );
      })}
    </div>
  );
}

export default memo(NodeSystems);
