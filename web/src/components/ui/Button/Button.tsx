import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'link';
  fullWidth?: boolean;
  size?: 'md' | 'lg';
  shape?: 'rounded' | 'pill';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  shape = 'rounded',
  className = '',
  ...props
}) => {
  const classes = [
    'lumina-btn',
    `lumina-btn-${variant}`,
    `lumina-btn-${size}`,
    `lumina-btn-${shape}`,
    fullWidth ? 'lumina-btn-full' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};
