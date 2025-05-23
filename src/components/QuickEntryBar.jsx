// src/components/QuickEntryBar.jsx
import React from 'react';
import { Search, Zap } from 'lucide-react';

export default function QuickEntryBar({
  busqueda,
  onChangeBusqueda,
  onQuickSaleClick
}) {
  return (
    <div className="flex items-center space-x-2 p-4 bg-dark-800 shadow-elegant-dark rounded-lg border border-dark-700/50">
      {/* 1. Input de búsqueda con ancho fijo */}
      <div className="flex items-center flex-none w-40 border border-dark-700 rounded-lg overflow-hidden bg-dark-900">
        <Search className="ml-2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={onChangeBusqueda}
          className="w-full p-2 outline-none bg-transparent text-gray-200 placeholder-gray-500"
        />
      </div>

      {/* 2. Botón de venta rápida */}
      <button
        onClick={onQuickSaleClick}
        className="p-2 bg-primary-900/50 rounded-lg hover:bg-primary-800/50 transition-colors"
        aria-label="Venta rápida"
      >
        <Zap className="w-6 h-6 text-primary-400" />
      </button>
    </div>
  );
}