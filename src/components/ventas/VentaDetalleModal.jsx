// src/components/ventas/VentaDetalleModal.jsx
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

export default function VentaDetalleModal({
  isOpen,
  onClose,
  ventaSeleccionada, 
  detailLoading,
  clienteInfoTicket, 
  vendedorInfoTicket,
  clienteBalanceTicket,
  onShareTicket,         // Prop para compartir como PDF
  onShareTicketAsImage,  // Prop para compartir como Imagen directamente
  onViewTicketImage,     // Prop para ver la imagen del ticket en un modal
  onCancelSale,
  cancelLoading,
  formatDateFunction 
}) {
  if (!isOpen || !ventaSeleccionada) {
    return null;
  }

  const productosDeLaVenta = ventaSeleccionada.productos || [];

  const formattedDate = formatDateFunction 
    ? formatDateFunction(ventaSeleccionada.fecha || ventaSeleccionada.created_at) 
    : new Date(ventaSeleccionada.fecha || ventaSeleccionada.created_at).toLocaleString();


  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white p-6 md:p-8 rounded-lg shadow-xl w-full max-w-lg relative max-h-[95vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-500 hover:text-gray-800 text-2xl md:text-3xl font-bold leading-none"
          aria-label="Cerrar modal de detalle de venta"
        >
          &times;
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">
          Detalle de Venta - {ventaSeleccionada.codigo_venta}
        </h2>
        
        {detailLoading ? (
          <p className="text-center text-blue-600 font-semibold">Cargando detalles...</p>
        ) : (
          <>
            <div className="mb-6 text-gray-700 space-y-2 text-sm">
              <p><strong>Cliente:</strong> {clienteInfoTicket?.nombre || ventaSeleccionada.display_cliente_nombre || 'Público General'}</p>
              {clienteInfoTicket?.telefono && <p><strong>Teléfono:</strong> {clienteInfoTicket.telefono}</p>}
              {clienteInfoTicket?.correo && <p><strong>Correo:</strong> {clienteInfoTicket.correo}</p>}
              {clienteInfoTicket?.direccion && <p><strong>Dirección:</strong> {clienteInfoTicket.direccion}</p>}
              <p><strong>Fecha:</strong> {formattedDate}</p>
              <p><strong>Vendedor:</strong> {vendedorInfoTicket?.nombre || 'N/A'}</p>
              <p><strong>Forma de Pago:</strong> {ventaSeleccionada.forma_pago}</p>
            </div>
            <hr className="my-6 border-gray-200" />
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos:</h3>
            <div className="overflow-x-auto shadow-sm rounded-md mb-6 max-h-60">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                    <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Cant.</th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio</th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productosDeLaVenta.length > 0 ? (
                    productosDeLaVenta.map((p, i) => (
                      <tr key={p.producto_id || i} className="hover:bg-gray-50">
                        <td className="p-3 whitespace-nowrap">{p.nombre || p.nombreProducto}</td>
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
                <p className="font-semibold">Subtotal Original: {formatCurrency(ventaSeleccionada.subtotal ?? 0)}</p>
                {(ventaSeleccionada.valor_descuento ?? 0) > 0 && (
                    <p className="font-semibold text-red-600">
                        Descuento:{' '}
                        - {formatCurrency(ventaSeleccionada.valor_descuento ?? 0)}
                    </p>
                )}
                 {(ventaSeleccionada.gastos_envio ?? 0) > 0 && (
                    <p className="font-semibold">Gastos de Envío: {formatCurrency(ventaSeleccionada.gastos_envio ?? 0)}</p>
                )}
                {(ventaSeleccionada.monto_credito_aplicado ?? 0) > 0 && (
                   <p className="font-semibold text-blue-600">Saldo a Favor Aplicado: -{formatCurrency(ventaSeleccionada.monto_credito_aplicado ?? 0)}</p>
                )}
                {ventaSeleccionada.forma_pago === 'Crédito cliente' && (ventaSeleccionada.enganche ?? 0) > 0 && (
                    <p className="font-semibold">Enganche Pagado: {formatCurrency(ventaSeleccionada.enganche ?? 0)}</p>
                )}
                <p className="font-bold text-lg text-green-700 mt-2 pt-2 border-t border-gray-300">
                    Total Pagado: {formatCurrency(ventaSeleccionada.total ?? 0)}
                </p>
            </div>

            {ventaSeleccionada.forma_pago === 'Crédito cliente' && (
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
                onClick={onViewTicketImage} // Botón para ver el ticket como imagen
                className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition duration-200 text-sm"
              >
                Ver Ticket
              </button>
              <button 
                onClick={onShareTicket} 
                className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 transition duration-200 text-sm"
              >
                Compartir (PDF)
              </button>
              <button 
                onClick={onShareTicketAsImage} 
                className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition duration-200 text-sm"
              >
                Compartir Imagen
              </button>
              <button
                onClick={() => onCancelSale(ventaSeleccionada)}
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
