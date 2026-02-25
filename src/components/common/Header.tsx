import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface HeaderProps {
  /** App title */
  title?: string;
  /** Logo element */
  logo?: React.ReactNode;
  /** Left section actions */
  leftActions?: React.ReactNode;
  /** Right section actions */
  rightActions?: React.ReactNode;
  /** Whether to show sidebar toggle */
  showSidebarToggle?: boolean;
  /** Sidebar collapsed state */
  sidebarCollapsed?: boolean;
  /** Callback when sidebar toggle is clicked */
  onSidebarToggle?: () => void;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const Header: React.FC<HeaderProps> = ({
  title = 'Process Flowchart',
  logo,
  leftActions,
  rightActions,
  showSidebarToggle = false,
  sidebarCollapsed = false,
  onSidebarToggle,
  className = '',
}) => {
  return (
    <div className={`h-full px-4 flex items-center justify-between ${className}`}>
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Sidebar Toggle */}
        {showSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sidebarCollapsed ? (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        )}

        {/* Logo */}
        {logo && <div className="flex-shrink-0">{logo}</div>}

        {/* Title */}
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

        {/* Left Actions */}
        {leftActions && <div className="flex items-center gap-2">{leftActions}</div>}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Search (optional) */}
        {/* <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="w-64 px-4 py-1.5 pl-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div> */}

        {/* Right Actions */}
        {rightActions && <div className="flex items-center gap-2">{rightActions}</div>}
      </div>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

export interface HeaderActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const HeaderAction: React.FC<HeaderActionProps> = ({
  children,
  onClick,
  className = '',
}) => (
  <button
    onClick={onClick}
    className={`
      p-2 rounded-md
      text-gray-500 hover:text-gray-700 hover:bg-gray-100
      focus:outline-none focus:ring-2 focus:ring-primary-500
      transition-colors duration-150
      ${className}
    `.replace(/\s+/g, ' ').trim()}
  >
    {children}
  </button>
);

export default Header;
