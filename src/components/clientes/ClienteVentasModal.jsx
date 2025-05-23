// src/components/clientes/ClienteVentasModal.jsx
import React from 'react';
import { X, FileText, Loader } from 'lucide-react';

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

export default function ClienteVentasModal({
  isOpen,
  onClose,
  clienteActual, 
  ventasCliente, 
  onSelectSale, 
  loading,
  formatDateFunction
}) {
  if (!isOpen || !clienteActual) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm overflow-y-auto h-full w-full z-40 flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-dark-800 p-6 md:p-8 rounded-lg shadow-dropdown-dark border border-dark-700 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Cerrar modal de ventas"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-6">
          Ventas de {clienteActual.nombre}
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader size={24} className="text-primary-400 animate-spin mr-2" />
            <p className="text-gray-300 font-medium">Cargando ventas...</p>
          </div>
        ) : ventasCliente.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 italic">Este cliente no tiene ventas registradas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto shadow-card-dark rounded-lg border border-dark-700/50">
            <table className="min-w-full divide-y divide-dark-700">
              <thead className="bg-dark-900">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Código</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Fecha</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Pago</th>
                  <th className="p-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-dark-800 divide-y divide-dark-700/50">
                {ventasCliente.map(venta => (
                  <tr key={venta.id} className="hover:bg-dark-700/50 transition-colors">
                    <td className="p-3 whitespace-nowrap text-sm font-medium text-primary-400">{venta.codigo_venta}</td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-400 hidden md:table-cell">
                      {formatDateFunction ? formatDateFunction(venta.fecha || venta.created_at) : new Date(venta.fecha || venta.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-400 hidden sm:table-cell">{venta.forma_pago}</td>
                    <td className="p-3 whitespace-nowrap text-sm font-semibold text-gray-200 text-right">
                      {formatCurrency(venta.total ?? 0)}
                    </td>
                    <td className="p-3 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => onSelectSale(venta)}
                        className="px-3 py-1 bg-primary-600 text-white rounded-md shadow-sm hover:bg-primary-700 transition-colors text-xs flex items-center gap-1 mx-auto"
                        title="Ver Detalle de la Venta"
                      >
                        <FileText size={14} />
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6 text-right">
            <button
                onClick={onClose}
                className="px-4 py-2 bg-dark-700 text-gray-200 rounded-md hover:bg-dark-600 transition-colors"
            >
                Cerrar
            </button>
        </div>
      </div>
    </div>
  );
}