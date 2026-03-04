import { Lock } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface LockIndicatorProps {
  /** Whether the node is locked */
  locked?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * LockIndicator - Small lock icon overlay shown on locked nodes
 * Displays in the top-right corner with a gray circular background
 */
export function LockIndicator({ locked }: LockIndicatorProps) {
  if (!locked) return null;

  return (
    <div
      className="absolute -top-1.5 -right-1.5 z-10"
      title="This node is locked and cannot be moved"
    >
      <div className="bg-gray-500 rounded-full p-0.5 shadow-sm">
        <Lock className="w-3 h-3 text-white" />
      </div>
    </div>
  );
}

export default LockIndicator;
