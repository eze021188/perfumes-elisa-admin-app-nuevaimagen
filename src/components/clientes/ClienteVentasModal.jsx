// src/components/clientes/ClienteVentasModal.jsx
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

export default function ClienteVentasModal({
  isOpen,
  onClose,
  clienteActual, // El objeto del cliente cuyas ventas se muestran
  ventasCliente, // Array de las ventas de este cliente
  onSelectSale, // Función para manejar la selección de una venta para ver su detalle
  loading // Booleano para indicar si las ventas del cliente se están cargando
}) {
  if (!isOpen || !clienteActual) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40 flex items-center justify-center p-4" 
      onClick={onClose} // Cerrar al hacer clic en el overlay
    >
      <div 
        className="bg-white p-6 md:p-8 rounded-lg shadow-xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()} // Evitar que el clic dentro del modal lo cierre
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-500 hover:text-gray-800 text-2xl md:text-3xl font-bold leading-none"
          aria-label="Cerrar modal de ventas"
        >
          &times;
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">
          Ventas de {clienteActual.nombre}
        </h2>
        
        {loading ? (
          <p className="text-center text-blue-600 font-semibold">Cargando ventas...</p>
        ) : ventasCliente.length === 0 ? (
          <p className="text-center text-gray-500 italic">Este cliente no tiene ventas registradas.</p>
        ) : (
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Fecha</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Pago</th>
                  <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ventasCliente.map(venta => (
                  <tr key={venta.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{venta.codigo_venta}</td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {venta.fecha ? new Date(venta.fecha).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha desconocida'}
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{venta.forma_pago}</td>
                    <td className="p-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(venta.total ?? 0)}
                    </td>
                    <td className="p-3 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => onSelectSale(venta)} // Llama a la función para abrir el modal de detalle
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
        )}
        <div className="mt-6 text-right">
            <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200"
            >
                Cerrar
            </button>
        </div>
      </div>
    </div>
  );
}
