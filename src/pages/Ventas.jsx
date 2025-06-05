// src/pages/Ventas.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { ArrowLeft, FileText, Share2, Download, X } from 'lucide-react';

// Componentes divididos
import VentasFiltroBusqueda from '../components/ventas/VentasFiltroBusqueda';
import VentasTabla from '../components/ventas/VentasTabla';
import VentaDetalleModal from '../components/ventas/VentaDetalleModal';

import { useAuth } from '../contexts/AuthContext';

// Helpers
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return '$0.00';
    return numericAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
};

const getBase64Image = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error loading image for PDF:", error);
        return null;
    }
};

const formatTicketDateTime = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
        const date = new Date(dateString);
        // Formato dd/mm/aa HH:MM como en la imagen
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados
        const year = String(date.getFullYear()).slice(-2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
        console.error("Error formateando fecha para ticket:", e, dateString);
        return new Date(dateString).toLocaleString();
    }
};

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
    // NUEVO ESTILO PARA NOTA DE CRÉDITO
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
    // Si es una venta a crédito:
    //   - Si enganche está presente y > 0, muestra el enganche.
    //   - De lo contrario (no enganche o enganche es 0), muestra $0.
    // Para otros métodos de pago, muestra el total de la venta.
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
                    <div key={i} style={i === 0 ? firstProductItemStyles : productItemStyles}>
                        <span style={productNameStyles}>{p.nombre || 'Producto Desconocido'}</span>
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
                        <span style={{...totalValueStyles, color: '#dc3545'}}>- {currencyFormatter(venta.valor_descuento ?? 0)}</span>
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
                        <span style={{...totalLabelStyles, ...saldoAplicadoStyles}}>Saldo a Favor Aplicado:</span>
                        <span style={{...totalValueStyles, ...saldoAplicadoStyles}}>- {currencyFormatter(venta.monto_credito_aplicado ?? 0)}</span>
                    </div>
                )}
                {venta.forma_pago === 'Crédito cliente' && (venta.enganche ?? 0) > 0 && (
                    <div style={totalRowStyles}>
                        <span style={totalLabelStyles}>Enganche Pagado:</span>
                        <span style={totalValueStyles}>{currencyFormatter(venta.enganche ?? 0)}</span>
                    </div>
                )}
                 <div style={{...totalRowStyles, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #dee2e6'}}>
                    <span style={grandTotalLabelStyles}>Total Pagado:</span>
                    <span style={grandTotalValueStyles}>{currencyFormatter(displayTotalPagadoTicket)}</span>
                </div>
                {/* INICIO DE CAMBIOS PARA FORMA DE PAGO Y NOTA DE CRÉDITO */}
                <div style={{...totalRowStyles, marginTop: '5px', paddingTop: '5px'}}>
                    <span style={totalLabelStyles}>Forma de Pago:</span>
                    <span style={{...totalValueStyles, fontWeight: 'bold'}}>{venta.forma_pago || 'Desconocida'}</span>
                </div>
                {venta.forma_pago === 'Crédito cliente' && montoPendienteTicket > 0 && (
                    <p style={creditNoteStyles}>
                        *Venta a crédito. Pendiente: {currencyFormatter(montoPendienteTicket)}.
                    </p>
                )}
                {/* FIN DE CAMBIOS */}
            </div>

            <div style={footerStyles}>
                <p style={{margin: '2px 0'}}>¡Gracias por tu compra!</p>
                <p style={{margin: '2px 0'}}>Visítanos de nuevo pronto.</p>
            </div>
        </div>
    );
});

