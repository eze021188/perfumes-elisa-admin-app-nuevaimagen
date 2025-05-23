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
            <th
              className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200"
              onClick={() => onSort('nombre')}
            >
              Nombre {renderSortArrow('nombre')}
            </th>
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
            <th className="p-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-dark-800 divide-y divide-dark-700/50">
          {clientesPag.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-4 text-center text-gray-500 italic">
                No hay clientes para mostrar con los filtros actuales.
              </td>
            </tr>
          ) : (
            clientesPag.map(cliente => (
              <tr key={cliente.id} className="hover:bg-dark-700/50 transition-colors">
                <td className="p-4 whitespace-nowrap">
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
                <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-200">{cliente.nombre}</td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-300 hidden sm:table-cell">{cliente.telefono || 'N/A'}</td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-300 hidden md:table-cell">{cliente.correo || 'N/A'}</td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-300 hidden lg:table-cell">{cliente.direccion || 'N/A'}</td>
                <td className="p-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex justify-center items-center space-x-2">
                    <button
                      onClick={() => onAbrirEditar(cliente)}
                      className="px-3 py-1 bg-warning-600 text-white rounded-md shadow-sm hover:bg-warning-700 transition-colors text-xs flex items-center gap-1"
                      title="Editar Cliente"
                    >
                      <Edit size={14} />
                      Editar
                    </button>
                    <button
                      onClick={() => onHandleVerCompras(cliente)}
                      className="px-3 py-1 bg-primary-600 text-white rounded-md shadow-sm hover:bg-primary-700 transition-colors text-xs flex items-center gap-1"
                      title="Ver Ventas del Cliente"
                    >
                      <Eye size={14} />
                      Ver Ventas
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