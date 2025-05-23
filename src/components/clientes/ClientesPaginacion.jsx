// src/components/clientes/ClientesPaginacion.jsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ClientesPaginacion({
  pagina,
  totalPaginas,
  onPaginaAnterior,
  onPaginaSiguiente,
  disabledAnterior,
  disabledSiguiente
}) {
  if (totalPaginas <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center md:justify-end gap-2 mt-4 md:mt-0">
      <button
        onClick={onPaginaAnterior}
        disabled={disabledAnterior}
        className="px-3 py-1 bg-dark-800 text-gray-300 rounded-md shadow-sm hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1"
      >
        <ChevronLeft size={16} />
        Anterior
      </button>
      <span className="text-gray-300 text-sm">
        Página {pagina} de {totalPaginas}
      </span>
      <button
        onClick={onPaginaSiguiente}
        disabled={disabledSiguiente}
        className="px-3 py-1 bg-dark-800 text-gray-300 rounded-md shadow-sm hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1"
      >
        Siguiente
        <ChevronRight size={16} />
      </button>
    </div>
  );
}