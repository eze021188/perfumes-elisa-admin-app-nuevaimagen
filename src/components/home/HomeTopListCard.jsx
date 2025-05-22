// src/components/home/HomeTopListCard.jsx
import React from 'react';

// Helper para formatear moneda
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00'; 
    }
    return numericAmount.toLocaleString('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
   });
};

export default function HomeTopListCard({
  title,
  items, // Array de objetos, ej: { id, name, value, valueLabel (opcional) }
  isLoading,
  loadingError,
  noDataMessage = "No hay datos disponibles.",
  valueFormatter, // Función opcional para formatear el valor si no es moneda
}) {

  const renderValue = (item) => {
    if (valueFormatter) {
      return valueFormatter(item.value) + (item.valueLabel ? ` ${item.valueLabel}` : '');
    }
    // Por defecto, asume que es moneda si no hay valueFormatter
    return formatCurrency(item.value);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-sm h-full flex flex-col">
      <h2 className="text-lg font-semibold text-slate-700 mb-1">{title}</h2>
      <p className="text-xs text-slate-400 mb-4">Principales registros</p> {/* Subtítulo o descripción opcional */}

      {isLoading ? (
        <div className="flex-grow space-y-3 animate-pulse pt-2">
          {[...Array(3)].map((_, i) => ( // Esqueleto para 3 items
            <div key={i} className="flex justify-between items-center">
              <div className="h-3.5 bg-slate-200 rounded w-3/5"></div>
              <div className="h-3.5 bg-slate-300 rounded w-1/5"></div>
            </div>
          ))}
        </div>
      ) : loadingError ? (
        <div className="flex-grow flex justify-center items-center">
          <p className="text-center text-sm text-red-500 font-medium p-4">{loadingError}</p>
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex-grow flex justify-center items-center">
          <p className="text-center text-sm text-slate-500 py-10">{noDataMessage}</p>
        </div>
      ) : (
        <ul className="flex-grow space-y-3 pt-2">
          {items.map((item, index) => (
            <li key={item.id || index} className="flex justify-between items-center text-sm group">
              <span className="text-slate-600 group-hover:text-blue-600 transition-colors duration-200 truncate pr-2" title={item.name}>
                {index + 1}. {item.name}
              </span>
              <span className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors duration-200 whitespace-nowrap">
                {renderValue(item)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {/* Podría ir un enlace "Ver todos" si aplica */}
      {/* <div className="mt-auto pt-4 text-right">
        <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Ver todos &rarr;
        </a>
      </div> */}
    </div>
  );
}
