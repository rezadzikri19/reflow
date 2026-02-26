import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface LayoutProps {
  /** Header content */
  header?: React.ReactNode;
  /** Sidebar content */
  sidebar?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Whether sidebar is collapsed */
  sidebarCollapsed?: boolean;
  /** Callback when sidebar collapsed state changes */
  onSidebarCollapse?: (collapsed: boolean) => void;
  /** Additional className for the layout */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const Layout: React.FC<LayoutProps> = ({
  header,
  sidebar,
  children,
  sidebarCollapsed = false,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      {header && (
        <header className="fixed top-0 right-0 left-0 z-40 h-16 bg-white border-b border-gray-200">
          {header}
        </header>
      )}

      {/* Main Layout Container */}
      <div className="flex pt-16">
        {/* Sidebar */}
        {sidebar && (
          <aside
            className={`
              fixed left-0 top-16 bottom-0 z-30
              bg-white border-r border-gray-200
              transition-all duration-300 ease-in-out
              ${sidebarCollapsed ? 'w-16' : 'w-64'}
            `.replace(/\s+/g, ' ').trim()}
          >
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <main
          className={`
            flex-1 min-h-[calc(100vh-4rem)]
            transition-all duration-300 ease-in-out
            ${sidebar ? (sidebarCollapsed ? 'ml-16' : 'ml-64') : ''}
          `.replace(/\s+/g, ' ').trim()}
        >
          <div className="">{children}</div>
        </main>
      </div>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

export interface LayoutContentProps {
  children: React.ReactNode;
  className?: string;
}

export const LayoutContent: React.FC<LayoutContentProps> = ({ children, className = '' }) => (
  <div className={`flex-1 ${className}`}>{children}</div>
);

export default Layout;
