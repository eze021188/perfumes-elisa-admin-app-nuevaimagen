import React from 'react';

// Helper para formatear moneda
const formatCurrency = (amount: number) => {
    if (isNaN(amount)) {
        return '$0.00'; 
    }
    return amount.toLocaleString('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
   });
};

interface Item {
  id: string;
  name: string;
  value: number;
  valueLabel?: string;
}

interface HomeTopListCardProps {
  title: string;
  items?: Item[];
  isLoading?: boolean;
  loadingError?: string | null;
  noDataMessage?: string;
  valueFormatter?: (value: number) => string;
}

export default function HomeTopListCard({
  title,
  items,
  isLoading = false,
  loadingError,
  noDataMessage = "No hay datos disponibles.",
  valueFormatter,
}: HomeTopListCardProps) {
  const renderValue = (item: Item) => {
    if (valueFormatter) {
      return valueFormatter(item.value) + (item.valueLabel ? ` ${item.valueLabel}` : '');
    }
    // Por defecto, asume que es moneda si no hay valueFormatter
    return formatCurrency(item.value);
  };

  return (
    <div className="card-dark h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-100 mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">Principales registros</p>

      {isLoading ? (
        <div className="flex-grow space-y-3 animate-pulse pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-3.5 bg-dark-700 rounded w-3/5"></div>
              <div className="h-3.5 bg-dark-600 rounded w-1/5"></div>
            </div>
          ))}
        </div>
      ) : loadingError ? (
        <div className="flex-grow flex justify-center items-center">
          <p className="text-center text-error-400 font-medium p-4">{loadingError}</p>
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex-grow flex justify-center items-center">
          <p className="text-center text-gray-500 py-10">{noDataMessage}</p>
        </div>
      ) : (
        <ul className="flex-grow space-y-3 pt-2">
          {items.map((item, index) => (
            <li key={item.id || index} className="flex justify-between items-center text-sm group">
              <span className="text-gray-300 group-hover:text-primary-300 transition-colors duration-200 truncate pr-2" title={item.name}>
                {index + 1}. {item.name}
              </span>
              <span className="font-medium text-gray-200 group-hover:text-primary-300 transition-colors duration-200 whitespace-nowrap">
                {renderValue(item)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}