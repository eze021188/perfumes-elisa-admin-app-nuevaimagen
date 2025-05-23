import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  actions,
  footer,
  className = '',
  hover = false,
}) => {
  return (
    <div 
      className={`
        bg-dark-800 rounded-lg shadow-card-dark overflow-hidden border border-dark-700/50
        ${hover ? 'transition-shadow hover:shadow-dropdown-dark' : ''}
        ${className}
      `}
    >
      {(title || subtitle || icon || actions) && (
        <div className="px-5 py-4 border-b border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon && (
                <div className="flex-shrink-0 text-primary-400">
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h3 className="text-lg font-medium text-gray-100">{title}</h3>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-400">{subtitle}</p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex-shrink-0 flex items-center">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="px-5 py-5">
        {children}
      </div>
      
      {footer && (
        <div className="px-5 py-4 bg-dark-900/50 border-t border-dark-700">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;