// src/components/HtmlTicketDisplay.jsx
import React, { useRef } from 'react';
// html2canvas se cargará dinámicamente si es necesario

// Helper simple para formatear moneda
const formatCurrency = (amount) => {
     const numericAmount = parseFloat(amount);
     if (isNaN(numericAmount)) {
         return '$0.00';
     }
     return numericAmount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD', // Ajusta según tu moneda
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
        monto_credito_aplicado, // <<< Dato que usaremos para el ticket
        forma_pago,
        enganche,
        gastos_envio,
        total_final, // Este es el total que el cliente pagó por otros medios
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

        if (typeof html2canvas === 'undefined') {
             const script = document.createElement('script');
             script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
             script.onload = () => captureAndDownload();
             script.onerror = () => console.error('Error loading html2canvas script.');
             document.body.appendChild(script);
        } else {
             captureAndDownload();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh] w-full"
                style={{ maxWidth: '400px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)' }}
                onClick={(e) => e.stopPropagation()}
            >
                    <style>
                        {`
                        .ticket-content-printable {
                            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                            color: #4a4a4a;
                            padding: 15px;
                        }
                        .divider {
                            border-top: 1px solid #e0e0e0;
                            margin: 10px 0;
                        }
                        .ticket-header {
                             display: flex;
                             flex-direction: column;
                             align-items: center;
                             margin-bottom: 12px;
                             text-align: center;
                         }
                         .ticket-header .header-top {
                             display: flex;
                             align-items: center;
                             justify-content: center;
                             margin-bottom: 5px;
                         }
                         .ticket-header img {
                             margin-right: 10px;
                             height: auto;
                             width: 45px;
                         }
                         .ticket-title-block {
                             text-align: left;
                         }
                         .ticket-title-block h2 {
                             font-size: 1rem;
                             font-weight: 600;
                             margin-bottom: 0;
                             line-height: 1.2;
                         }
                         .ticket-title-block p {
                             font-size: 0.7rem;
                             color: #6b7280;
                             margin-top: 1px;
                             line-height: 1.2;
                         }
                        .contact-info {
                            font-size: 0.75rem;
                            color: #6b7280;
                            margin-top: 0;
                            text-align: center;
                        }
                         .info-columns {
                             display: grid;
                             grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                             gap: 6px 8px;
                             font-size: 0.75rem;
                             color: #374151;
                         }
                         .info-columns p {
                             word-break: break-word;
                             line-height: 1.3;
                         }
                         .info-columns p strong {
                             display: block;
                             font-size: 0.7rem;
                             color: #5a5a5a;
                             margin-bottom: 1px;
                             font-weight: normal;
                         }
                        .product-item {
                            display: flex;
                            justify-content: space-between;
                            font-size: 0.75rem;
                            color: #4a4a4a;
                            margin-bottom: 6px;
                        }
                        .product-item span:first-child {
                             flex-grow: 1;
                             margin-right: 6px;
                             word-break: break-word;
                        }
                         .totals-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 0.8rem;
                            color: #4a4a4a;
                            margin-bottom: 4px;
                         }
                         .totals-row.total-final-amount { /* Renombrado para claridad */
                            font-size: 1rem;
                            font-weight: bold;
                            color: #28a745;
                            margin-top: 8px;
                            border-top: 1px solid #e0e0e0;
                            padding-top: 8px;
                         }
                         .balance-section {
                             margin-top: 12px;
                             padding-top: 10px;
                             border-top: 1px solid #e0e0e0;
                             text-align: center;
                             font-size: 0.8rem;
                             color: #4a4a4a;
                         }
                         .balance-section strong {
                             font-size: 0.9rem;
                             color: #1f2937;
                         }
                         .balance-value {
                             font-size: 1rem;
                             font-weight: bold;
                             margin-top: 4px;
                         }
                         .balance-value.positive { color: #28a745; }
                         .balance-value.negative { color: #dc3545; }
                        .thank-you {
                            text-align: center;
                            font-size: 0.7rem;
                            color: #6b7280;
                            margin-top: 12px;
                            padding-top: 10px;
                            border-top: 1px solid #e0e0e0;
                        }
                        .thank-you p { margin: 1px 0; }
                        `}
                    </style>

                <div className="ticket-content-printable" ref={ticketRef}>
                    <div className="ticket-header">
                        <div className="header-top">
                            <img src="/images/PERFUMESELISAwhite.jpg" alt="Logo Perfumes Elisa" />
                            <div className="ticket-title-block">
                                <h2>Ticket</h2>
                                <p>#{saleData?.codigo_venta || 'N/A'}</p>
                            </div>
                        </div>
                        <p className="contact-info">81 3080 4010 - Ciudad Apodaca</p>
                    </div>
                    <div className="divider"></div>
                    <div className="info-columns">
                        <p><strong>Cliente:</strong> {saleData?.cliente?.nombre || 'N/A'}</p>
                        <p><strong>Teléfono:</strong> {saleData?.cliente?.telefono || 'N/A'}</p>
                        <p><strong>Vendedor:</strong> {saleData?.vendedor?.nombre || saleData?.vendedor?.email || 'N/A'}</p>
                        <p><strong>Fecha:</strong> {saleData?.fecha || 'N/A'}</p>
                    </div>
                    <div className="divider"></div>
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">Detalle de Venta:</h3>
                        {saleData?.productosVenta && saleData.productosVenta.length > 0 ? (
                            saleData.productosVenta.map(p => (
                                <div className="product-item" key={p.id}>
                                    <span>{p.nombre}</span>
                                    <span>{p.cantidad} x {formatCurrency(p.precio_unitario)} = {formatCurrency(p.total_parcial)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-600 text-center">No hay productos en la venta.</p>
                        )}
                    </div>
                    <div className="divider"></div>
                    <div className="text-right">
                        <div className="totals-row">
                            <span>Subtotal (Productos):</span>
                            <span>{formatCurrency(saleData?.originalSubtotal || 0)}</span>
                        </div>
                        {(saleData?.discountAmount || 0) > 0 && (
                            <div className="totals-row text-red-600">
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
                        {/* --- NUEVO/MODIFICADO: Mostrar Saldo a Favor Aplicado --- */}
                        {(saleData?.monto_credito_aplicado || 0) > 0 && (
                            <div className="totals-row" style={{ color: '#007bff' }}> {/* Azul para el crédito aplicado */}
                                <span>Saldo a Favor Aplicado:</span>
                                <span>- {formatCurrency(saleData.monto_credito_aplicado)}</span>
                            </div>
                        )}
                        {/* --- FIN NUEVO/MODIFICADO --- */}
                         {saleData?.forma_pago === 'Crédito cliente' && (saleData?.enganche || 0) > 0 && (
                             <div className="totals-row">
                                 <span>Enganche Pagado:</span>
                                 <span>{formatCurrency(saleData?.enganche || 0)}</span>
                             </div>
                         )}
                        <div className="totals-row total-final-amount"> {/* Clase renombrada */}
                             <span>Total Pagado:</span> {/* Etiqueta más clara */}
                             <span>{formatCurrency(saleData?.total_final || 0)}</span>
                        </div>
                    </div>

                    {saleData?.forma_pago === 'Crédito cliente' && (
                         <div className="balance-section">
                            <p className="font-semibold text-gray-800 mb-1">Balance de Cuenta Actual:</p>
                            <p className={`balance-value ${balanceClass}`}>
                                {formatCurrency(Math.abs(saleData.balance_cuenta))}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{balanceNote}</p>
                        </div>
                    )}
                    <div className="thank-you text-center text-xs text-gray-500 mt-4 pt-3 border-t border-gray-300">
                        <p>¡Gracias por tu compra!</p>
                        <p>Visítanos de nuevo pronto.</p>
                    </div>
                </div>
                <div className="p-4 text-center flex justify-center space-x-4">
                    <button
                        onClick={handleDownloadTicket}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
                    >
                        Descargar Ticket (JPG)
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