// Modal para visualizar la imagen del ticket y ofrecer acciones
const ImageActionModal = ({ isOpen, onClose, imageDataUrl, imageFile, ventaCodigo, currencyFormatter, clienteNombre, ventaTotal }) => {
    if (!isOpen || !imageDataUrl) return null;

    const handleShare = async () => {
        console.log("ImageActionModal: handleShare triggered");
        if (!imageFile) {
            toast.error("Archivo de imagen no disponible para compartir.");
            console.log("ImageActionModal: imageFile no disponible para compartir.");
            return;
        }
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
            try {
                console.log("ImageActionModal: Intentando navigator.share con archivo:", imageFile);
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
                    console.error("ImageActionModal: Error en navigator.share:", error);
                } else {
                    toast('Compartir cancelado.');
                    console.log("ImageActionModal: Compartir cancelado por el usuario.");
                }
            }
        } else {
            toast.info('La función de compartir archivos no está disponible en este navegador. Intenta descargar la imagen.');
            console.log("ImageActionModal: navigator.share no disponible o no puede compartir archivos.");
        }
    };

    const handleDownload = () => {
        console.log("ImageActionModal: handleDownload triggered");
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = `Ticket_${ventaCodigo || 'venta'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Imagen descargada.');
    };

    console.log("ImageActionModal: Renderizando. isOpen:", isOpen, "imageDataUrl:", !!imageDataUrl);
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
                        className="px-3 py-2 sm:px-4 bg-dark-600 text-gray-200 rounded-md shadow-sm hover:bg-dark-500 transition-colors flex items-center"
                    >
                        <X size={16} className="mr-1" />
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const [isImageActionModalOpen, setIsImageActionModalOpen] = useState(false);
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState(null);
  const [generatedImageFile, setGeneratedImageFile] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);


  const navigate = useNavigate();
  const [logoBase64, setLogoBase64] = useState(null);
  const [clienteInfoTicket, setClienteInfoTicket] = useState(null);
  const [vendedorInfoTicket, setVendedorInfoTicket] = useState(null);
  const [clienteBalanceTicket, setClienteBalanceTicket] = useState(0);

  const { user: currentUser } = useAuth();
  const ticketImageRef = useRef(null);

  const cargarVentas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        id, codigo_venta, cliente_id, fecha, forma_pago, tipo_descuento, valor_descuento, 
        subtotal, total, created_at, vendedor_id, enganche, gastos_envio, presupuesto_id, 
        monto_credito_aplicado, cliente_nombre, clientes ( nombre, telefono, correo, direccion ) 
      `)
      .order('fecha', { ascending: false });
    if (error) {
      console.error('❌ Error al cargar ventas:', error.message);
      toast.error('Error al cargar ventas.');
      setVentas([]);
    } else {
      const ventasConNombreClienteCorrecto = data.map(venta => ({
        ...venta,
        display_cliente_nombre: venta.clientes?.nombre || venta.cliente_nombre || 'Público General'
      }));
      setVentas(ventasConNombreClienteCorrecto || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    async function loadLogoImg() {
        const base64 = await getBase64Image('/images/PERFUMESELISA.png');
        setLogoBase64(base64);
    }
    loadLogoImg();
    cargarVentas();
  }, []);

  const handleSelectSale = async (venta) => {
    console.log("handleSelectSale: Iniciando para venta ID", venta.id);
    setVentaSeleccionada(null);
    setDetailLoading(true);
    setClienteInfoTicket(null);
    setVendedorInfoTicket(null);
    setClienteBalanceTicket(0);
    let ventaConDetallesYInfoCompleta = { ...venta, productos: [] };
    try {
        const { data: detalleItems, error: errDetalle } = await supabase
            .from('detalle_venta').select('*, productos(id, nombre)').eq('venta_id', venta.id);
        if (errDetalle) throw errDetalle;
        ventaConDetallesYInfoCompleta.productos = (detalleItems || []).map(item => ({
            ...item,
            nombreProducto: item.productos?.nombre || 'Producto desconocido',
            id: item.productos?.id || item.producto_id,
            nombre: item.productos?.nombre || 'Producto desconocido'
        }));
        
        console.log("handleSelectSale: Productos mapeados", ventaConDetallesYInfoCompleta.productos);

        if (venta.cliente_id) {
            const clienteData = venta.clientes || (await supabase.from('clientes').select('id, nombre, telefono, correo, direccion').eq('id', venta.cliente_id).single())?.data;
            setClienteInfoTicket(clienteData || { id: venta.cliente_id, nombre: venta.display_cliente_nombre });
            console.log("handleSelectSale: clienteInfoTicket seteado", clienteData || { id: venta.cliente_id, nombre: venta.display_cliente_nombre });
        } else { 
            setClienteInfoTicket({ id: null, nombre: venta.display_cliente_nombre });
            console.log("handleSelectSale: clienteInfoTicket seteado (Público General)", { id: null, nombre: venta.display_cliente_nombre });
        }
        if (venta.vendedor_id) {
            const { data: vendData, error: vendError } = await supabase.from('usuarios').select('id, nombre').eq('id', venta.vendedor_id).single();
            if (vendError) console.error("Error cargando vendedor:", vendError);
            setVendedorInfoTicket(vendData || { nombre: currentUser?.email || 'N/A' });
            console.log("handleSelectSale: vendedorInfoTicket seteado", vendData || { nombre: currentUser?.email || 'N/A' });
        } else { 
            setVendedorInfoTicket({ nombre: currentUser?.email || 'N/A' });
            console.log("handleSelectSale: vendedorInfoTicket seteado (N/A)", { nombre: currentUser?.email || 'N/A' });
        }
        if (venta.cliente_id) {
            const { data: balanceRpcData, error: balanceError } = await supabase.rpc('get_cliente_con_saldo', { p_cliente_id: venta.cliente_id });
            if (balanceError) console.error("Error cargando balance:", balanceError);
            setClienteBalanceTicket(balanceRpcData && balanceRpcData.length > 0 ? balanceRpcData[0].balance : 0);
        }
        setVentaSeleccionada(ventaConDetallesYInfoCompleta);
        console.log("handleSelectSale: ventaSeleccionada seteada", ventaConDetallesYInfoCompleta);
    } catch (error) {
        toast.error(`Error al cargar detalles: ${error.message}`);
        console.error("handleSelectSale: Error cargando detalles", error);
        setVentaSeleccionada(null);
    } finally { 
        setDetailLoading(false);
        console.log("handleSelectSale: Finalizado. detailLoading: false");
    }
  };
  
  const cancelarVentaSeleccionada = async () => {
    if (!ventaSeleccionada || cancelLoading) return;
    if (!confirm(`¿Seguro que quieres cancelar la venta ${ventaSeleccionada.codigo_venta}? Se restaurará el stock.`)) return;
    setCancelLoading(true);
    try {
      const detallesVenta = ventaSeleccionada.productos || [];
      for (const item of detallesVenta) {
        const { data: prodActual } = await supabase.from('productos').select('stock').eq('id', item.producto_id).single();
        await supabase.from('productos').update({ stock: (parseFloat(prodActual?.stock) || 0) + (parseFloat(item.cantidad) ?? 0) }).eq('id', item.producto_id);
      }
      await supabase.from('movimientos_cuenta_clientes').delete().eq('referencia_venta_id', ventaSeleccionada.id);
      await supabase.from('detalle_venta').delete().eq('venta_id', ventaSeleccionada.id);
      await supabase.from('ventas').delete().eq('id', ventaSeleccionada.id);
      toast.success(`Venta ${ventaSeleccionada.codigo_venta} cancelada.`);
      setVentaSeleccionada(null);
      cargarVentas();
    } catch (err) { toast.error(`Error al cancelar: ${err.message}`); } 
    finally { setCancelLoading(false); }
  };

  const handleShareTicketAsPDF = async () => {
      console.log("handleShareTicketAsPDF: Iniciando");
      if (!ventaSeleccionada || !ventaSeleccionada.productos || !clienteInfoTicket || !vendedorInfoTicket) {
          toast.error("Datos incompletos para generar el PDF.");
          console.log("handleShareTicketAsPDF: Datos incompletos", {ventaSeleccionada, clienteInfoTicket, vendedorInfoTicket});
          return;
      }
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const margin = 15; let yOffset = margin;
      const logoWidth = 30; const logoHeight = 30; const companyInfoX = margin + logoWidth + 10;
      if (logoBase64) doc.addImage(logoBase64, 'JPEG', margin, yOffset, logoWidth, logoHeight);
      else { doc.setFontSize(10); doc.text("Logo Aquí", margin + logoWidth / 2, yOffset + logoHeight / 2, { align: 'center' });}
      doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text('PERFUMES ELISA', companyInfoX, yOffset + 5);
      doc.setFontSize(10); doc.setFont(undefined, 'normal');
      doc.text('Ciudad Apodaca, N.L., C.P. 66640', companyInfoX, yOffset + 17); // Ajusta tu ciudad
      doc.text('Teléfono: 81 3080 4010', companyInfoX, yOffset + 22);
      doc.setFontSize(20); doc.setFont(undefined, 'bold'); doc.text('TICKET DE VENTA', doc.internal.pageSize.getWidth() - margin, yOffset + 10, { align: 'right' });
      doc.setFontSize(12); doc.setFont(undefined, 'normal'); doc.text(`Código: ${ventaSeleccionada.codigo_venta || 'N/A'}`, doc.internal.pageSize.getWidth() - margin, yOffset + 17, { align: 'right' });
      yOffset += Math.max(logoHeight, 30) + 15;
      doc.line(margin, yOffset, doc.internal.pageSize.getWidth() - margin, yOffset); yOffset += 10;
      const infoLabelFontSize = 9; const infoValueFontSize = 10; const infoLineHeight = 6;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('CLIENTE:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(clienteInfoTicket?.nombre || ventaSeleccionada.display_cliente_nombre || 'Público General', margin + doc.getTextWidth('CLIENTE:') + 5, yOffset); yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('TELÉFONO:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(clienteInfoTicket?.telefono || 'N/A', margin + doc.getTextWidth('TELÉFONO:') + 5, yOffset); yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('FECHA:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(formatTicketDateTime(ventaSeleccionada.fecha || ventaSeleccionada.created_at), margin + doc.getTextWidth('FECHA:') + 5, yOffset);
      yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('VENDEDOR:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(vendedorInfoTicket?.nombre || 'N/A', margin + doc.getTextWidth('VENDEDOR:') + 5, yOffset); yOffset += infoLineHeight * 2;
      const productsHead = [['Producto', 'Cant.', 'P. Unitario', 'Total Item']];
      const productsRows = (ventaSeleccionada.productos || []).map(p => [ p.nombre || '–', (parseFloat(p.cantidad ?? 0)).toString(), formatCurrency(p.precio_unitario ?? 0), formatCurrency(p.total_parcial ?? 0) ]);
      doc.autoTable({ head: productsHead, body: productsRows, startY: yOffset, theme: 'striped', styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [220,220,220], textColor: 0, fontStyle: 'bold'}, columnStyles: {0:{cellWidth:80},1:{cellWidth:15,halign:'center'},2:{cellWidth:25,halign:'right'},3:{cellWidth:30,halign:'right'}}, margin:{left:margin,right:margin}, didDrawPage:(data)=>{doc.setFontSize(8);doc.text('Página '+data.pageNumber,doc.internal.pageSize.getWidth()-margin,doc.internal.pageSize.getHeight()-margin,{align:'right'});}});
      yOffset = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yOffset + 10;
      const totalsLabelWidth = 45; const totalsValueStartX = doc.internal.pageSize.getWidth() - margin;
      const totalsLineHeight = 6; const totalsFontSize = 10; const finalTotalFontSize = 14;
      doc.setFontSize(totalsFontSize); doc.setFont(undefined, 'normal');
      doc.text('Subtotal (Productos):', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.text(formatCurrency(ventaSeleccionada.subtotal ?? 0), totalsValueStartX, yOffset, { align: 'right' }); yOffset += totalsLineHeight;
      if ((ventaSeleccionada.valor_descuento ?? 0) > 0) { doc.text('Descuento:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.setTextColor(220,53,69); doc.text(`- ${formatCurrency(ventaSeleccionada.valor_descuento ?? 0)}`, totalsValueStartX, yOffset, { align: 'right' }); doc.setTextColor(0,0,0); yOffset += totalsLineHeight; }
      if ((ventaSeleccionada.gastos_envio ?? 0) > 0) { doc.text('Gastos de Envío:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.text(formatCurrency(ventaSeleccionada.gastos_envio ?? 0), totalsValueStartX, yOffset, { align: 'right' }); yOffset += totalsLineHeight; }
      if ((ventaSeleccionada.monto_credito_aplicado ?? 0) > 0) { doc.text('Saldo a Favor Aplicado:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.setTextColor(40,167,69); doc.text(`- ${formatCurrency(ventaSeleccionada.monto_credito_aplicado ?? 0)}`, totalsValueStartX, yOffset, { align: 'right' }); doc.setTextColor(0,0,0); yOffset += totalsLineHeight; }
      // Determinar el monto a mostrar como "Total Pagado" en el PDF
      // Si es una venta a crédito:
      //   - Si enganche está presente y > 0, muestra el enganche.
      //   - De lo contrario (no enganche o enganche es 0), muestra $0.
      // Para otros métodos de pago, muestra el total de la venta.
      const displayTotalPagadoPdf = 
        ventaSeleccionada.forma_pago === 'Crédito cliente'
          ? (ventaSeleccionada.enganche && ventaSeleccionada.enganche > 0 ? ventaSeleccionada.enganche : 0)
          : ventaSeleccionada.total;
      
      if (ventaSeleccionada.forma_pago === 'Crédito cliente' && (ventaSeleccionada.enganche ?? 0) > 0) { 
        doc.text('Enganche Pagado:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); 
        doc.text(formatCurrency(ventaSeleccionada.enganche ?? 0), totalsValueStartX, yOffset, { align: 'right' }); 
        yOffset += totalsLineHeight; 
      }
      doc.text('Forma de Pago:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.text(ventaSeleccionada.forma_pago || 'Desconocida', totalsValueStartX, yOffset, { align: 'right' });
      yOffset += totalsLineHeight * 1.5; // Espacio extra antes del total

      doc.setFontSize(finalTotalFontSize); doc.setFont(undefined, 'bold'); doc.text('TOTAL PAGADO:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.setTextColor(40,167,69); doc.text(formatCurrency(displayTotalPagadoPdf), totalsValueStartX, yOffset, { align: 'right' }); doc.setTextColor(0,0,0); yOffset += finalTotalFontSize + 5;
       if (ventaSeleccionada.forma_pago === 'Crédito cliente') {
           const balFontSize=10, balValFontSize=12, balNoteSize=8, balLineHeight=5; const curBal=(clienteBalanceTicket??0);
           doc.setFontSize(balFontSize); doc.setFont(undefined,'bold'); doc.text('BALANCE DE CUENTA ACTUAL',margin,yOffset); yOffset+=balLineHeight*2;
           doc.setFontSize(balValFontSize+2); doc.setFont(undefined,'bold'); doc.text('Saldo Actual Cliente:',margin+10,yOffset);
           if(curBal > 0) doc.setTextColor(220,53,69); else doc.setTextColor(40,167,69);
           doc.text(formatCurrency(curBal),doc.internal.pageSize.getWidth()-margin,yOffset,{align:'right'}); doc.setTextColor(0,0,0); yOffset+=balLineHeight*2;
           doc.setFontSize(balNoteSize); doc.setFont(undefined,'normal'); doc.text(curBal > 0 ? '(Saldo positivo indica deuda del cliente)' : (curBal < 0 ? '(Saldo negativo indica crédito a favor del cliente)' : ''), margin, yOffset); yOffset+=balLineHeight*2;
       }
      const footFontSize=8, footLineHeight=4; doc.setFontSize(footFontSize); doc.setFont(undefined,'normal');
      doc.text('¡Gracias por tu compra!',margin,yOffset); yOffset+=footLineHeight; doc.text('Visítanos de nuevo pronto.',margin,yOffset);
      try {
          const pdfBlob = doc.output('blob');
          const pdfFile = new File([pdfBlob], `Ticket_${ventaSeleccionada.codigo_venta || 'venta'}.pdf`, { type: 'application/pdf' });
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
              await navigator.share({
                  title: `Ticket de Venta ${ventaSeleccionada.codigo_venta || ''}`,
                  text: `Adjunto: Ticket de Venta ${ventaSeleccionada.codigo_venta || ''}.`,
                  files: [pdfFile],
              });
              toast.success('Ticket PDF compartido.');
          } else {
              // Fallback: descargar el PDF si la API de compartir no está disponible o falla
              const link = document.createElement('a');
              link.href = URL.createObjectURL(pdfBlob);
              link.download = `Ticket_${ventaSeleccionada.codigo_venta || 'venta'}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(link.href); // Limpiar URL
              toast.info('Compartir no disponible. PDF descargado.');
          }
      } catch (error) {
          if (error.name === 'AbortError') { toast('Compartir PDF cancelado.'); } 
          else { toast.error(`Error al compartir PDF: ${error.message}`); console.error("Error PDF:", error); }
      }
  };

  const handleViewTicketImageAndShowModal = async () => {
    console.log("handleViewTicketImageAndShowModal: Iniciando...");
    if (!ventaSeleccionada || !clienteInfoTicket || !vendedorInfoTicket || !ticketImageRef.current) {
        toast.error("Datos o referencia del ticket no disponibles para generar imagen.");
        console.error("handleViewTicketImageAndShowModal: Faltan datos o ref:", {
            ventaSeleccionada: !!ventaSeleccionada,
            clienteInfoTicket: !!clienteInfoTicket,
            vendedorInfoTicket: !!vendedorInfoTicket,
            ticketImageRefCurrent: ticketImageRef.current
        });
        return;
    }
    if (isProcessingImage) {
        console.log("handleViewTicketImageAndShowModal: Ya se está procesando una imagen.");
        return;
    }

    setIsProcessingImage(true);
    toast.loading('Generando imagen del ticket...', { id: 'processingImageToast' });
    console.log("handleViewTicketImageAndShowModal: Estado isProcessingImage = true.");

    try {
        console.log("handleViewTicketImageAndShowModal: Intentando html2canvas sobre:", ticketImageRef.current);
        const canvas = await html2canvas(ticketImageRef.current, { 
            useCORS: true, scale: 2, backgroundColor: '#ffffff', 
        });
        console.log("handleViewTicketImageAndShowModal: html2canvas completado.");
        const dataUrl = canvas.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        const imageFile = new File([blob], `Ticket_${ventaSeleccionada.codigo_venta || 'venta'}.png`, { type: 'image/png' });
        console.log("handleViewTicketImageAndShowModal: Blob y File generados.");
        
        setGeneratedImageDataUrl(dataUrl);
        setGeneratedImageFile(imageFile);
        setIsImageActionModalOpen(true);
        console.log("handleViewTicketImageAndShowModal: ImageActionModal debería abrirse.");
        toast.dismiss('processingImageToast');

    } catch (error) {
        toast.error(`Error al generar imagen: ${error.message}`, { id: 'processingImageToast' });
        console.error("handleViewTicketImageAndShowModal: Error en html2canvas:", error);
    } finally {
        setIsProcessingImage(false);
        console.log("handleViewTicketImageAndShowModal: Finalizado.");
    }
  };

  const handleShareTicketAsImageDirectly = async () => {
    console.log("handleShareTicketAsImageDirectly: Iniciando...");
    if (!ventaSeleccionada || !clienteInfoTicket || !vendedorInfoTicket || !ticketImageRef.current) {
        toast.error("Datos o referencia del ticket no disponibles para compartir imagen directamente.");
        console.error("handleShareTicketAsImageDirectly: Faltan datos o ref.");
        return;
    }
    if (isProcessingImage) {
        console.log("handleShareTicketAsImageDirectly: Ya se está procesando una imagen.");
        return;
    }

    setIsProcessingImage(true);
    toast.loading('Preparando imagen para compartir...', { id: 'sharingDirectlyToast' });
    console.log("handleShareTicketAsImageDirectly: Estado isProcessingImage = true.");

    try {
        const canvas = await html2canvas(ticketImageRef.current, { 
            useCORS: true, scale: 2, backgroundColor: '#ffffff',
        });
        const dataUrl = canvas.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        const imageFileToShare = new File([blob], `Ticket_${ventaSeleccionada.codigo_venta || 'venta'}.png`, { type: 'image/png' });
        console.log("handleShareTicketAsImageDirectly: Imagen generada, intentando compartir.");

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageFileToShare] })) {
            await navigator.share({
                title: `Ticket de Venta ${ventaSeleccionada.codigo_venta || ''}`,
                text: `Imagen del Ticket de Venta ${ventaSeleccionada.codigo_venta || ''}. Cliente: ${clienteInfoTicket?.nombre || ventaSeleccionada.display_cliente_nombre || 'Público General'}. Total: ${formatCurrency(ventaSeleccionada.total ?? 0)}.`,
                files: [imageFileToShare],
            });
            toast.success('Ticket como imagen compartido exitosamente.', { id: 'sharingDirectlyToast' });
        } else {
            toast.info('No se pudo compartir directamente. Mostrando opciones...', { id: 'sharingDirectlyToast' });
            setGeneratedImageDataUrl(dataUrl);
            setGeneratedImageFile(imageFileToShare);
            setIsImageActionModalOpen(true);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            toast('Compartir imagen cancelado.', { id: 'sharingDirectlyToast' });
        } else {
            toast.error(`Error al compartir imagen: ${error.message}`, { id: 'sharingDirectlyToast' });
            console.error("handleShareTicketAsImageDirectly: Error:", error);
        }
    } finally {
        setIsProcessingImage(false);
        console.log("handleShareTicketAsImageDirectly: Finalizado.");
    }
  };


  const ventasFiltradasMemo = useMemo(() => {
    return ventas.filter(v =>
        (v.display_cliente_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (v.codigo_venta || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (v.forma_pago || '').toLowerCase().includes(busqueda.toLowerCase())
      );
  }, [ventas, busqueda]);

  return (
    <>
      {ventaSeleccionada && clienteInfoTicket && vendedorInfoTicket && (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -1 }}>
              <TicketParaImagen 
                  ref={ticketImageRef}
                  venta={ventaSeleccionada}
                  cliente={clienteInfoTicket}
                  vendedor={vendedorInfoTicket}
                  logoSrc={logoBase64}
                  dateTimeFormatter={formatTicketDateTime}
                  currencyFormatter={formatCurrency}
              />
          </div>
      )}

      <ImageActionModal
          isOpen={isImageActionModalOpen}
          onClose={() => setIsImageActionModalOpen(false)}
          imageDataUrl={generatedImageDataUrl}
          imageFile={generatedImageFile} 
          ventaCodigo={ventaSeleccionada?.codigo_venta}
          currencyFormatter={formatCurrency}
          clienteNombre={clienteInfoTicket?.nombre || ventaSeleccionada?.display_cliente_nombre}
          ventaTotal={ventaSeleccionada?.total}
      />

      <div className="min-h-screen bg-dark-900 p-4 md:p-8 lg:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <button 
            onClick={() => navigate('/')} 
            className="px-6 py-2 bg-dark-800 text-gray-200 font-semibold rounded-lg shadow-elegant-dark hover:bg-dark-700 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Volver al inicio
          </button>
          <h1 className="text-3xl font-bold text-gray-100 text-center">Historial de Ventas</h1>
          <div className="w-full md:w-[150px]" />
        </div>
        
        <VentasFiltroBusqueda busqueda={busqueda} onBusquedaChange={setBusqueda} />
        <VentasTabla
          ventasFiltradas={ventasFiltradasMemo}
          onSelectSale={handleSelectSale}
          loading={loading}
          busqueda={busqueda}
          formatDateFunction={formatTicketDateTime} 
        />

        {ventaSeleccionada && (
          <VentaDetalleModal
              isOpen={!!ventaSeleccionada}
              onClose={() => { setVentaSeleccionada(null); setIsImageActionModalOpen(false);  }}
              ventaSeleccionada={ventaSeleccionada}
              detailLoading={detailLoading}
              clienteInfoTicket={clienteInfoTicket}
              vendedorInfoTicket={vendedorInfoTicket}
              clienteBalanceTicket={clienteBalanceTicket}
              onShareTicket={handleShareTicketAsPDF} 
              onShareTicketAsImage={handleShareTicketAsImageDirectly} 
              onViewTicketImage={handleViewTicketImageAndShowModal} 
              onCancelSale={cancelarVentaSeleccionada}
              cancelLoading={cancelLoading}
              formatDateFunction={formatTicketDateTime}
          />
        )}
      </div>
    </>
  );
}