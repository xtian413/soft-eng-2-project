import React from 'react';
import './Card.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  interactive = false,
  className = '',
  ...props
}) => {
  const classes = [
    'lumina-card',
    hoverable ? 'lumina-card-hoverable' : '',
    interactive ? 'lumina-card-interactive' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
