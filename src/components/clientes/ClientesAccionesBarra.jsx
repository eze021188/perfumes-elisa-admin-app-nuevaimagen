// src/components/clientes/ClientesAccionesBarra.jsx
import React from 'react';
import { Search, UserPlus, Trash2 } from 'lucide-react';

export default function ClientesAccionesBarra({
  busqueda,
  onBusquedaChange,
  onAbrirNuevoCliente,
  porPagina,
  onPorPaginaChange,
  onEliminarSeleccionados,
  selectedIdsCount,
  disabledEliminar
}) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
      <div className="flex items-center gap-2 w-full md:w-auto">
        <label htmlFor="items-per-page" className="text-gray-300 text-sm whitespace-nowrap">
          Mostrar:
        </label>
        <select
          id="items-per-page"
          value={porPagina}
          onChange={e => onPorPaginaChange(Number(e.target.value))}
          className="border border-dark-700 bg-dark-900 p-2 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm text-gray-200"
        >
          {[10, 25, 50, 100].map(n => (
            <option key={n} value={n}>
              {n} por página
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
        <div className="relative w-full sm:w-auto md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={e => onBusquedaChange(e.target.value)}
            className="w-full pl-10 p-2 bg-dark-900 border border-dark-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
          />
        </div>
        <button
          onClick={onAbrirNuevoCliente}
          className="w-full sm:w-auto px-6 py-2 bg-primary-600 text-white rounded-lg shadow-elegant-dark hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <UserPlus size={18} />
          Agregar cliente
        </button>
      </div>
      
      <button
        disabled={disabledEliminar}
        onClick={onEliminarSeleccionados}
        className={`w-full md:w-auto px-4 py-2 rounded-md shadow-sm transition-colors text-sm flex items-center justify-center gap-2 ${
          disabledEliminar
            ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
            : 'bg-error-600 text-white hover:bg-error-700'
        }`}
      >
        <Trash2 size={16} />
        Eliminar seleccionados ({selectedIdsCount})
      </button>
    </div>
  );
}