import React from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'default';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  rounded = false,
  icon,
  children,
  className = '',
}) => {
  const variantClasses = {
    primary: 'bg-primary-900/50 text-primary-300 border border-primary-800/30',
    secondary: 'bg-dark-700 text-gray-300 border border-dark-600/50',
    success: 'bg-success-900/50 text-success-300 border border-success-800/30',
    danger: 'bg-error-900/50 text-error-300 border border-error-800/30',
    warning: 'bg-warning-900/50 text-warning-300 border border-warning-800/30',
    info: 'bg-blue-900/50 text-blue-300 border border-blue-800/30',
    default: 'bg-dark-700 text-gray-300 border border-dark-600/50',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${rounded ? 'rounded-full' : 'rounded'}
        ${className}
      `}
    >
      {icon && <span className="mr-1.5 -ml-0.5">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;