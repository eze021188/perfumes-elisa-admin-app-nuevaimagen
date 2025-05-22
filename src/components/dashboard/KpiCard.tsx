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
    <div className={`stat-card ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="stat-title">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <p className="stat-value">
        {prefix}{formattedValue}{suffix}
      </p>
      {change && (
        <p className={`flex items-center text-sm ${
          change.isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          <span className="mr-1">
            {change.isPositive ? '↑' : '↓'}
          </span>
          {change.value}%
          <span className="ml-1 text-gray-500">vs. mes anterior</span>
        </p>
      )}
    </div>
  );
};

export default KpiCard;