// src/components/home/HomeKpiCard.jsx
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

export default function HomeKpiCard({
  title,
  value,
  icon, // Emoji o componente de icono
  isLoading,
  isCurrency = false,
  // Las props valueColorClass, iconColorClass, iconBgClass se ignorarán
  // para un diseño más unificado y minimalista.
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-3/5 mb-3"></div> {/* Ajustado para el título */}
        <div className="h-7 bg-slate-300 rounded w-1/2"></div> {/* Ajustado para el valor */}
      </div>
    );
  }

  const displayValue = isCurrency ? formatCurrency(value) : (typeof value === 'number' ? value.toLocaleString('en-US') : value);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-shadow duration-300 ease-in-out flex flex-col justify-between h-full">
      {/* Contenedor para título e icono (opcional, si se quiere el icono arriba) */}
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        {icon && (
          <div className="ml-2 flex-shrink-0">
            <span className="text-2xl text-slate-400">{icon}</span> {/* Icono más sutil */}
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-semibold text-slate-800">{displayValue}</p>
        {/* Aquí se podría añadir un indicador de cambio porcentual si se tuviera ese dato */}
        {/* Ejemplo: <p className="text-xs text-green-500 mt-1">+5.2% vs mes anterior</p> */}
      </div>
    </div>
  );
}
