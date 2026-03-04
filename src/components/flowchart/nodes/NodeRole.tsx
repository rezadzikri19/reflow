import { memo } from 'react';
import { User } from 'lucide-react';

interface NodeRoleProps {
  /** Role string to display */
  role?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * NodeRole - Displays role indicator on nodes
 * Shows a small chip with the role name and user icon
 * Uses purple color scheme to distinguish from tags
 */
function NodeRole({ role, className = '' }: NodeRoleProps) {
  if (!role) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-white/90 text-purple-700 border border-purple-400 shrink-0"
        title={`Role: ${role}`}
      >
        <User className="w-3 h-3" />
        <span className="truncate max-w-[80px]">{role}</span>
      </div>
    </div>
  );
}

export default memo(NodeRole);
