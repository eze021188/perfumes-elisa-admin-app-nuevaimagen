// src/components/clientes/ClientesTabla.jsx
import React from 'react';

export default function ClientesTabla({
  clientesPag,
  selectedIds,
  onSelectCliente, // Función para manejar la selección/deselección de un cliente
  onSelectTodosClientes, // Función para manejar la selección/deselección de todos los clientes visibles
  onAbrirEditar,
  onHandleVerCompras,
  sortColumn,
  sortDirection,
  onSort, // Función para manejar el clic en los encabezados para ordenar
  areAnyClientesVisible // Booleano para saber si hay clientes en la página actual para habilitar/deshabilitar "seleccionar todos"
}) {
  
  const renderSortArrow = (columnName) => {
    if (sortColumn === columnName) {
      return sortDirection === 'asc' ? '▲' : '▼';
    }
    return null;
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-x-auto mb-6"> {/* overflow-x-auto para tablas responsivas */}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12"> {/* Ancho fijo para checkbox */}
              <input
                type="checkbox"
                onChange={onSelectTodosClientes}
                checked={areAnyClientesVisible && selectedIds.length === clientesPag.length}
                disabled={!areAnyClientesVisible}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th
              className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800"
              onClick={() => onSort('nombre')}
            >
              Nombre {renderSortArrow('nombre')}
            </th>
            <th
              className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:text-gray-800"
              onClick={() => onSort('telefono')}
            >
              Teléfono {renderSortArrow('telefono')}
            </th>
            <th
              className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:text-gray-800"
              onClick={() => onSort('correo')}
            >
              Correo {renderSortArrow('correo')}
            </th>
            <th
              className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:text-gray-800"
              onClick={() => onSort('direccion')}
            >
              Dirección {renderSortArrow('direccion')}
            </th>
            <th className="p-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {clientesPag.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-4 text-center text-gray-500 italic">
                No hay clientes para mostrar con los filtros actuales.
              </td>
            </tr>
          ) : (
            clientesPag.map(cliente => (
              <tr key={cliente.id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="p-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(cliente.id)}
                    onChange={() => onSelectCliente(cliente.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900">{cliente.nombre}</td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-700 hidden sm:table-cell">{cliente.telefono || 'N/A'}</td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-700 hidden md:table-cell">{cliente.correo || 'N/A'}</td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-700 hidden lg:table-cell">{cliente.direccion || 'N/A'}</td>
                <td className="p-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex justify-center items-center space-x-2">
                    <button
                      onClick={() => onAbrirEditar(cliente)}
                      className="px-3 py-1 bg-yellow-500 text-white rounded-md shadow-sm hover:bg-yellow-600 transition duration-200 ease-in-out text-xs"
                      title="Editar Cliente"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onHandleVerCompras(cliente)}
                      className="px-3 py-1 bg-purple-600 text-white rounded-md shadow-sm hover:bg-purple-700 transition duration-200 ease-in-out text-xs"
                      title="Ver Ventas del Cliente"
                    >
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
