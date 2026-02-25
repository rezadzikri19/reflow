import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label */
  label?: string;
  /** Helper text below the input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Left icon or element */
  leftElement?: React.ReactNode;
  /** Right icon or element */
  rightElement?: React.ReactNode;
  /** Full width input */
  fullWidth?: boolean;
}

// ============================================================================
// Style Configurations
// ============================================================================

const sizeStyles = {
  sm: {
    input: 'px-3 py-1.5 text-sm',
    label: 'text-sm',
  },
  md: {
    input: 'px-4 py-2 text-sm',
    label: 'text-sm',
  },
  lg: {
    input: 'px-4 py-3 text-base',
    label: 'text-base',
  },
};

// ============================================================================
// Component
// ============================================================================

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      size = 'md',
      leftElement,
      rightElement,
      fullWidth = false,
      disabled,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseInputStyles = `
      block rounded-md
      border bg-white
      placeholder-gray-400
      transition-colors duration-150
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    `.replace(/\s+/g, ' ').trim();

    const borderColor = error
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 hover:border-gray-400';

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            className={`block font-medium text-gray-700 mb-1.5 ${sizeStyles[size].label}`}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftElement && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              {leftElement}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`
              ${baseInputStyles}
              ${borderColor}
              ${sizeStyles[size].input}
              ${widthClass}
              ${leftElement ? 'pl-10' : ''}
              ${rightElement ? 'pr-10' : ''}
            `.replace(/\s+/g, ' ').trim()}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
