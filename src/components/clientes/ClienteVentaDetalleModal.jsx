// src/components/clientes/ClienteVentaDetalleModal.jsx
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

export default function ClienteVentaDetalleModal({
  isOpen,
  onClose,
  selectedSale, // La venta completa, incluyendo monto_credito_aplicado, enganche, gastos_envio
  selectedSaleDetails, // Los items/productos de la venta
  detailLoading,
  clienteInfoTicket, // Objeto con info del cliente para el ticket
  vendedorInfoTicket, // Objeto con info del vendedor para el ticket
  clienteBalanceTicket, // Balance del cliente para mostrar en el ticket (si es crédito)
  onShowHtmlTicket, // Función para mostrar el ticket HTML
  onGeneratePDF, // Función para generar el PDF
  onCancelSale, // Función para cancelar/eliminar la venta
  cancelLoading // Booleano para el estado de carga de la cancelación
}) {
  if (!isOpen || !selectedSale) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" 
      onClick={onClose} // Cerrar al hacer clic en el overlay
    >
      <div 
        className="bg-white p-6 md:p-8 rounded-lg shadow-xl w-full max-w-lg relative max-h-[95vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()} // Evitar que el clic dentro del modal lo cierre
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-500 hover:text-gray-800 text-2xl md:text-3xl font-bold leading-none"
          aria-label="Cerrar modal de detalle de venta"
        >
          &times;
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">
          Detalle de Venta - {selectedSale.codigo_venta}
        </h2>
        
        {detailLoading ? (
          <p className="text-center text-blue-600 font-semibold">Cargando detalles...</p>
        ) : (
          <>
            <div className="mb-6 text-gray-700 space-y-2 text-sm">
              <p><strong>Cliente:</strong> {clienteInfoTicket?.nombre || 'Público General'}</p>
              {clienteInfoTicket?.telefono && <p><strong>Teléfono:</strong> {clienteInfoTicket.telefono}</p>}
              {clienteInfoTicket?.correo && <p><strong>Correo:</strong> {clienteInfoTicket.correo}</p>}
              {clienteInfoTicket?.direccion && <p><strong>Dirección:</strong> {clienteInfoTicket.direccion}</p>}
              <p><strong>Fecha:</strong> {selectedSale.fecha ? new Date(selectedSale.fecha).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha desconocida'}</p>
              <p><strong>Vendedor:</strong> {vendedorInfoTicket?.nombre || 'N/A'}</p>
              <p><strong>Forma de Pago:</strong> {selectedSale.forma_pago}</p>
            </div>
            <hr className="my-6 border-gray-200" />
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos:</h3>
            <div className="overflow-x-auto shadow-sm rounded-md mb-6 max-h-60"> {/* max-h para scroll si hay muchos productos */}
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0"> {/* Encabezado pegajoso */}
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                    <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Cant.</th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio</th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedSaleDetails && selectedSaleDetails.length > 0 ? (
                    selectedSaleDetails.map((p, i) => (
                      <tr key={p.id || i} className="hover:bg-gray-50"> {/* Usar p.id si está disponible, sino el índice */}
                        <td className="p-3 whitespace-nowrap">{p.nombreProducto || p.nombre}</td> {/* Usar nombreProducto si existe */}
                        <td className="p-3 text-center whitespace-nowrap">{p.cantidad}</td>
                        <td className="p-3 text-right whitespace-nowrap">{formatCurrency(p.precio_unitario ?? 0)}</td>
                        <td className="p-3 text-right whitespace-nowrap">{formatCurrency(p.total_parcial ?? 0)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                        <td colSpan="4" className="p-3 text-center text-gray-500">No hay detalles de productos para esta venta.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="text-right text-gray-800 space-y-1 mb-6 text-sm">
                <p className="font-semibold">Subtotal Original: {formatCurrency(selectedSale.subtotal ?? 0)}</p>
                {(selectedSale.valor_descuento ?? 0) > 0 && (
                    <p className="font-semibold text-red-600">
                        Descuento:{' '}
                        {selectedSale.tipo_descuento === 'porcentaje' 
                            // Asumimos que valor_descuento es el MONTO del descuento, no el porcentaje.
                            // Si fuera el porcentaje, necesitarías calcular el monto aquí o pasarlo.
                            ? `- ${formatCurrency(selectedSale.valor_descuento ?? 0)}` // Si es porcentaje y guardas el monto
                            : `- ${formatCurrency(selectedSale.valor_descuento ?? 0)}`} 
                    </p>
                )}
                 {(selectedSale.gastos_envio ?? 0) > 0 && (
                    <p className="font-semibold">Gastos de Envío: {formatCurrency(selectedSale.gastos_envio ?? 0)}</p>
                )}
                {(selectedSale.monto_credito_aplicado ?? 0) > 0 && (
                   <p className="font-semibold text-blue-600">Saldo a Favor Aplicado: -{formatCurrency(selectedSale.monto_credito_aplicado ?? 0)}</p>
                )}
                {selectedSale.forma_pago === 'Crédito cliente' && (selectedSale.enganche ?? 0) > 0 && (
                    <p className="font-semibold">Enganche Pagado: {formatCurrency(selectedSale.enganche ?? 0)}</p>
                )}
                <p className="font-bold text-lg text-green-700 mt-2 pt-2 border-t border-gray-300">
                    Total Pagado: {formatCurrency(selectedSale.total ?? 0)}
                </p>
            </div>

            {selectedSale.forma_pago === 'Crédito cliente' && (
                 <div className="text-center text-gray-800 mb-6 mt-4 pt-4 border-t">
                    <p className="font-semibold mb-1 text-sm">Balance de Cuenta Actual del Cliente:</p>
                    <p className={`text-lg font-bold ${clienteBalanceTicket > 0 ? 'text-red-600' : clienteBalanceTicket < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                        {formatCurrency(clienteBalanceTicket ?? 0)}
                        {clienteBalanceTicket < 0 && ' (a favor)'}
                        {clienteBalanceTicket > 0 && ' (por cobrar)'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Este es el balance general del cliente, no solo de esta venta.
                    </p>
                </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 mt-6">
              <button
                onClick={onShowHtmlTicket}
                className="px-4 py-2 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 transition duration-200 text-sm"
              >
                Ver Ticket
              </button>
              <button 
                onClick={onGeneratePDF} 
                className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 transition duration-200 text-sm"
              >
                Ver PDF
              </button>
              <button
                onClick={() => onCancelSale(selectedSale)}
                disabled={cancelLoading}
                className={`px-4 py-2 rounded-md shadow-sm transition duration-200 text-sm ${
                  cancelLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {cancelLoading ? 'Cancelando...' : 'Eliminar Venta'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
