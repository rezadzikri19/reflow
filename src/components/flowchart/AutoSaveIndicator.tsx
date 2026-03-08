import React, { useMemo } from 'react';
import { useAutoSaveStatus } from '../../stores/autoSaveStore';
import { useIsDirty } from '../../stores/flowchartStore';

/**
 * Displays the auto-save status indicator.
 * Shows "Saving...", "Unsaved changes", "Saved X ago", or nothing based on state.
 */
export const AutoSaveIndicator: React.FC = () => {
  const status = useAutoSaveStatus();
  const isDirty = useIsDirty();

  const timeAgo = useMemo(() => {
    if (!status.lastSaveTime) return null;

    const now = new Date();
    const diffMs = now.getTime() - new Date(status.lastSaveTime).getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return new Date(status.lastSaveTime).toLocaleDateString();
    }
  }, [status.lastSaveTime]);

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status.isSaving) {
    return (
      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
        <svg
          className="animate-spin h-3 w-3"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Saving...
      </span>
    );
  }

  // Show unsaved indicator when there are pending changes
  if (isDirty) {
    return (
      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
        <svg
          className="h-3 w-3"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Unsaved changes
      </span>
    );
  }

  if (!status.lastSaveTime) {
    return null;
  }

  return (
    <span
      className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-default"
      title={`Last saved at ${formatTime(status.lastSaveTime)}`}
    >
      <svg
        className="h-3 w-3"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Saved {timeAgo}
    </span>
  );
};

export default AutoSaveIndicator;
