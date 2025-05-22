// src/components/home/HomeTopListCard.jsx
import React from 'react';

// Helper para formatear moneda (debe ser consistente con el resto de tu app)
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00'; // O un string vacío, o lo que prefieras para valores no numéricos
    }
    return numericAmount.toLocaleString('en-US', { // Ajusta 'en-US' y 'USD' según tu configuración regional
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
   });
};

export default function HomeTopListCard({
  title,
  items, // Array de objetos, ej: [{ id, name, value, valueLabel }]
  isLoading,
  loadingError,
  noDataMessage = "No hay datos para mostrar.",
  valueFormatter = (value) => formatCurrency(value) // Por defecto formatea como moneda
}) {

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 animate-pulse border border-gray-200">
        <div className="h-6 bg-gray-300 rounded w-2/3 mb-4"></div> {/* Placeholder para el título */}
        <ul>
          {Array.from({ length: 5 }).map((_, j) => ( // Placeholder para 5 ítems de la lista
            <li
              key={j}
              className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0"
            >
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              <div className="h-4 bg-gray-300 rounded w-1/4"></div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 border border-red-300">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">{title}</h3>
        <p className="text-center text-red-600 font-semibold">{loadingError}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow duration-200 h-full flex flex-col"> {/* h-full y flex-col para ocupar altura */}
      <h3 className="text-lg font-semibold mb-3 text-gray-700">{title}</h3>
      {items && items.length > 0 ? (
        <ul className="divide-y divide-gray-200 flex-grow"> {/* flex-grow para que la lista ocupe espacio */}
          {items.map((item, index) => (
            <li
              key={item.id || index} // Usar item.id si está disponible, sino el índice
              className="flex justify-between items-center py-2 text-sm"
            >
              <span className="text-gray-800 truncate pr-2">{item.name || 'N/A'}</span>
              <span className="font-semibold text-gray-700 whitespace-nowrap">
                {valueFormatter(item.value)} {/* Usar el formateador de valor */}
                {item.valueLabel && <span className="text-xs text-gray-500 ml-1">{item.valueLabel}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-grow flex items-center justify-center">
            <p className="text-sm text-gray-500 italic">{noDataMessage}</p>
        </div>
      )}
    </div>
  );
}
