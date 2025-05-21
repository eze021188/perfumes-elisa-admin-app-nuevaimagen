// src/components/clientes/ClientesAccionesBarra.jsx
import React from 'react';

export default function ClientesAccionesBarra({
  busqueda,
  onBusquedaChange,
  onAbrirNuevoCliente,
  porPagina,
  onPorPaginaChange,
  onEliminarSeleccionados,
  selectedIdsCount,
  disabledEliminar // Nueva prop para deshabilitar el botón si no hay selecciones
}) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
      <div className="flex items-center gap-2 w-full md:w-auto">
        <label htmlFor="items-per-page" className="text-gray-700 text-sm whitespace-nowrap">
          Mostrar:
        </label>
        <select
          id="items-per-page"
          value={porPagina}
          onChange={e => onPorPaginaChange(Number(e.target.value))}
          className="border p-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {[10, 25, 50, 100].map(n => (
            <option key={n} value={n}>
              {n} por página
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={e => onBusquedaChange(e.target.value)}
          className="w-full sm:w-auto md:w-64 border p-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={onAbrirNuevoCliente}
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
        >
          Agregar cliente
        </button>
      </div>
      
      <button
        disabled={disabledEliminar} // Usar la nueva prop
        onClick={onEliminarSeleccionados}
        className={`w-full md:w-auto px-4 py-2 rounded-md shadow-sm transition duration-200 ease-in-out text-sm ${
          disabledEliminar
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-red-600 text-white hover:bg-red-700'
        }`}
      >
        Eliminar seleccionados ({selectedIdsCount})
      </button>
    </div>
  );
}
