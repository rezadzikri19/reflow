// =============================================================================
// TokenGeneratorPage Component
// =============================================================================

import React, { useState } from 'react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { DateTimePicker } from './DateTimePicker';
import { generateToken } from '../../utils/token';
import type { TokenGenOptions } from '../../types/auth';

// =============================================================================
// Types
// =============================================================================

interface GeneratedTokenInfo {
  token: string;
  expiresAt: Date;
  label?: string;
}

// =============================================================================
// Component
// =============================================================================

export const TokenGeneratorPage: React.FC = () => {
  const [label, setLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date>(() => {
    // Default to 1 day from now
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [generatedToken, setGeneratedToken] = useState<GeneratedTokenInfo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    // Validate expiration date
    if (expiresAt <= new Date()) {
      setError('Expiration date must be in the future');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const options: TokenGenOptions = {
        expiresAt,
        ...(label.trim() && { label: label.trim() }),
      };

      const token = await generateToken(options);
      setGeneratedToken({
        token,
        expiresAt,
        label: label.trim() || undefined,
      });
    } catch {
      setError('Failed to generate token');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedToken) return;

    try {
      await navigator.clipboard.writeText(generatedToken.token);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = generatedToken.token;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleReset = () => {
    setGeneratedToken(null);
    setLabel('');
    setExpiresAt(() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Generate Access Token</h1>
        <p className="text-gray-600 mb-8">
          Create a new access token that users can use to log in to the application.
        </p>

        {/* Generation Form */}
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Label */}
          <Input
            label="Label (optional)"
            placeholder="e.g., John's token"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            helperText="Add a label to help identify this token later"
            fullWidth
          />

          {/* Expiration */}
          <DateTimePicker
            value={expiresAt}
            onChange={setExpiresAt}
            label="Token Expiration"
            error={error || undefined}
            minDate={new Date()}
          />

          {/* Generate Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              isLoading={isGenerating}
              fullWidth
            >
              Generate Token
            </Button>
            {generatedToken && (
              <Button
                variant="secondary"
                onClick={handleReset}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Generated Token Display */}
        {generatedToken && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated Token</h2>

            {/* Token Display */}
            <div className="flex gap-2">
              <Input
                value={generatedToken.token}
                readOnly
                fullWidth
                leftElement={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                }
              />
              <Button
                variant={copySuccess ? 'primary' : 'secondary'}
                onClick={handleCopy}
              >
                {copySuccess ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            {/* Token Info */}
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Expires:</span>{' '}
                {generatedToken.expiresAt.toLocaleString()}
              </p>
              {generatedToken.label && (
                <p className="text-gray-600">
                  <span className="font-medium">Label:</span> {generatedToken.label}
                </p>
              )}
            </div>

            {/* Warning */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Share this token with the user. They will not be able to
                retrieve it later. The token will expire on {generatedToken.expiresAt.toLocaleDateString()}.
              </p>
            </div>
          </div>
        )}

        {/* Token Format Info */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Token Format</h3>
          <p className="text-xs text-gray-500">
            Tokens are self-contained and signed using HMAC-SHA256. Each token includes an embedded
            expiration timestamp and optional label. Users simply enter the token on the login page
            to access the application.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokenGeneratorPage;
