import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface SidebarProps {
  /** Navigation items (alternative to children) */
  items?: SidebarItem[];
  /** Currently active item ID */
  activeItemId?: string;
  /** Callback when item is clicked */
  onItemClick?: (itemId: string) => void;
  /** Whether sidebar is collapsed */
  collapsed?: boolean;
  /** Header content */
  header?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Children content (alternative to items) */
  children?: React.ReactNode;
}

export interface SidebarItem {
  /** Unique item ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon element */
  icon?: React.ReactNode;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Badge count or text */
  badge?: number | string;
  /** Sub-items */
  children?: SidebarItem[];
  /** onClick handler (overrides default onItemClick) */
  onClick?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const Sidebar: React.FC<SidebarProps> = ({
  items = [],
  activeItemId,
  onItemClick,
  collapsed = false,
  header,
  footer,
  className = '',
  children,
}) => {
  const handleItemClick = (item: SidebarItem) => {
    if (item.disabled) return;
    if (item.onClick) {
      item.onClick();
    } else if (onItemClick) {
      onItemClick(item.id);
    }
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      {header && (
        <div className="p-4 border-b border-gray-200">
          {header}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {children ? (
          children
        ) : (
          <ul className="space-y-1 px-2">
            {items.map((item) => (
              <li key={item.id}>
                <SidebarNavItem
                  item={item}
                  isActive={activeItemId === item.id}
                  collapsed={collapsed}
                  onClick={() => handleItemClick(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="p-4 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

interface SidebarNavItemProps {
  item: SidebarItem;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  item,
  isActive,
  collapsed,
  onClick,
}) => {
  const baseStyles = `
    flex items-center gap-3
    px-3 py-2
    rounded-md
    text-sm font-medium
    transition-colors duration-150
    focus:outline-none focus:ring-2 focus:ring-primary-500
  `.replace(/\s+/g, ' ').trim();

  const activeStyles = isActive
    ? 'bg-primary-50 text-primary-700'
    : 'text-gray-700 hover:bg-gray-100';

  const disabledStyles = item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      onClick={onClick}
      disabled={item.disabled}
      className={`${baseStyles} ${activeStyles} ${disabledStyles} w-full`}
      title={collapsed ? item.label : undefined}
    >
      {item.icon && (
        <span className="flex-shrink-0 w-5 h-5">{item.icon}</span>
      )}
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge !== undefined && (
            <span
              className={`
                px-2 py-0.5
                text-xs font-medium
                rounded-full
                ${typeof item.badge === 'number' && item.badge > 0
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600'
                }
              `.replace(/\s+/g, ' ').trim()}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
      {collapsed && item.badge !== undefined && typeof item.badge === 'number' && item.badge > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
      )}
    </button>
  );
};

// ============================================================================
// Sidebar Section Component
// ============================================================================

export interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  collapsed?: boolean;
  className?: string;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  children,
  collapsed = false,
  className = '',
}) => {
  if (collapsed) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`py-4 ${className}`}>
      {title && (
        <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div>{children}</div>
    </div>
  );
};

export default Sidebar;
