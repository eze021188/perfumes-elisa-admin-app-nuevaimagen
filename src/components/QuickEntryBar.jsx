// src/components/QuickEntryBar.jsx
import React from 'react';
import { Search, Barcode, Zap } from 'lucide-react';

export default function QuickEntryBar({
  busqueda,
  onChangeBusqueda,
  onScanClick,
  onQuickSaleClick
}) {
  return (
    <div className="flex items-center space-x-2 p-4 bg-white shadow-sm rounded">
      {/* 1. Input de búsqueda */}
      <div className="flex items-center flex-1 border rounded overflow-hidden">
        <Search className="ml-2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={onChangeBusqueda}
          className="w-full p-2 outline-none"
        />
      </div>

      {/* 2. Botón escáner */}
      <button
        onClick={onScanClick}
        className="p-2 bg-gray-100 rounded hover:bg-gray-200"
        aria-label="Escanear código de barras"
      >
        <Barcode className="w-6 h-6 text-gray-700" />
      </button>

      {/* 3. Botón venta rápida */}
      <button
        onClick={onQuickSaleClick}
        className="p-2 bg-yellow-100 rounded hover:bg-yellow-200"
        aria-label="Venta rápida"
      >
        <Zap className="w-6 h-6 text-yellow-600" />
      </button>
    </div>
  );
}
