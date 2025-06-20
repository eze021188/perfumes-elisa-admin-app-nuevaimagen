// src/components/HtmlTicketDisplay.jsx
import React, { useRef } from 'react';
import { Download, X, Share2 } from 'lucide-react'; // Importar Share2
import html2canvas from 'html2canvas'; // Importar html2canvas
import toast from 'react-hot-toast'; // Asegurarse de importar toast si no lo está

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

// CAMBIO: Ahora HtmlTicketDisplay recibe una prop onShareClick para que el padre pueda disparar el compartir
export default function HtmlTicketDisplay({ saleData, onClose, onShareClick }) { // Añadir onShareClick
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

    // Lógica para el "Total Pagado" según los nuevos requisitos
    const displayTotalPagado =
        forma_pago === 'Crédito cliente'
            ? (enganche && enganche > 0 ? enganche : 0)
            : total_final;

    // Esta función interna será llamada por onShareClick desde el padre
    const internalHandleShareTicket = async () => {
        if (!ticketRef.current) {
            console.error("Elemento del ticket no encontrado para compartir.");
            toast.error("No se pudo preparar el ticket para compartir.");
            return;
        }

        try {
            if (typeof html2canvas === 'undefined') {
                console.error('html2canvas no está cargado.');
                toast.error('Error al intentar compartir: librería no cargada.');
                return;
            }

            const canvas = await html2canvas(ticketRef.current, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imageDataUrl = canvas.toDataURL('image/png', 0.9);

            const blob = await (await fetch(imageDataUrl)).blob();
            const filename = `ticket_venta_${codigo_venta || 'sin_codigo'}.png`;
            const file = new File([blob], filename, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Ticket de Venta ${codigo_venta || ''}`,
                    text: `Aquí tienes tu ticket de compra de Perfumes Elisa. Cliente: ${cliente?.nombre || 'N/A'}. Total: ${formatCurrency(displayTotalPagado)}.`,
                    files: [file],
                });
                toast.success('Ticket compartido exitosamente.');
                onClose(); // Cierra el modal después de compartir
            } else {
                toast.info('La función de compartir no está disponible en este dispositivo. Puedes descargarlo.');
                // Fallback para descargar si no se puede compartir
                const link = document.createElement('a');
                link.href = imageDataUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                toast('Compartir cancelado.');
            } else {
                console.error("Error al generar o compartir la imagen del ticket:", error);
                toast.error("No se pudo compartir el ticket como imagen. Intenta de nuevo.");
            }
        }
    };

    // Si onShareClick es proporcionado, significa que el padre quiere controlar el compartir
    // En ese caso, la función interna se expone a través de la prop para ser llamada externamente.
    // Si no, este componente gestiona el botón directamente.
    React.useEffect(() => {
        if (onShareClick) {
            onShareClick.current = internalHandleShareTicket;
        }
    }, [onShareClick]); // internalHandleShareTicket se recrea en cada render, pero onShareClick.current apunta a la última.

    return (
        // Overlay del modal
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-2" onClick={onClose}>
            {/* Contenedor principal del modal */}
            <div
                className="bg-dark-800 rounded-lg shadow-dropdown-dark border border-dark-700 overflow-y-auto max-h-[95vh] w-full"
                style={{ maxWidth: '400px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Contenido del ticket con estilos para captura en fondo blanco */}
                <div className="ticket-content-printable" ref={ticketRef} style={{
                    fontFamily: 'Arial, sans-serif',
                    color: '#212529',
                    padding: '20px',
                    lineHeight: '1.5',
                    backgroundColor: '#ffffff'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', width: '100%' }}>
                            <img src="/images/PERFUMESELISA.png" alt="Logo Perfumes Elisa" style={{ marginRight: '10px', height: '50px', width: '50px', objectFit: 'contain' }} />
                            <div style={{ textAlign: 'left' }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0', color: '#000' }}>Ticket de Venta</h2>
                                <p style={{ fontSize: '0.8rem', color: '#6c757d', margin: '0' }}>#{saleData?.codigo_venta || 'N/A'}</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '2px', textAlign: 'center' }}>81 3080 4010 - Ciudad Apodaca, N.L.</p>
                    </div>
                    <div style={{ borderTop: '1px dashed #adb5bd', margin: '12px 0' }}></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px', fontSize: '0.85rem', color: '#343a40', marginBottom: '10px' }}>
                        <p><strong>Cliente:</strong></p><p>{saleData?.cliente?.nombre || 'N/A'}</p>
                        {saleData?.cliente?.telefono && saleData.cliente.telefono !== 'N/A' && <> <p><strong>Teléfono:</strong></p><p>{saleData.cliente.telefono}</p> </>}
                        <p><strong>Vendedor:</strong></p><p>{saleData?.vendedor?.nombre || 'N/A'}</p>
                        <p><strong>Fecha:</strong></p><p>{fecha || 'N/A'}</p>
                    </div>
                    <div style={{ borderTop: '1px dashed #adb5bd', margin: '12px 0' }}></div>
                    <div style={{ marginBottom: '4px' }}>
                        <h3 style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '5px', color: '#000' }}>Detalle de Venta:</h3>
                        {saleData?.productosVenta && saleData.productosVenta.length > 0 ? (
                            saleData.productosVenta.map(p => (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px', paddingBottom: '5px', borderBottom: '1px dotted #adb5bd' }} key={p.id || p.producto_id}>
                                    <span style={{ flexGrow: 1, marginRight: '8px', wordBreak: 'break-word' }}>{p.nombre || p.nombreProducto}</span>
                                    <span style={{ whiteSpace: 'nowrap' }}>{p.cantidad} x {formatCurrency(p.precio_unitario)} = {formatCurrency(p.total_parcial)}</span>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: '#6c757d', textAlign: 'center' }}>No hay productos en la venta.</p>
                        )}
                    </div>
                    <div style={{ borderTop: '1px dashed #adb5bd', margin: '12px 0' }}></div>
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #adb5bd', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#343a40', marginBottom: '5px' }}>
                            <span>Subtotal:</span>
                            <span>{formatCurrency(saleData?.originalSubtotal || 0)}</span>
                        </div>
                        {(saleData?.discountAmount || 0) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#dc3545', marginBottom: '5px' }}>
                                 <span>Descuento:</span>
                                 <span>- {formatCurrency(saleData?.discountAmount || 0)}</span>
                            </div>
                        )}
                         {(saleData?.gastos_envio || 0) > 0 && (
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#343a40', marginBottom: '5px' }}>
                                 <span>Gastos de Envío:</span>
                                 <span>{formatCurrency(saleData?.gastos_envio || 0)}</span>
                             </div>
                         )}
                        {(saleData?.monto_credito_aplicado || 0) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#007bff', marginBottom: '5px' }}>
                                <span>Saldo a Favor Aplicado:</span>
                                <span>- {formatCurrency(saleData.monto_credito_aplicado)}</span>
                            </div>
                        )}
                         {forma_pago === 'Crédito cliente' && (saleData?.enganche || 0) > 0 && (
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#343a40', marginBottom: '5px' }}>
                                 <span>Enganche Pagado:</span>
                                 <span>{formatCurrency(saleData?.enganche || 0)}</span>
                             </div>
                         )}
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#28a745', marginTop: '10px', borderTop: '1px solid #adb5bd', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                             <span>TOTAL PAGADO:</span>
                             <span>{formatCurrency(displayTotalPagado)}</span>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#000', marginTop: '5px', paddingTop: '5px', display: 'flex', justifyContent: 'space-between' }}>
                             <span>Forma de Pago:</span>
                             <span>{forma_pago || 'N/A'}</span>
                        </div>
                    </div>

                    {saleData?.forma_pago === 'Crédito cliente' && (
                         <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed #adb5bd', textAlign: 'center', fontSize: '0.85rem', color: '#343a40' }}>
                            <p><strong>Por pagar:</strong></p>
                            <p style={{ fontSize: '1.05rem', fontWeight: 'bold', marginTop: '3px', color: balance_cuenta > 0 ? '#dc3545' : '#28a745' }}>
                                {formatCurrency(balance_cuenta)}
                            </p>
                        </div>
                    )}
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#6c757d', marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed #adb5bd' }}>
                        <p style={{ margin: '2px 0' }}>¡Gracias por tu compra!</p>
                        <p style={{ margin: '2px 0' }}>Visítanos de nuevo pronto.</p>
                    </div>
                </div>
                {/* Los botones aquí se mantienen sin cambios, ya que ahora el botón de compartir principal estará en Checkout.jsx */}
                <div className="p-4 text-center flex justify-center space-x-4 border-t border-dark-700 mt-2">
                    {/* El botón de compartir ya no está aquí, lo manejará el padre */}
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