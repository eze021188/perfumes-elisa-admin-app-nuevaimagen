// src/components/HtmlTicketDisplay.jsx
import React, { useRef } from 'react';
import { Download, X } from 'lucide-react';

// Helper simple para formatear moneda
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

export default function HtmlTicketDisplay({ saleData, onClose }) {
    if (!saleData) {
        return null;
    }

    const ticketRef = useRef(null);

    const {
        codigo_venta,
        cliente,
        vendedor,
        fecha,
        productosVenta,
        originalSubtotal,
        discountAmount,
        monto_credito_aplicado,
        forma_pago,
        enganche,
        gastos_envio,
        total_final,
        balance_cuenta
    } = saleData;

    const balanceClass = balance_cuenta > 0 ? 'negative' : 'positive';
    const balanceNote = balance_cuenta > 0
        ? '(Saldo positivo indica deuda del cliente)'
        : '(Saldo negativo indica crédito a favor del cliente)';

    const handleDownloadTicket = async () => {
        if (!ticketRef.current) {
            console.error("Elemento del ticket no encontrado.");
            return;
        }

        const captureAndDownload = async () => {
             try {
                 // Asegurarse que html2canvas esté cargado
                 if (typeof html2canvas === 'undefined') {
                     console.error('html2canvas no está cargado.');
                     alert('Error al intentar descargar: librería no cargada.');
                     return;
                 }

                 const canvas = await html2canvas(ticketRef.current, {
                     scale: 2,
                     logging: true,
                     useCORS: true
                 });
                 const image = canvas.toDataURL('image/jpeg', 0.9);
                 const link = document.createElement('a');
                 link.href = image;
                 link.download = `ticket_venta_${codigo_venta || 'sin_codigo'}.jpg`;
                 document.body.appendChild(link);
                 link.click();
                 document.body.removeChild(link);
             } catch (error) {
                 console.error("Error al generar o descargar la imagen del ticket:", error);
                 alert("No se pudo descargar el ticket como imagen. Intenta de nuevo.");
             }
        };

        // Cargar html2canvas dinámicamente si no está disponible globalmente
        if (typeof html2canvas === 'undefined') {
             const script = document.createElement('script');
             script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
             script.async = true;
             script.onload = () => captureAndDownload();
             script.onerror = () => {
                console.error('Error loading html2canvas script.');
                alert('No se pudo cargar la librería para descargar el ticket.');
             }
             document.body.appendChild(script);
        } else {
             captureAndDownload();
        }
    };

    return (
        // Overlay del modal
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-2" onClick={onClose}>
            {/* Contenedor principal del modal */}
            <div
                className="bg-dark-800 rounded-lg shadow-dropdown-dark border border-dark-700 overflow-y-auto max-h-[95vh] w-full"
                style={{ maxWidth: '400px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Estilos CSS para el ticket */}
                <style>
                    {`
                    .ticket-content-printable {
                        font-family: 'Arial', sans-serif;
                        color: #e5e7eb;
                        padding: 20px;
                        line-height: 1.5;
                        background-color: #1f2937;
                    }
                    .divider { border-top: 1px dashed #4b5563; margin: 12px 0; }
                    .ticket-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 15px; text-align: center; }
                    .ticket-header .header-top { display: flex; align-items: center; justify-content: center; margin-bottom: 8px; width:100%;}
                    .ticket-header img { margin-right: 10px; height: 50px; width: 50px; object-fit: contain; }
                    .ticket-title-block { text-align: left; }
                    .ticket-title-block h2 { font-size: 1.1rem; font-weight: bold; margin-bottom: 2px; color: #f9fafb; }
                    .ticket-title-block p { font-size: 0.8rem; color: #9ca3af; margin-top: 0; }
                    .contact-info { font-size: 0.8rem; color: #9ca3af; margin-top: 2px; text-align: center; }
                    .info-grid { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 0.85rem; color: #d1d5db; margin-bottom:10px; }
                    .info-grid strong { font-weight: bold; color: #f3f4f6; }
                    .product-list-header { font-weight: bold; font-size: 0.9rem; margin-bottom: 5px; color: #f3f4f6;}
                    .product-item { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 5px; padding-bottom:5px; border-bottom: 1px dotted #374151; }
                    .product-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom:0;}
                    .product-item .name { flex-grow: 1; margin-right: 8px; word-break: break-word; }
                    .product-item .details { white-space: nowrap; }
                    .totals-section { margin-top:10px; padding-top:10px; border-top: 1px dashed #4b5563;}
                    .totals-row { display: flex; justify-content: space-between; font-size: 0.85rem; color: #d1d5db; margin-bottom: 5px; }
                    .totals-row.total-final-amount { font-size: 1.1rem; font-weight: bold; color: #10b981; margin-top: 10px; border-top: 1px solid #4b5563; padding-top: 10px; }
                    .balance-section { margin-top: 15px; padding-top: 10px; border-top: 1px dashed #4b5563; text-align: center; font-size: 0.85rem; color: #d1d5db; }
                    .balance-value { font-size: 1.05rem; font-weight: bold; margin-top: 3px; }
                    .balance-value.positive { color: #10b981; }
                    .balance-value.negative { color: #ef4444; }
                    .thank-you { text-align: center; font-size: 0.8rem; color: #9ca3af; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #4b5563; }
                    .thank-you p { margin: 2px 0; }
                    `}
                </style>

                <div className="ticket-content-printable" ref={ticketRef}>
                    <div className="ticket-header">
                        <div className="header-top">
                            <img src="/images/PERFUMESELISAwhite.jpg" alt="Logo Perfumes Elisa" />
                            <div className="ticket-title-block">
                                <h2>Ticket de Venta</h2>
                                <p>#{saleData?.codigo_venta || 'N/A'}</p>
                            </div>
                        </div>
                        <p className="contact-info">81 3080 4010 - Ciudad Apodaca, N.L.</p>
                    </div>
                    <div className="divider"></div>
                    <div className="info-grid">
                        <p><strong>Cliente:</strong></p><p>{saleData?.cliente?.nombre || 'N/A'}</p>
                        {saleData?.cliente?.telefono && saleData.cliente.telefono !== 'N/A' && <> <p><strong>Teléfono:</strong></p><p>{saleData.cliente.telefono}</p> </>}
                        <p><strong>Vendedor:</strong></p><p>{saleData?.vendedor?.nombre || 'N/A'}</p>
                        <p><strong>Fecha:</strong></p><p>{fecha || 'N/A'}</p>
                    </div>
                    <div className="divider"></div>
                    <div className="mb-4">
                        <h3 className="product-list-header">Detalle de Venta:</h3>
                        {saleData?.productosVenta && saleData.productosVenta.length > 0 ? (
                            saleData.productosVenta.map(p => (
                                <div className="product-item" key={p.id || p.producto_id}>
                                    <span className="name">{p.nombre || p.nombreProducto}</span>
                                    <span className="details">{p.cantidad} x {formatCurrency(p.precio_unitario)} = {formatCurrency(p.total_parcial)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-center">No hay productos en la venta.</p>
                        )}
                    </div>
                    <div className="divider"></div>
                    <div className="text-right totals-section">
                        <div className="totals-row">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(saleData?.originalSubtotal || 0)}</span>
                        </div>
                        {(saleData?.discountAmount || 0) > 0 && (
                            <div className="totals-row" style={{color: '#ef4444'}}>
                                 <span>Descuento:</span>
                                 <span>- {formatCurrency(saleData?.discountAmount || 0)}</span>
                            </div>
                        )}
                         {(saleData?.gastos_envio || 0) > 0 && (
                             <div className="totals-row">
                                 <span>Gastos de Envío:</span>
                                 <span>{formatCurrency(saleData?.gastos_envio || 0)}</span>
                             </div>
                         )}
                        {(saleData?.monto_credito_aplicado || 0) > 0 && (
                            <div className="totals-row" style={{ color: '#60a5fa' }}>
                                <span>Saldo a Favor Aplicado:</span>
                                <span>- {formatCurrency(saleData.monto_credito_aplicado)}</span>
                            </div>
                        )}
                         {saleData?.forma_pago === 'Crédito cliente' && (saleData?.enganche || 0) > 0 && (
                             <div className="totals-row">
                                 <span>Enganche Pagado:</span>
                                 <span>{formatCurrency(saleData?.enganche || 0)}</span>
                             </div>
                         )}
                        <div className="totals-row total-final-amount">
                             <span>TOTAL PAGADO:</span>
                             <span>{formatCurrency(saleData?.total_final || 0)}</span>
                        </div>
                    </div>

                    {saleData?.forma_pago === 'Crédito cliente' && (
                         <div className="balance-section">
                            <p><strong>Balance de Cuenta Actual:</strong></p>
                            <p className={`balance-value ${balanceClass}`}>
                                {formatCurrency(saleData.balance_cuenta)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{balanceNote}</p>
                        </div>
                    )}
                    <div className="thank-you">
                        <p>¡Gracias por tu compra!</p>
                        <p>Visítanos de nuevo pronto.</p>
                    </div>
                </div>
                <div className="p-4 text-center flex justify-center space-x-4 border-t border-dark-700 mt-2">
                    <button
                        onClick={handleDownloadTicket}
                        className="px-6 py-2 bg-success-600 text-white rounded-md hover:bg-success-700 transition-colors flex items-center"
                    >
                        <Download size={18} className="mr-1.5" />
                        Descargar Ticket
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-dark-700 text-gray-200 rounded-md hover:bg-dark-600 transition-colors flex items-center"
                    >
                        <X size={18} className="mr-1.5" />
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}