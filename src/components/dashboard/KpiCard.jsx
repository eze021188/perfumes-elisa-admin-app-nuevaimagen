// src/components/home/KpiCard.jsx
import React from 'react';
// Asegúrate de que esta ruta sea correcta para tu archivo formatters.js/ts
import { formatCurrency } from '../../utils/formatters'; 

const KpiCard = ({ 
  title, 
  value, 
  prefix = '', 
  suffix = '', 
  icon, 
  change, 
  className = '', 
}) => {
  // --- INICIO DE LA CORRECCIÓN CLAVE ---
  // Decidir cómo formatear el valor:
  // Si el prefix es '$', significa que es un valor monetario, y usaremos formatCurrency.
  // De lo contrario (si es un número de pedidos, clientes, etc.), usaremos toLocaleString simple.
  const formattedValue = prefix === '$' 
    ? formatCurrency(value)
    : value.toLocaleString('es-MX'); // Para números sin formato de moneda (ej. Pedidos Totales)
  // --- FIN DE LAREVISIÓN ---

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
        {/* Aquí mostramos el valor ya formateado por formatCurrency o toLocaleString.
            El prefix original SOLO se añade si no es un valor monetario (donde formatCurrency ya puso el '$'). */}
        {prefix !== '$' ? prefix : ''}{formattedValue}{suffix} 
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