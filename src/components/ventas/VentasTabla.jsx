// src/components/ventas/VentasTabla.jsx
import React from 'react';
import { FileText, Loader } from 'lucide-react';

// Helper para formatear moneda
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00';
    }
    return numericAmount.toLocaleString('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
   });
};

export default function VentasTabla({
  ventasFiltradas,
  onSelectSale,
  loading,
  busqueda,
  formatDateFunction
}) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-dark-800/50 rounded-lg border border-dark-700/50">
        <Loader size={24} className="text-primary-400 animate-spin mr-2" />
        <p className="text-gray-300 font-medium">Cargando ventas...</p>
      </div>
    );
  }

  if (ventasFiltradas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-dark-800/50 rounded-lg border border-dark-700/50">
        <p className="text-gray-400 italic mb-2">
          {busqueda
            ? `No hay ventas que coincidan con "${busqueda}".`
            : "No hay ventas registradas."
          }
        </p>
        <FileText size={48} className="text-gray-600 opacity-50" />
      </div>
    );
  }

  return (
    <div className="bg-dark-800 shadow-card-dark rounded-lg overflow-hidden mb-6 border border-dark-700/50">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-700">
          <thead className="bg-dark-900/50">
            <tr>
              <th className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Código</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Fecha</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Pago</th>
              <th className="p-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
              <th className="p-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-dark-800 divide-y divide-dark-700/50">
            {ventasFiltradas.map(venta => (
              <tr
                key={venta.id}
                className="hover:bg-dark-700/50 transition-colors"
              >
                <td
                    className="p-4 whitespace-nowrap text-sm font-medium text-primary-400 hover:text-primary-300 cursor-pointer"
                    onClick={() => onSelectSale(venta)}
                    title={`Ver detalle de venta ${venta.codigo_venta}`}
                >
                    {venta.codigo_venta}
                </td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-300">{venta.display_cliente_nombre}</td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-400 hidden md:table-cell">
                  {formatDateFunction ? formatDateFunction(venta.fecha || venta.created_at) : new Date(venta.fecha || venta.created_at).toLocaleString()}
                </td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-400 hidden sm:table-cell">{venta.forma_pago}</td>
                <td className="p-4 whitespace-nowrap text-sm font-semibold text-gray-200 text-right">
                  {formatCurrency(venta.total ?? 0)}
                </td>
                <td className="p-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => onSelectSale(venta)}
                    className="px-3 py-1.5 bg-primary-600/80 text-white rounded-md shadow-sm hover:bg-primary-600 transition-colors text-xs flex items-center mx-auto"
                    title="Ver Detalle de la Venta"
                  >
                    <FileText size={14} className="mr-1" />
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