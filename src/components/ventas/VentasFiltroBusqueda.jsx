// src/components/ventas/VentasFiltroBusqueda.jsx
import React from 'react';
import { Search } from 'lucide-react';

export default function VentasFiltroBusqueda({
  busqueda,
  onBusquedaChange
}) {
  return (
    <div className="mb-6 flex justify-center">
      <div className="relative w-full md:w-1/2">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Buscar por cliente, código o forma de pago..."
          value={busqueda}
          onChange={e => onBusquedaChange(e.target.value)}
          className="p-3 pl-10 border border-dark-700 rounded-lg shadow-elegant-dark w-full bg-dark-800 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
    </div>
  );
}