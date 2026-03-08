import React from 'react';

// =============================================================================
// Types
// =============================================================================

export interface LogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show subtitle/tagline */
  showSubtitle?: boolean;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = false,
  className = '',
}) => {
  const sizeConfig = {
    sm: {
      icon: 'w-6 h-6',
      text: 'text-lg',
      subtitle: 'text-xs',
    },
    md: {
      icon: 'w-8 h-8',
      text: 'text-2xl',
      subtitle: 'text-sm',
    },
    lg: {
      icon: 'w-12 h-12',
      text: 'text-3xl',
      subtitle: 'text-sm',
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Flowchart Icon */}
      <div className={`${config.icon} flex-shrink-0`}>
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Top node */}
          <rect x="11" y="2" width="10" height="8" rx="2" className="fill-primary-500" />
          {/* Connection lines */}
          <path
            d="M16 10V14M16 14L8 20M16 14L24 20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-primary-400"
          />
          {/* Bottom left node */}
          <rect x="3" y="20" width="10" height="8" rx="2" className="fill-primary-500" />
          {/* Bottom right node */}
          <rect x="19" y="20" width="10" height="8" rx="2" className="fill-primary-600" />
          {/* Center diamond (flow symbol) */}
          <path
            d="M16 12L19 15L16 18L13 15Z"
            className="fill-primary-400"
          />
        </svg>
      </div>

      {/* Text */}
      <div className="flex flex-col">
        <span className={`${config.text} font-bold text-gray-900 tracking-tight`}>
          <span className="text-primary-600">Re</span>flow
        </span>
        {showSubtitle && (
          <span className={`${config.subtitle} text-gray-500 -mt-0.5`}>
            Flowchart Application
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
