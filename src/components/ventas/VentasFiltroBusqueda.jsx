// src/components/ventas/VentasFiltroBusqueda.jsx
import React from 'react';

export default function VentasFiltroBusqueda({
  busqueda,
  onBusquedaChange
}) {
  return (
    <div className="mb-6 flex justify-center">
      <input
        type="text"
        placeholder="Buscar por cliente, código o forma de pago..."
        value={busqueda}
        onChange={e => onBusquedaChange(e.target.value)}
        className="p-3 border rounded-md shadow-sm w-full md:w-1/2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
      />
    </div>
  );
}
