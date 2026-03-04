import { memo } from 'react';
import { User } from 'lucide-react';
import { useRoleColors } from '../../../hooks/useRoleColors';

interface NodeRoleProps {
  /** Role string to display */
  role?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * NodeRole - Displays role indicator on nodes
 * Shows a small chip with the role name and user icon
 * Each role gets a unique color across the flowchart
 */
function NodeRole({ role, className = '' }: NodeRoleProps) {
  const { getRoleColor } = useRoleColors();

  if (!role) {
    return null;
  }

  const color = getRoleColor(role);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-white/90 ${color.text} border ${color.border} whitespace-nowrap`}
        title={`Role: ${role}`}
      >
        <User className={`w-3 h-3 shrink-0 ${color.text}`} />
        <span>{role}</span>
      </div>
    </div>
  );
}

export default memo(NodeRole);
