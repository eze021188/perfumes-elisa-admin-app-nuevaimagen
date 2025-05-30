// src/components/clientes/ClientesTabla.jsx
import React from 'react';
import { Edit, Eye, CheckSquare, Square } from 'lucide-react';

export default function ClientesTabla({
  clientesPag,
  selectedIds,
  onSelectCliente,
  onSelectTodosClientes,
  onAbrirEditar,
  onHandleVerCompras,
  sortColumn,
  sortDirection,
  onSort,
  areAnyClientesVisible
}) {
  
  const renderSortArrow = (columnName) => {
    if (sortColumn === columnName) {
      return sortDirection === 'asc' ? '▲' : '▼';
    }
    return null;
  };

  return (
    <div className="bg-dark-800 shadow-card-dark rounded-lg overflow-x-auto mb-6 border border-dark-700/50">
      <table className="min-w-full divide-y divide-dark-700">
        <thead className="bg-dark-900">
          <tr>
            {/* Columna de selección */}
            <th className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">
              <div 
                onClick={onSelectTodosClientes}
                className={`cursor-pointer text-gray-400 hover:text-gray-200 transition-colors ${!areAnyClientesVisible ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {areAnyClientesVisible && selectedIds.length === clientesPag.length ? (
                  <CheckSquare size={18} className="text-primary-400" />
                ) : (
                  <Square size={18} />
                )}
              </div>
            </th>
            {/* Columna Nombre: Ancho reducido en móvil, texto salta de línea */}
            <th
              className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 w-[90px] sm:w-auto" // Ancho reducido para móvil (90px)
              onClick={() => onSort('nombre')}
            >
              Nombre {renderSortArrow('nombre')}
            </th>
            {/* Otras columnas (ocultas en ciertos tamaños de pantalla) */}
            <th
              className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:text-gray-200"
              onClick={() => onSort('telefono')}
            >
              Teléfono {renderSortArrow('telefono')}
            </th>
            <th
              className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:text-gray-200"
              onClick={() => onSort('correo')}
            >
              Correo {renderSortArrow('correo')}
            </th>
            <th
              className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:text-gray-200"
              onClick={() => onSort('direccion')}
            >
              Dirección {renderSortArrow('direccion')}
            </th>
            {/* Columna Acciones: Ancho reducido en móvil */}
            <th className="p-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-[80px] sm:w-auto">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-dark-800 divide-y divide-dark-700/50">
          {clientesPag.length === 0 ? (
            <tr>
              {/* Celda de mensaje sin clientes, con altura aumentada */}
              <td colSpan="6" className="py-4 text-center text-gray-500 italic">
                No hay clientes para mostrar con los filtros actuales.
              </td>
            </tr>
          ) : (
            clientesPag.map(cliente => (
              <tr key={cliente.id} className="hover:bg-dark-700/50 transition-colors">
                {/* Celda de selección, con altura y padding ajustados */}
                <td className="py-4 px-2 whitespace-nowrap">
                  <div 
                    onClick={() => onSelectCliente(cliente.id)}
                    className="cursor-pointer text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {selectedIds.includes(cliente.id) ? (
                      <CheckSquare size={18} className="text-primary-400" />
                    ) : (
                      <Square size={18} />
                    )}
                  </div>
                </td>
                {/* Celda del nombre: Altura, padding, ancho reducido y salto de línea. ¡TEXTO DE PRUEBA! */}
                <td className="py-4 px-2 text-sm font-medium text-red-500 break-words w-[90px] sm:w-auto">
                    ¡PRUEBA FINAL! - {cliente.nombre} {/* Texto de prueba para verificar */}
                </td>
                {/* Otras celdas (ocultas en ciertos tamaños de pantalla), con altura y padding ajustados */}
                <td className="py-4 px-2 whitespace-nowrap text-sm text-gray-300 hidden sm:table-cell">{cliente.telefono || 'N/A'}</td>
                <td className="py-4 px-2 whitespace-nowrap text-sm text-gray-300 hidden md:table-cell">{cliente.correo || 'N/A'}</td>
                <td className="py-4 px-2 whitespace-nowrap text-sm text-gray-300 hidden lg:table-cell">{cliente.direccion || 'N/A'}</td>
                {/* Celda de Acciones: Altura, padding, ancho y disposición de botones apilados en móvil */}
                <td className="py-4 px-2 text-center text-sm font-medium w-[80px] sm:w-auto">
                  {/* Contenedor de botones: Apilados en móvil, en fila en sm+ */}
                  <div className="flex flex-col items-center justify-center space-y-1 sm:flex-row sm:space-x-1 sm:space-y-0">
                    <button
                      onClick={() => onAbrirEditar(cliente)}
                      className="px-2 py-1 bg-purple-600 text-white rounded-md shadow-sm hover:bg-purple-700 transition-colors text-xs flex items-center gap-1 w-full justify-center"
                      title="Editar Cliente"
                    >
                      <Edit size={12} /> {/* Icono más pequeño */}
                      ¡EDITAR AHORA! {/* Texto de prueba para verificar */}
                    </button>
                    <button
                      onClick={() => onHandleVerCompras(cliente)}
                      className="px-2 py-1 bg-cyan-600 text-white rounded-md shadow-sm hover:bg-cyan-700 transition-colors text-xs flex items-center gap-1 w-full justify-center"
                      title="Ver Ventas del Cliente"
                    >
                      <Eye size={12} /> {/* Icono más pequeño */}
                      ¡VER VENTAS AHORA! {/* Texto de prueba para verificar */}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}