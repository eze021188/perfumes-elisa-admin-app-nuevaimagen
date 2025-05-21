// src/components/clientes/ClientesPaginacion.jsx
import React from 'react';

export default function ClientesPaginacion({
  pagina,
  totalPaginas,
  onPaginaAnterior,
  onPaginaSiguiente,
  disabledAnterior, // Booleano para deshabilitar el botón "Anterior"
  disabledSiguiente // Booleano para deshabilitar el botón "Siguiente"
}) {
  if (totalPaginas <= 1) { // No mostrar paginación si solo hay una página o ninguna
    return null;
  }

  return (
    <div className="flex items-center justify-center md:justify-end gap-2 mt-4 md:mt-0"> {/* Alineación y espaciado responsivo */}
      <button
        onClick={onPaginaAnterior}
        disabled={disabledAnterior}
        className="px-3 py-1 bg-gray-300 text-gray-800 rounded-md shadow-sm hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        Anterior
      </button>
      <span className="text-gray-700 text-sm">
        Página {pagina} de {totalPaginas}
      </span>
      <button
        onClick={onPaginaSiguiente}
        disabled={disabledSiguiente}
        className="px-3 py-1 bg-gray-300 text-gray-800 rounded-md shadow-sm hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        Siguiente
      </button>
    </div>
  );
}
