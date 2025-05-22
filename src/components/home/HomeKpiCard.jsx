// src/components/home/HomeKpiCard.jsx
import React from 'react';

// Helper para formatear moneda (puedes moverlo a un archivo utils si lo usas en varios sitios)
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

export default function HomeKpiCard({
  title,
  value,
  icon, // Emoji o componente de icono
  isLoading,
  isCurrency = false, // Nueva prop para indicar si el valor es monetario
  valueColorClass = 'text-blue-600', // Color por defecto para el valor
  iconColorClass = 'text-blue-500', // Color por defecto para el icono
  iconBgClass = 'bg-blue-100' // Color de fondo por defecto para el icono (si se usa un div para el icono)
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-5 animate-pulse border border-gray-200">
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
        <div className="h-6 bg-gray-300 rounded w-1/2"></div>
      </div>
    );
  }

  const displayValue = isCurrency ? formatCurrency(value) : value;

  return (
    <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-2xl font-bold ${valueColorClass}`}>{displayValue}</p>
      </div>
      {icon && (
        <div className={`p-3 rounded-full ${iconBgClass}`}> {/* Contenedor opcional para el icono con fondo */}
          <span className={`text-3xl opacity-80 ${iconColorClass}`}>{icon}</span>
        </div>
      )}
    </div>
  );
}
