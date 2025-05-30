// src/components/home/HomeKpiCard.jsx
import React from 'react';
// Los íconos ya no se importan aquí para ser renderizados por un switch,
// sino que se espera que sean pasados directamente como JSX desde el componente padre.
// Por ejemplo: <HomeKpiCard icon={<ShoppingCart size={20} />} ... />

const HomeKpiCard = ({
  title,
  value,
  prefix = '',
  suffix = '',
  icon, // Ahora se espera un componente de Lucide React directamente
  change,
  className = '', // Añadir className para permitir estilos adicionales desde el padre
}) => {
  const formattedValue = typeof value === 'number'
    ? value.toLocaleString('es-MX') // Formato numérico para es-MX
    : value;

  return (
    // Replicando la clase 'card-dark' y el efecto hover de ref_HomeKpiCard.tsx
    <div className={`card-dark hover:scale-[1.02] transition-transform ${className}`}>
      <div className="flex items-center justify-between mb-4">
        {/* Replicando el estilo del título de ref_HomeKpiCard.tsx */}
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {icon && (
          // Replicando el estilo del contenedor del ícono de ref_HomeKpiCard.tsx
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-900/30 text-primary-400">
            {icon}
          </div>
        )}
      </div>
      {/* Replicando el estilo del valor principal de ref_HomeKpiCard.tsx */}
      <p className="text-2xl font-semibold text-gray-100 mb-2">
        {prefix}{formattedValue}{suffix}
      </p>
      {change && (
        // Replicando el estilo del indicador de cambio de ref_HomeKpiCard.tsx
        <div className="flex items-center space-x-2">
          <span className={`flex items-center text-sm font-medium ${
            change.isPositive ? 'text-success-400' : 'text-error-400' // Colores de éxito/error de la paleta del diseño
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