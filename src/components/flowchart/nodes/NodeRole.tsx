import { memo } from 'react';
import { User } from 'lucide-react';
import { useRoleColors } from '../../../hooks/useRoleColors';

interface NodeRoleProps {
  /** Roles to display (supports string or string[] for backward compatibility) */
  role?: string[] | string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * NodeRole - Displays role indicator on nodes
 * Shows badges/pills with role names and user icon
 * Each role gets a unique color across the flowchart
 */
function NodeRole({ role, className = '' }: NodeRoleProps) {
  const { getRoleColor } = useRoleColors();

  // Handle backward compatibility: role could be string or string[]
  const roles: string[] = Array.isArray(role)
    ? role
    : role
      ? [role]
      : [];

  if (roles.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {roles.map((r) => {
        const color = getRoleColor(r);
        return (
          <span
            key={r}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-full ${color.bg} ${color.text} whitespace-nowrap shadow-sm`}
            title={`Role: ${r}`}
          >
            <User className="w-3.5 h-3.5" />
            {r}
          </span>
        );
      })}
    </div>
  );
}

export default memo(NodeRole);
