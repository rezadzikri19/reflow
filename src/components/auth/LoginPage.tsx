// =============================================================================
// LoginPage Component
// =============================================================================

import React, { useState } from 'react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Logo } from '../common/Logo';
import { useAuthStore } from '../../stores/authStore';

// =============================================================================
// Types
// =============================================================================

type LoginTab = 'token' | 'admin';

// =============================================================================
// Component
// =============================================================================

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LoginTab>('token');
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const { isLoading, error, tokenLogin, adminLogin, clearError } = useAuthStore();

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    await tokenLogin(token.trim());
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    await adminLogin(username.trim(), password.trim());
  };

  const handleTabChange = (tab: LoginTab) => {
    setActiveTab(tab);
    clearError();
    setToken('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" showSubtitle />
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => handleTabChange('token')}
              className={`
                flex-1 py-3 px-4 text-sm font-medium text-center
                transition-colors duration-150
                ${activeTab === 'token'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              Token Login
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('admin')}
              className={`
                flex-1 py-3 px-4 text-sm font-medium text-center
                transition-colors duration-150
                ${activeTab === 'admin'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              Admin Login
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {activeTab === 'token' ? (
              <form onSubmit={handleTokenSubmit}>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your access token to continue.
                </p>
                <Input
                  type="text"
                  label="Access Token"
                  placeholder="Enter your token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  error={error || undefined}
                  fullWidth
                  disabled={isLoading}
                />
                <div className="mt-6">
                  <Button
                    type="submit"
                    fullWidth
                    isLoading={isLoading}
                    disabled={!token.trim()}
                  >
                    Login
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdminSubmit}>
                <p className="text-sm text-gray-600 mb-4">
                  Admin access for token management.
                </p>
                <div className="space-y-4">
                  <Input
                    type="text"
                    label="Username"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    fullWidth
                  />
                  <Input
                    type="password"
                    label="Password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={error || undefined}
                    disabled={isLoading}
                    fullWidth
                  />
                </div>
                <div className="mt-6">
                  <Button
                    type="submit"
                    fullWidth
                    isLoading={isLoading}
                    disabled={!username.trim() || !password.trim()}
                  >
                    Login as Admin
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-sm text-gray-500">
          Contact your administrator for access tokens
        </p>
        <p className="mt-3 text-center text-xs text-gray-400">
          Made by <span className="font-medium">The Almighty Redzik</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
