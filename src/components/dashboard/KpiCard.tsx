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

const KpiCard: React.FC<KpiCardProps> = ({
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
    <div className={`stat-card hover-lift ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="stat-title">{title}</h3>
        {icon && (
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-50 text-blue-600">
            {icon}
          </div>
        )}
      </div>
      <p className="stat-value">
        {prefix}{formattedValue}{suffix}
      </p>
      {change && (
        <div className="mt-2 flex items-center">
          <span className={`flex items-center text-sm font-medium ${
            change.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className={`mr-1 ${change.isPositive ? 'transform rotate-0' : 'transform rotate-180'}`}>
              {change.isPositive ? '↑' : '↓'}
            </span>
            {change.value}%
          </span>
          <span className="ml-1.5 text-xs text-gray-500">vs. mes anterior</span>
        </div>
      )}
    </div>
  );
};

export default KpiCard;