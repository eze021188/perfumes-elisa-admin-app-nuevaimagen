// src/components/clientes/ClienteVentaDetalleModal.jsx
import React, { useRef } from 'react';
import { X, FileText, Share2, Image, Trash2, Loader, Download } from 'lucide-react'; // Importar Download
import toast from 'react-hot-toast'; // Asegurarse de importar toast si no lo está
import html2canvas from 'html2canvas'; // Importar html2canvas

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

// Helper para convertir Data URL a Blob (necesario para navigator.share)
const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

// --- COMPONENTE TicketParaImagen (Copiado de Ventas.jsx) ---
const TicketParaImagen = React.forwardRef(({ venta, cliente, vendedor, logoSrc, dateTimeFormatter, currencyFormatter }, ref) => {
    if (!venta || !cliente || !vendedor) {
        console.log("TicketParaImagen: Faltan datos para renderizar (venta, cliente o vendedor).");
        return null;
    }
    // Estilos generales del ticket - Diseño Minimalista
    const ticketStyles = {
        width: '300px', // Ancho base, html2canvas capturará esto.
        padding: '15px', // Espacio interno
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        fontSize: '12px', // Tamaño de fuente base más pequeño
        backgroundColor: '#fff',
        color: '#212529', // Un negro no tan intenso
        boxSizing: 'border-box',
    };

    // Estilos para el encabezado
    const headerSectionStyles = {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
    };
    const logoContainerStyles = {
        marginRight: '10px',
    };
    const logoStyles = {
        maxWidth: '40px', // Logo más pequeño
        maxHeight: '40px',
        display: 'block',
    };
    const titleAndCodeStyles = {
        flexGrow: 1,
    };
    const ticketTitleStyles = {
        fontSize: '16px',
        fontWeight: '600', // Un poco menos bold
        margin: '0',
        color: '#000',
    };
    const ticketCodeStyles = {
        fontSize: '10px',
        color: '#6c757d', // Gris más suave
        margin: '0',
    };
    const companyContactStyles = {
        textAlign: 'center', // Centrado debajo del logo y título
        fontSize: '10px',
        color: '#6c757d',
        margin: '5px 0 12px 0',
    };


    // Estilos para la sección de información
    const infoSectionStyles = {
        display: 'grid', // Usar grid para dos columnas
        gridTemplateColumns: '1fr 1fr',
        gap: '10px', // Espacio entre columnas
        marginBottom: '12px',
        fontSize: '11px',
    };

    const infoBlockStyles = { // Para cada bloque (Cliente/Vendedor, Teléfono/Fecha)
        // No se necesita width aquí con grid
    };
    const infoLabelStyles = {
        fontWeight: '600',
        color: '#495057',
        display: 'block',
        marginBottom: '2px',
    };
    const infoValueStyles = {
        display: 'block',
        color: '#212529',
        marginBottom: '5px',
    };

    // Estilos para la sección de detalles de productos
    const productDetailsSectionStyles = {
        marginBottom: '12px',
    };
    const productDetailsTitleStyles = {
        fontSize: '13px',
        fontWeight: '600',
        marginBottom: '6px',
        color: '#000',
    };
    const productItemStyles = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '4px 0',
        fontSize: '11px',
        borderTop: '1px solid #f0f0f0', // Línea divisoria muy sutil
    };
    const firstProductItemStyles = { // Para evitar la línea superior en el primer item
        ...productItemStyles,
        borderTop: 'none',
        paddingTop: '0',
    };
    const productNameStyles = {
        flex: '1',
        marginRight: '8px',
        wordBreak: 'break-word',
    };
    const productQuantityPriceStyles = {
        textAlign: 'right',
        minWidth: '80px',
        whiteSpace: 'nowrap',
        color: '#495057',
    };

    // Estilos para la sección de totales
    const totalsSectionStyles = {
        marginTop: '12px',
        fontSize: '12px',
    };
    const totalRowStyles = {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '3px 0',
    };
    const totalLabelStyles = {
        color: '#495057',
    };
    const totalValueStyles = {
        fontWeight: '500', // Un poco menos bold
        color: '#212529',
    };
    const grandTotalLabelStyles = {
        fontSize: '14px',
        fontWeight: '600',
        color: '#000',
    };
    const grandTotalValueStyles = {
        fontSize: '14px',
        fontWeight: '600',
        color: '#28a745', // Verde para total pagado
    };
    const saldoAplicadoStyles = {
        color: '#007bff', // Azul para saldo aplicado
        fontWeight: '500',
    };
    const creditNoteStyles = {
        fontSize: '10px',
        color: '#dc3545', // Color para indicar deuda (rojo)
        textAlign: 'right',
        marginTop: '5px',
        fontStyle: 'italic',
    };
    
    const hrMinimalistStyle = {
        border: 'none',
        borderTop: '1px solid #dee2e6', // Línea más sutil
        margin: '12px 0',
    };

    // Estilos para el pie de página
    const footerStyles = {
        textAlign: 'center',
        marginTop: '15px',
        fontSize: '10px',
        color: '#6c757d',
    };

    // Determinar el monto a mostrar como "Total Pagado" en el ticket
    const displayTotalPagadoTicket =
        venta.forma_pago === 'Crédito cliente'
            ? (venta.enganche && venta.enganche > 0 ? venta.enganche : 0)
            : venta.total;

    // Calcular el monto pendiente para la nota de crédito
    const montoPendienteTicket =
        venta.forma_pago === 'Crédito cliente'
            ? (venta.total ?? 0) - (venta.enganche ?? 0)
            : 0;

    return (
        <div ref={ref} style={ticketStyles}>
            <div style={headerSectionStyles}>
                {logoSrc && <div style={logoContainerStyles}><img src={logoSrc} alt="Logo" style={logoStyles} /></div>}
                <div style={titleAndCodeStyles}>
                    <h2 style={ticketTitleStyles}>Ticket</h2>
                    <p style={ticketCodeStyles}>#{venta.codigo_venta}</p>
                </div>
            </div>
            <p style={companyContactStyles}>PERFUMES ELISA<br/>81 3080 4010 - Ciudad Apodaca</p>

            <hr style={hrMinimalistStyle} />

            <div style={infoSectionStyles}>
                <div style={infoBlockStyles}>
                    <span style={infoLabelStyles}>Cliente:</span>
                    <span style={infoValueStyles}>{cliente?.nombre || venta.display_cliente_nombre || 'Público General'}</span>
                    <span style={infoLabelStyles}>Vendedor:</span>
                    <span style={infoValueStyles}>{vendedor?.nombre || 'N/A'}</span>
                </div>
                <div style={infoBlockStyles}>
                    <span style={infoLabelStyles}>Teléfono:</span>
                    <span style={infoValueStyles}>{cliente?.telefono || 'N/A'}</span>
                    <span style={infoLabelStyles}>Fecha:</span>
                    <span style={infoValueStyles}>{dateTimeFormatter(venta.fecha || venta.created_at)}</span>
                </div>
            </div>

            <hr style={hrMinimalistStyle} />

            <div style={productDetailsSectionStyles}>
                <h3 style={productDetailsTitleStyles}>Detalle de Venta:</h3>
                {(venta.productos || []).map((p, i) => (
                    <div key={p.producto_id || p.id || i} style={i === 0 ? firstProductItemStyles : productItemStyles}>
                        <span style={productNameStyles}>{p.nombreProducto || p.nombre || 'Producto Desconocido'}</span>
                        <span style={productQuantityPriceStyles}>
                            {p.cantidad} x {currencyFormatter(p.precio_unitario ?? 0)} = {currencyFormatter(p.total_parcial ?? 0)}
                        </span>
                    </div>
                ))}
            </div>

            <hr style={hrMinimalistStyle} />

            <div style={totalsSectionStyles}>
                <div style={totalRowStyles}>
                    <span style={totalLabelStyles}>Subtotal (Productos):</span>
                    <span style={totalValueStyles}>{currencyFormatter(venta.subtotal ?? 0)}</span>
                </div>
                {(venta.valor_descuento ?? 0) > 0 && (
                    <div style={totalRowStyles}>
                        <span style={totalLabelStyles}>Descuento:</span>
                        <span style={{ ...totalValueStyles, color: '#dc3545' }}>- {currencyFormatter(venta.valor_descuento ?? 0)}</span>
                    </div>
                )}
                {(venta.gastos_envio ?? 0) > 0 && (
                    <div style={totalRowStyles}>
                        <span style={totalLabelStyles}>Envío:</span>
                        <span style={totalValueStyles}>{currencyFormatter(venta.gastos_envio ?? 0)}</span>
                    </div>
                )}
                {(venta.monto_credito_aplicado ?? 0) > 0 && (
                    <div style={totalRowStyles}>
                        <span style={{ ...totalLabelStyles, ...saldoAplicadoStyles }}>Saldo a Favor Aplicado:</span>
                        <span style={{ ...totalValueStyles, ...saldoAplicadoStyles }}>- {currencyFormatter(venta.monto_credito_aplicado ?? 0)}</span>
                    </div>
                )}
                {venta.forma_pago === 'Crédito cliente' && (venta.enganche ?? 0) > 0 && (
                    <div style={totalRowStyles}>
                        <span style={totalLabelStyles}>Enganche Pagado:</span>
                        <span style={totalValueStyles}>{currencyFormatter(venta.enganche ?? 0)}</span>
                    </div>
                )}
                <div style={{ ...totalRowStyles, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #dee2e6' }}>
                    <span style={grandTotalLabelStyles}>Total Pagado:</span>
                    <span style={grandTotalValueStyles}>{currencyFormatter(displayTotalPagadoTicket)}</span>
                </div>
                <div style={{ ...totalRowStyles, marginTop: '5px', paddingTop: '5px' }}>
                    <span style={totalLabelStyles}>Forma de Pago:</span>
                    <span style={{ ...totalValueStyles, fontWeight: 'bold' }}>{venta.forma_pago || 'Desconocida'}</span>
                </div>
                {venta.forma_pago === 'Crédito cliente' && montoPendienteTicket > 0 && (
                    <p style={creditNoteStyles}>
                        *Venta a crédito. Pendiente: {currencyFormatter(montoPendienteTicket)}.
                    </p>
                )}
            </div>

            <div style={footerStyles}>
                <p style={{ margin: '2px 0' }}>¡Gracias por tu compra!</p>
                <p style={{ margin: '2px 0' }}>Visítanos de nuevo pronto.</p>
            </div>
        </div>
    );
});

// --- COMPONENTE ImageActionModal (Copiado de Ventas.jsx) ---
const ImageActionModal = ({ isOpen, onClose, imageDataUrl, imageFile, ventaCodigo, currencyFormatter, clienteNombre, ventaTotal }) => {
    if (!isOpen || !imageDataUrl) return null;

    const handleShare = async () => {
        if (!imageFile) {
            toast.error("Archivo de imagen no disponible para compartir.");
            return;
        }
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
            try {
                await navigator.share({
                    title: `Ticket de Venta ${ventaCodigo || ''}`,
                    text: `Imagen del Ticket de Venta ${ventaCodigo || ''}. Cliente: ${clienteNombre || 'Público General'}. Total: ${currencyFormatter(ventaTotal ?? 0)}.`,
                    files: [imageFile],
                });
                toast.success('Ticket como imagen compartido exitosamente.');
                onClose();
            } catch (error) {
                if (error.name !== 'AbortError') {
                    toast.error(`Error al compartir: ${error.message}`);
                } else {
                    toast('Compartir cancelado.');
                }
            }
        } else {
            toast.info('La función de compartir archivos no está disponible en este navegador. Intenta descargar la imagen.');
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = `Ticket_${ventaCodigo || 'venta'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Imagen descargada.');
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm overflow-y-auto h-full w-full z-[100] flex items-center justify-center p-2 sm:p-4"
            onClick={onClose}
        >
            <div
                className="bg-dark-800 rounded-lg shadow-dropdown-dark border border-dark-700 w-auto max-w-xs sm:max-w-sm md:max-w-md relative flex flex-col items-center p-3 sm:p-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-full mb-4 flex justify-center">
                    <img
                        src={imageDataUrl}
                        alt="Ticket de Venta"
                        className="max-w-full h-auto max-h-[70vh] object-contain shadow-card-dark"
                    />
                </div>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 w-full">
                    <button
                        onClick={handleShare}
                        className="px-3 py-2 sm:px-4 bg-primary-600 text-white rounded-md shadow-sm hover:bg-primary-700 transition-colors flex items-center"
                    >
                        <Share2 size={16} className="mr-1" />
                        Compartir
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-3 py-2 sm:px-4 bg-success-600 text-white rounded-md shadow-sm hover:bg-success-700 transition-colors flex items-center"
                    >
                        <Download size={16} className="mr-1" />
                        Descargar
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-2 sm:px-4 bg-dark-600 text-gray-200 rounded-md hover:bg-dark-500 transition-colors flex items-center"
                    >
                        <X size={16} className="mr-1" />
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
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
    formatDateFunction,
    logoBase64 // Añadir logoBase64 como prop
}) {
    // Referencia para el componente del ticket oculto para html2canvas
    const ticketImageRef = useRef(null);

    // Estados para la funcionalidad de tickets (en este componente)
    const [isImageActionModalOpen, setIsImageActionModalOpen] = React.useState(false);
    const [generatedImageDataUrl, setGeneratedImageDataUrl] = React.useState(null);
    const [generatedImageFile, setGeneratedImageFile] = React.useState(null);
    const [isProcessingImage, setIsProcessingImage] = React.useState(false);


    if (!isOpen || !selectedSale) {
        return null;
    }

    const productosDeLaVenta = selectedSaleDetails || selectedSale.productos || [];

    const formattedDate = formatDateFunction
        ? formatDateFunction(selectedSale.fecha || selectedSale.created_at)
        : new Date(selectedSale.fecha || selectedSale.created_at).toLocaleString();

    // Determine the amount to display as "Total Pagado"
    const displayTotalPagado =
        selectedSale.forma_pago === 'Crédito cliente'
            ? (selectedSale.enganche && selectedSale.enganche > 0 ? selectedSale.enganche : 0)
            : selectedSale.total;

    // Calculate the remaining amount for credit sales
    const montoPendienteCredito =
        selectedSale.forma_pago === 'Crédito cliente'
            ? (selectedSale.total ?? 0) - (selectedSale.enganche ?? 0)
            : 0;

    // --- Lógica para generar y visualizar el ticket como imagen ---
    const handleViewTicketImageAndShowModal = async () => {
        if (!selectedSale || !clienteInfoTicket || !vendedorInfoTicket || !ticketImageRef.current) {
            toast.error("Datos o referencia del ticket no disponibles para generar imagen.");
            return;
        }
        if (isProcessingImage) {
            return;
        }

        setIsProcessingImage(true);
        toast.loading('Generando imagen del ticket...', { id: 'processingImageTicketClient' });

        try {
            const canvas = await html2canvas(ticketImageRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: '#ffffff', // Asegurar un fondo blanco para el ticket
            });
            const dataUrl = canvas.toDataURL('image/png');
            const blob = await (await fetch(dataUrl)).blob();
            const imageFile = new File([blob], `Ticket_${selectedSale.codigo_venta || 'venta'}.png`, { type: 'image/png' });

            setGeneratedImageDataUrl(dataUrl);
            setGeneratedImageFile(imageFile);
            setIsImageActionModalOpen(true);
            toast.dismiss('processingImageTicketClient');

        } catch (error) {
            toast.error(`Error al generar imagen: ${error.message}`, { id: 'processingImageTicketClient' });
        } finally {
            setIsProcessingImage(false);
        }
    };

    // --- Lógica para compartir el ticket como imagen directamente ---
    const handleShareTicketAsImageDirectly = async () => {
        if (!selectedSale || !clienteInfoTicket || !vendedorInfoTicket || !ticketImageRef.current) {
            toast.error("Datos o referencia del ticket no disponibles para compartir imagen directamente.");
            return;
        }
        if (isProcessingImage) {
            return;
        }

        setIsProcessingImage(true);
        toast.loading('Preparando imagen para compartir...', { id: 'sharingTicketClient' });

        try {
            const canvas = await html2canvas(ticketImageRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: '#ffffff', // Asegurar un fondo blanco para el ticket
            });
            const dataUrl = canvas.toDataURL('image/png');
            const blob = await (await fetch(dataUrl)).blob();
            const imageFileToShare = new File([blob], `Ticket_${selectedSale.codigo_venta || 'venta'}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageFileToShare] })) {
                await navigator.share({
                    title: `Ticket de Venta ${selectedSale.codigo_venta || ''}`,
                    text: `Imagen del Ticket de Venta ${selectedSale.codigo_venta || ''}. Cliente: ${clienteInfoTicket?.nombre || selectedSale.display_cliente_nombre || 'Público General'}. Total: ${formatCurrency(selectedSale.total ?? 0)}.`,
                    files: [imageFileToShare],
                });
                toast.success('Ticket como imagen compartido exitosamente.', { id: 'sharingTicketClient' });
            } else {
                toast.info('No se pudo compartir directamente. Mostrando opciones...', { id: 'sharingTicketClient' });
                setGeneratedImageDataUrl(dataUrl);
                setGeneratedImageFile(imageFileToShare);
                setIsImageActionModalOpen(true);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                toast('Compartir imagen cancelado.', { id: 'sharingTicketClient' });
            } else {
                toast.error(`Error al compartir imagen: ${error.message}`, { id: 'sharingTicketClient' });
            }
        } finally {
            setIsProcessingImage(false);
        }
    };


    return (
        <>
            {/* Componente oculto para generar la imagen del ticket */}
            {selectedSale && clienteInfoTicket && vendedorInfoTicket && (
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -1 }}>
                    <TicketParaImagen
                        ref={ticketImageRef}
                        venta={selectedSale}
                        cliente={clienteInfoTicket}
                        vendedor={vendedorInfoTicket}
                        logoSrc={logoBase64} // Se pasa logoBase64 como prop
                        dateTimeFormatter={formatDateFunction} // Usa la función de formato de fecha prop
                        currencyFormatter={formatCurrency}
                    />
                </div>
            )}

            {/* Modal para acciones con la imagen generada (compartir/descargar) */}
            <ImageActionModal
                isOpen={isImageActionModalOpen}
                onClose={() => setIsImageActionModalOpen(false)}
                imageDataUrl={generatedImageDataUrl}
                imageFile={generatedImageFile}
                ventaCodigo={selectedSale?.codigo_venta}
                currencyFormatter={formatCurrency}
                clienteNombre={clienteInfoTicket?.nombre || selectedSale?.cliente_nombre}
                ventaTotal={selectedSale?.total}
            />

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
                                    Total Pagado: {formatCurrency(displayTotalPagado)}
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
                                    onClick={handleViewTicketImageAndShowModal}
                                    className="px-4 py-2 bg-dark-700 text-gray-200 rounded-md shadow-sm hover:bg-dark-600 transition-colors flex items-center"
                                >
                                    <FileText size={16} className="mr-1.5" />
                                    Ver Ticket
                                </button>
                                <button
                                    onClick={onShareTicket}
                                    className="px-4 py-2 bg-success-600 text-white rounded-md shadow-sm hover:bg-success-700 transition-colors flex items-center"
                                >
                                    <Share2 size={16} className="mr-1.5" />
                                    Compartir PDF
                                </button>
                                <button
                                    onClick={handleShareTicketAsImageDirectly}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-md shadow-sm hover:bg-primary-700 transition-colors flex items-center"
                                >
                                    <Image size={16} className="mr-1.5" />
                                    Compartir Imagen
                                </button>
                                <button
                                    onClick={() => onCancelSale(selectedSale)}
                                    disabled={cancelLoading}
                                    className={`px-4 py-2 rounded-md shadow-sm transition-colors flex items-center ${cancelLoading
                                        ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-error-600 text-white hover:bg-error-700'
                                        }`}
                                >
                                    <Trash2 size={16} className="mr-1.5" />
                                    {cancelLoading ? 'Cancelando...' : 'Eliminar Venta'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}