import React, { useState, useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Common components
import { Layout, Button, Modal, ModalBody, ModalFooter, Logo } from './components/common';

// Flowchart components
import {
  FlowCanvas,
  FlowToolbar,
  NodePalette,
  NodePropertiesPanel,
  EdgePropertiesPanel,
} from './components/flowchart';

// List View components
import { ListView } from './components/listview';

// Auth components
import { LoginPage, TokenGeneratorPage } from './components/auth';

// Stores
import { useFlowchartStore, useShowGrid, useShowMinimap } from './stores/flowchartStore';
import {
  useAuthStore,
  useIsAuthenticated,
  useIsAdmin,
  useSessionExpiry,
} from './stores/authStore';

// Hooks
import { useAutoSave } from './hooks/useAutoSave';

// Context
import { FlowOrderProvider } from './contexts/FlowOrderContext';

// ============================================================================
// Types
// ============================================================================

type ViewType = 'flowchart' | 'list' | 'tokenGenerator';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

// Warning threshold: 1 day before expiry
const SESSION_WARNING_THRESHOLD = 24 * 60 * 60 * 1000; // 1 day in milliseconds

const NAV_ITEMS: NavItem[] = [
  {
    id: 'flowchart',
    label: 'Flowchart',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    id: 'list',
    label: 'List',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'tokenGenerator',
    label: 'Token Generator',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
    adminOnly: true,
  },
];

// ============================================================================
// Navigation Tabs Component
// ============================================================================

interface NavTabsProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  isAdmin: boolean;
}

const NavTabs: React.FC<NavTabsProps> = ({ activeView, onViewChange, isAdmin }) => {
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex items-center gap-1">
      {visibleItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
            transition-colors duration-150
            ${activeView === item.id
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }
          `}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

// ============================================================================
// Flowchart View Component
// ============================================================================

const FlowchartView: React.FC = () => {
  const showGrid = useShowGrid();
  const showMinimap = useShowMinimap();
  const toggleGrid = useFlowchartStore((state) => state.toggleGrid);
  const toggleMinimap = useFlowchartStore((state) => state.toggleMinimap);
  const selectedEdgeId = useFlowchartStore((state) => state.selectedEdgeId);

  // Initialize auto-save hook
  useAutoSave();

  // Check if any edge is selected (using store's selectedEdgeId which tracks both regular and virtual edges)
  const selectedEdge = selectedEdgeId;

  return (
    <ReactFlowProvider>
      <div className="flex h-full">
        {/* Left Panel - Node Palette - Fixed width, scrollable */}
        <div className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <NodePalette />
        </div>

        {/* Center - Flow Canvas - Flexible width */}
        <div className="flex-1 min-w-0 flex flex-col">
          <FlowToolbar
            showGrid={showGrid}
            showMinimap={showMinimap}
            onToggleGrid={toggleGrid}
            onToggleMinimap={toggleMinimap}
          />
          <div className="flex-1 min-w-0">
            <FlowCanvas showGrid={showGrid} showMinimap={showMinimap} />
          </div>
        </div>

        {/* Right Panel - Properties - Fixed width, scrollable */}
        <div className="w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          {selectedEdge ? (
            <EdgePropertiesPanel />
          ) : (
            <NodePropertiesPanel />
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
};

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  const [activeView, setActiveView] = useState<ViewType>('flowchart');
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const warningShownRef = useRef(false);

  const nodes = useFlowchartStore((state) => state.nodes);
  const edges = useFlowchartStore((state) => state.edges);

  // Auth state
  const { isInitialized, initialize, logout } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const isAdmin = useIsAdmin();
  const sessionExpiry = useSessionExpiry();

  // Check if session is expiring soon
  const isExpiringSoon = sessionExpiry && sessionExpiry.timeRemaining <= SESSION_WARNING_THRESHOLD;

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Check for session expiry periodically
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkExpiry = () => {
      if (sessionExpiry && sessionExpiry.timeRemaining <= 0) {
        logout();
      }
    };

    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAuthenticated, sessionExpiry, logout]);

  // Show warning modal when session is expiring soon (once per mount)
  useEffect(() => {
    if (isExpiringSoon && !warningShownRef.current) {
      warningShownRef.current = true;
      setShowExpiryWarning(true);
    }
  }, [isExpiringSoon]);

  // Listen for navigation events from ListView
  useEffect(() => {
    const handleNavigateToFlowchart = () => {
      setActiveView('flowchart');
    };

    window.addEventListener('navigateToFlowchart', handleNavigateToFlowchart);
    return () => {
      window.removeEventListener('navigateToFlowchart', handleNavigateToFlowchart);
    };
  }, []);

  // Show loading state during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'flowchart':
        return <FlowchartView />;
      case 'list':
        return <ListView />;
      case 'tokenGenerator':
        return <TokenGeneratorPage />;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    logout();
    setActiveView('flowchart');
  };

  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const header = (
    <div className="h-full px-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Logo size="sm" />
        <NavTabs
          activeView={activeView}
          onViewChange={setActiveView}
          isAdmin={isAdmin}
        />
      </div>
      <div className="flex items-center gap-4">
        {sessionExpiry && (
          <>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isAdmin
                ? 'bg-purple-100 text-purple-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {sessionExpiry.name}
            </span>
            {isExpiringSoon ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Expires in {formatTimeRemaining(sessionExpiry.timeRemaining)}
              </span>
            ) : (
              <span className="text-sm text-gray-400">
                Session expires: {sessionExpiry.expiresAt.toLocaleString()}
              </span>
            )}
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          leftIcon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
        >
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <ReactFlowProvider>
      <FlowOrderProvider nodes={nodes} edges={edges}>
        <Layout header={header}>
          <div className="h-full overflow-hidden">
            {renderView()}
          </div>
        </Layout>

        {/* Session Expiry Warning Modal */}
        <Modal
          open={showExpiryWarning}
          onOpenChange={(open) => setShowExpiryWarning(open)}
          title="Session Expiring Soon"
        >
          <ModalBody>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  {isAdmin ? (
                    <>
                      Your admin session will expire in <strong>{formatTimeRemaining(sessionExpiry?.timeRemaining || 0)}</strong>.
                      You'll need to log in again with your admin credentials.
                    </>
                  ) : (
                    <>
                      Your session will expire in <strong>{formatTimeRemaining(sessionExpiry?.timeRemaining || 0)}</strong>.
                      Please ask your administrator for a new access token to continue using the application.
                    </>
                  )}
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowExpiryWarning(false)}>
              Dismiss
            </Button>
            <Button onClick={handleLogout}>
              Logout Now
            </Button>
          </ModalFooter>
        </Modal>
      </FlowOrderProvider>
    </ReactFlowProvider>
  );
}

export default App;
