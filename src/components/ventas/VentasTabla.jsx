// src/components/ventas/VentasTabla.jsx
import React from 'react';

// Helper para formatear moneda (debe ser consistente con el resto de tu app)
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00';
    }
    return numericAmount.toLocaleString('en-US', { // O 'es-MX' o la configuración que uses
       style: 'currency',
       currency: 'USD', // Ajusta según tu moneda
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
   });
};

export default function VentasTabla({
  ventasFiltradas,
  onSelectSale,
  loading,
  busqueda,
  formatDateFunction // Recibe la función de formateo de fecha
}) {
  if (loading) {
    return <p className="p-4 text-center text-lg font-semibold text-gray-700">Cargando ventas...</p>;
  }

  if (ventasFiltradas.length === 0) {
    return (
      <p className="p-4 text-center text-gray-500 italic">
        {busqueda
          ? `No hay ventas que coincidan con "${busqueda}".`
          : "No hay ventas registradas."
        }
      </p>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
      <div className="overflow-x-auto"> {/* Para responsividad en tablas */}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Fecha</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Pago</th>
              <th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
              <th className="p-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ventasFiltradas.map(venta => (
              <tr
                key={venta.id}
                className="hover:bg-gray-50 transition duration-150 ease-in-out"
              >
                <td
                    className="p-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                    onClick={() => onSelectSale(venta)}
                    title={`Ver detalle de venta ${venta.codigo_venta}`}
                >
                    {venta.codigo_venta}
                </td>
                {/* CORREGIDO: Usar display_cliente_nombre en lugar de display_cliente_nombre_tabla */}
                <td className="p-4 whitespace-nowrap text-sm text-gray-700">{venta.display_cliente_nombre}</td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                  {/* Usar la función de formateo pasada como prop */}
                  {formatDateFunction ? formatDateFunction(venta.fecha || venta.created_at) : new Date(venta.fecha || venta.created_at).toLocaleString()}
                </td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{venta.forma_pago}</td>
                <td className="p-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                  {formatCurrency(venta.total ?? 0)}
                </td>
                <td className="p-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => onSelectSale(venta)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition duration-200 ease-in-out text-xs"
                    title="Ver Detalle de la Venta"
                  >
                    Ver Detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
