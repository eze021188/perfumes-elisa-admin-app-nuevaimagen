import React from 'react';

interface KpiCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const HomeKpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  icon,
  change,
  className = '',
}) => {
  const formattedValue = typeof value === 'number' 
    ? value.toLocaleString('es-MX')
    : value;

  return (
    <div className={`card-dark hover:scale-[1.02] transition-transform ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {icon && (
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-900/30 text-primary-400">
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-semibold text-gray-100 mb-2">
        {prefix}{formattedValue}{suffix}
      </p>
      {change && (
        <div className="flex items-center space-x-2">
          <span className={`flex items-center text-sm font-medium ${
            change.isPositive ? 'text-success-400' : 'text-error-400'
          }`}>
            <span className={`mr-1 ${change.isPositive ? 'transform rotate-0' : 'transform rotate-180'}`}>
              {change.isPositive ? '↑' : '↓'}
            </span>
            {change.value}%
          </span>
          <span className="text-xs text-gray-500">vs. mes anterior</span>
        </div>
      )}
    </div>
  );
};

export default HomeKpiCard;