import React, { forwardRef, useState } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
  shape?: 'rounded' | 'pill';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconClick,
  shape = 'rounded',
  className = '',
  type = 'text',
  id,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`lumina-input-container ${className}`}>
      {label && (
        <label htmlFor={inputId} className="lumina-input-label">
          {label}
        </label>
      )}
      <div className={`lumina-input-wrapper lumina-input-wrapper-${shape} ${isFocused ? 'lumina-input-focused' : ''} ${error ? 'lumina-input-error-state' : ''}`}>
        {leftIcon && (
          <span className={`material-symbols-outlined lumina-input-left-icon ${isFocused ? 'icon-active' : ''}`}>
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`lumina-input-field ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''}`}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon && (
          <button
            type="button"
            className="lumina-input-right-btn"
            onClick={onRightIconClick}
            tabIndex={-1}
          >
            <span className="material-symbols-outlined">
              {rightIcon}
            </span>
          </button>
        )}
      </div>
      {error && <span className="lumina-input-error-msg">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
