// src/components/clientes/ClienteVentaDetalleModal.jsx
import React from 'react';
import { X, FileText, Share2, Image, Trash2, Loader } from 'lucide-react';

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

export default function ClienteVentaDetalleModal({
  isOpen,
  onClose,
  selectedSale, 
  selectedSaleDetails,
  detailLoading,
  clienteInfoTicket, 
  vendedorInfoTicket,
  clienteBalanceTicket, 
  
  // Nuevas props para las acciones del ticket
  onShareTicket,         // Para compartir PDF
  onShareTicketAsImage,  // Para compartir Imagen directamente
  onViewTicketImage,     // Para ver la imagen del ticket en ImageActionModal
  
  onCancelSale,     
  cancelLoading,
  formatDateFunction 
}) {
  if (!isOpen || !selectedSale) {
    return null;
  }

  const productosDeLaVenta = selectedSaleDetails || selectedSale.productos || [];

  const formattedDate = formatDateFunction 
    ? formatDateFunction(selectedSale.fecha || selectedSale.created_at) 
    : new Date(selectedSale.fecha || selectedSale.created_at).toLocaleString();

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-dark-800 p-6 md:p-8 rounded-lg shadow-dropdown-dark border border-dark-700 w-full max-w-lg relative max-h-[95vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Cerrar modal de detalle de venta"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-6">
          Detalle de Venta - {selectedSale.codigo_venta}
        </h2>
        
        {detailLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader size={24} className="text-primary-400 animate-spin mr-2" />
            <p className="text-gray-300 font-medium">Cargando detalles...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-gray-300 space-y-2 text-sm">
              <p><strong className="text-gray-200">Cliente:</strong> {clienteInfoTicket?.nombre || selectedSale.cliente_nombre || 'Público General'}</p>
              {clienteInfoTicket?.telefono && <p><strong className="text-gray-200">Teléfono:</strong> {clienteInfoTicket.telefono}</p>}
              <p><strong className="text-gray-200">Fecha:</strong> {formattedDate}</p>
              <p><strong className="text-gray-200">Vendedor:</strong> {vendedorInfoTicket?.nombre || 'N/A'}</p>
              <p><strong className="text-gray-200">Forma de Pago:</strong> {selectedSale.forma_pago}</p>
            </div>
            <hr className="my-6 border-dark-700" />
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Productos:</h3>
            <div className="overflow-x-auto shadow-card-dark rounded-md mb-6 max-h-60 bg-dark-900/50 border border-dark-700/50">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-dark-900 sticky top-0">
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Producto</th>
                    <th className="p-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Cant.</th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Precio</th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50">
                  {productosDeLaVenta.length > 0 ? (
                    productosDeLaVenta.map((p, i) => (
                      <tr key={p.producto_id || p.id || i} className="hover:bg-dark-800/70">
                        <td className="p-3 whitespace-nowrap text-gray-300">{p.nombreProducto || p.nombre || 'Producto Desconocido'}</td>
                        <td className="p-3 text-center whitespace-nowrap text-gray-300">{p.cantidad}</td>
                        <td className="p-3 text-right whitespace-nowrap text-gray-300">{formatCurrency(p.precio_unitario ?? 0)}</td>
                        <td className="p-3 text-right whitespace-nowrap text-gray-300">{formatCurrency(p.total_parcial ?? 0)}</td>
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
            
            <div className="text-right text-gray-300 space-y-1 mb-6 text-sm">
                <p className="font-semibold">Subtotal Original: <span className="text-gray-200">{formatCurrency(selectedSale.subtotal ?? 0)}</span></p>
                {(selectedSale.valor_descuento ?? 0) > 0 && (
                    <p className="font-semibold text-error-400">
                        Descuento: <span className="font-medium">- {formatCurrency(selectedSale.valor_descuento ?? 0)}</span>
                    </p>
                )}
                {(selectedSale.gastos_envio ?? 0) > 0 && (
                    <p className="font-semibold">Gastos de Envío: <span className="text-gray-200">{formatCurrency(selectedSale.gastos_envio ?? 0)}</span></p>
                )}
                {(selectedSale.monto_credito_aplicado ?? 0) > 0 && (
                   <p className="font-semibold text-primary-400">Saldo a Favor Aplicado: <span className="font-medium">-{formatCurrency(selectedSale.monto_credito_aplicado ?? 0)}</span></p>
                )}
                {selectedSale.forma_pago === 'Crédito cliente' && (selectedSale.enganche ?? 0) > 0 && (
                    <p className="font-semibold">Enganche Pagado: <span className="text-gray-200">{formatCurrency(selectedSale.enganche ?? 0)}</span></p>
                )}
                <p className="font-bold text-lg text-success-400 mt-2 pt-2 border-t border-dark-700">
                    Total Pagado: {formatCurrency(selectedSale.total ?? 0)}
                </p>
            </div>

            {selectedSale.forma_pago === 'Crédito cliente' && (
                 <div className="text-center text-gray-300 mb-6 mt-4 pt-4 border-t border-dark-700">
                    <p className="font-semibold mb-1 text-sm">Balance de Cuenta Actual del Cliente:</p>
                    <p className={`text-lg font-bold ${clienteBalanceTicket > 0 ? 'text-error-400' : clienteBalanceTicket < 0 ? 'text-success-400' : 'text-gray-300'}`}>
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
                onClick={onViewTicketImage} 
                className="px-4 py-2 bg-dark-700 text-gray-200 rounded-md shadow-sm hover:bg-dark-600 transition-colors flex items-center gap-1"
              >
                <FileText size={16} />
                Ver Ticket
              </button>
              <button 
                onClick={onShareTicket} 
                className="px-4 py-2 bg-success-600 text-white rounded-md shadow-sm hover:bg-success-700 transition-colors flex items-center gap-1"
              >
                <Share2 size={16} />
                Compartir PDF
              </button>
              <button 
                onClick={onShareTicketAsImage}
                className="px-4 py-2 bg-primary-600 text-white rounded-md shadow-sm hover:bg-primary-700 transition-colors flex items-center gap-1"
              >
                <Image size={16} />
                Compartir Imagen
              </button>
              <button
                onClick={() => onCancelSale(selectedSale)}
                disabled={cancelLoading}
                className={`px-4 py-2 rounded-md shadow-sm transition-colors flex items-center gap-1 ${
                  cancelLoading 
                    ? 'bg-dark-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-error-600 text-white hover:bg-error-700'
                }`}
              >
                <Trash2 size={16} />
                {cancelLoading ? 'Cancelando...' : 'Eliminar Venta'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}