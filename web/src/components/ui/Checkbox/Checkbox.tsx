import React, { forwardRef } from 'react';
import './Checkbox.css';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  error,
  className = '',
  id,
  ...props
}, ref) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`lumina-checkbox-container ${className}`}>
      <div className="lumina-checkbox-wrapper">
        <div className="lumina-checkbox-box">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className="lumina-checkbox-input"
            {...props}
          />
          <div className="lumina-checkbox-frame" />
          <span className="material-symbols-outlined lumina-checkbox-icon">
            check
          </span>
        </div>
        <label htmlFor={checkboxId} className="lumina-checkbox-label">
          {label}
        </label>
      </div>
      {error && <span className="lumina-checkbox-error">{error}</span>}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
