// src/pages/Clientes.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react'; // Agregado useRef
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { useClientes } from '../contexts/ClientesContext';
import NewClientModal from '../components/NewClientModal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas'; // Importar html2canvas

// Componentes divididos
import ClientesAccionesBarra from '../components/clientes/ClientesAccionesBarra';
import ClientesTabla from '../components/clientes/ClientesTabla';
import ClientesPaginacion from '../components/clientes/ClientesPaginacion';
import ClienteVentasModal from '../components/clientes/ClienteVentasModal';
import ClienteVentaDetalleModal from '../components/clientes/ClienteVentaDetalleModal';
// import HtmlTicketDisplay from '../components/HtmlTicketDisplay'; // Eliminado, "Ver Ticket" ahora muestra imagen

import { useAuth } from '../contexts/AuthContext';

// Helpers (ya existentes)
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
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
        console.error("Error formateando fecha para ticket:", e, dateString);
        return new Date(dateString).toLocaleString();
    }
};

// --- Componente TicketParaImagen (adaptado del Canvas Ventas.jsx) ---
const TicketParaImagen = React.forwardRef(({ venta, cliente, vendedor, logoSrc, dateTimeFormatter, currencyFormatter }, ref) => {
    if (!venta || !cliente || !vendedor) {
        return null;
    }
    const ticketStyles = {
        width: '300px', padding: '15px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        fontSize: '12px', backgroundColor: '#fff', color: '#212529', boxSizing: 'border-box',
    };
    const headerSectionStyles = { display: 'flex', alignItems: 'center', marginBottom: '12px',};
    const logoContainerStyles = { marginRight: '10px',};
    const logoStyles = { maxWidth: '40px', maxHeight: '40px', display: 'block',};
    const titleAndCodeStyles = { flexGrow: 1,};
    const ticketTitleStyles = { fontSize: '16px', fontWeight: '600', margin: '0', color: '#000',};
    const ticketCodeStyles = { fontSize: '10px', color: '#6c757d', margin: '0',};
    const companyContactStyles = { textAlign: 'center', fontSize: '10px', color: '#6c757d', margin: '5px 0 12px 0',};
    const infoSectionStyles = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px', fontSize: '11px',};
    const infoBlockStyles = {};
    const infoLabelStyles = { fontWeight: '600', color: '#495057', display: 'block', marginBottom: '2px',};
    const infoValueStyles = { display: 'block', color: '#212529', marginBottom: '5px',};
    const productDetailsSectionStyles = { marginBottom: '12px',};
    const productDetailsTitleStyles = { fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#000',};
    const productItemStyles = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '4px 0', fontSize: '11px', borderTop: '1px solid #f0f0f0',};
    const firstProductItemStyles = { ...productItemStyles, borderTop: 'none', paddingTop: '0',};
    const productNameStyles = { flex: '1', marginRight: '8px', wordBreak: 'break-word',};
    const productQuantityPriceStyles = { textAlign: 'right', minWidth: '80px', whiteSpace: 'nowrap', color: '#495057',};
    const totalsSectionStyles = { marginTop: '12px', fontSize: '12px',};
    const totalRowStyles = { display: 'flex', justifyContent: 'space-between', padding: '3px 0',};
    const totalLabelStyles = { color: '#495057',};
    const totalValueStyles = { fontWeight: '500', color: '#212529',};
    const grandTotalLabelStyles = { fontSize: '14px', fontWeight: '600', color: '#000',};
    const grandTotalValueStyles = { fontSize: '14px', fontWeight: '600', color: '#28a745',};
    const saldoAplicadoStyles = { color: '#007bff', fontWeight: '500',};
    const hrMinimalistStyle = { border: 'none', borderTop: '1px solid #dee2e6', margin: '12px 0',};
    const footerStyles = { textAlign: 'center', marginTop: '15px', fontSize: '10px', color: '#6c757d',};

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
                    <span style={infoValueStyles}>{cliente?.nombre || venta.cliente_nombre || 'Público General'}</span>
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
                    <div key={p.id || i} style={i === 0 ? firstProductItemStyles : productItemStyles}> {/* Asegurar key única */}
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
                {(venta.valor_descuento ?? 0) > 0 && ( <div style={totalRowStyles}> <span style={totalLabelStyles}>Descuento:</span> <span style={{...totalValueStyles, color: '#dc3545'}}>- {currencyFormatter(venta.valor_descuento ?? 0)}</span> </div> )}
                {(venta.gastos_envio ?? 0) > 0 && ( <div style={totalRowStyles}> <span style={totalLabelStyles}>Envío:</span> <span style={totalValueStyles}>{currencyFormatter(venta.gastos_envio ?? 0)}</span> </div> )}
                {(venta.monto_credito_aplicado ?? 0) > 0 && ( <div style={totalRowStyles}> <span style={{...totalLabelStyles, ...saldoAplicadoStyles}}>Saldo a Favor Aplicado:</span> <span style={{...totalValueStyles, ...saldoAplicadoStyles}}>- {currencyFormatter(venta.monto_credito_aplicado ?? 0)}</span> </div> )}
                 <div style={{...totalRowStyles, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #dee2e6'}}> <span style={grandTotalLabelStyles}>Total Pagado:</span> <span style={grandTotalValueStyles}>{currencyFormatter(venta.total ?? 0)}</span> </div>
            </div>
            <div style={footerStyles}> <p style={{margin: '2px 0'}}>¡Gracias por tu compra!</p> <p style={{margin: '2px 0'}}>Visítanos de nuevo pronto.</p> </div>
        </div>
    );
});

// --- Componente ImageActionModal (adaptado del Canvas Ventas.jsx) ---
const ImageActionModal = ({ isOpen, onClose, imageDataUrl, imageFile, ventaCodigo, currencyFormatter, clienteNombre, ventaTotal }) => {
    if (!isOpen || !imageDataUrl) return null;
    const handleShare = async () => {
        if (!imageFile) { toast.error("Archivo no disponible."); return; }
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
            try {
                await navigator.share({
                    title: `Ticket Venta ${ventaCodigo || ''}`,
                    text: `Ticket Venta ${ventaCodigo || ''}. Cliente: ${clienteNombre || 'Público General'}. Total: ${currencyFormatter(ventaTotal ?? 0)}.`,
                    files: [imageFile],
                });
                toast.success('Ticket compartido.');
                onClose(); 
            } catch (error) {
                if (error.name !== 'AbortError') { toast.error(`Error: ${error.message}`);} 
                else {toast('Compartir cancelado.');}
            }
        } else { toast.info('Compartir archivos no disponible. Intenta descargar.');}
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
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 overflow-y-auto h-full w-full z-[100] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-auto max-w-xs sm:max-w-sm md:max-w-md relative flex flex-col items-center p-3 sm:p-4" onClick={e => e.stopPropagation()}>
                <div className="w-full mb-4 flex justify-center">
                    <img src={imageDataUrl} alt="Ticket de Venta" className="max-w-full h-auto max-h-[70vh] object-contain shadow-md" />
                </div>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 w-full">
                    <button onClick={handleShare} className="px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700">Compartir Imagen</button>
                    <button onClick={handleDownload} className="px-3 py-2 sm:px-4 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700">Descargar Imagen</button>
                    <button onClick={onClose} className="px-3 py-2 sm:px-4 bg-gray-500 text-white rounded-md shadow-sm hover:bg-gray-600">Cerrar</button>
                </div>
            </div>
        </div>
    );
};


export default function Clientes() {
  const navigate = useNavigate();
  const { clientes, loading: clientesLoadingFromContext, addCliente, actualizarCliente, eliminarCliente: eliminarClienteContext } = useClientes();
  const { user: currentUser } = useAuth();

  const [busqueda, setBusqueda] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [clienteActualParaVentas, setClienteActualParaVentas] = useState(null); 
  const [ventasDelClienteSeleccionado, setVentasDelClienteSeleccionado] = useState([]);
  const [clientSalesLoading, setClientSalesLoading] = useState(false);
  
  const [showNewOrEditClientModal, setShowNewOrEditClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  const [showSaleDetailModal, setShowSaleDetailModal] = useState(false);
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState(null);
  const [selectedSaleDetailsItems, setSelectedSaleDetailsItems] = useState([]); // Productos de la venta seleccionada
  const [detailLoading, setDetailLoading] = useState(false); // Para el modal de detalle de venta
  const [cancelSaleLoading, setCancelSaleLoading] = useState(false); // Para el botón de cancelar venta

  // Estados para la funcionalidad de tickets (PDF e Imagen)
  const [logoBase64, setLogoBase64] = useState(null);
  const [clienteInfoForTicket, setClienteInfoForTicket] = useState(null); // Cliente de la venta para el ticket
  const [vendedorInfoForTicket, setVendedorInfoForTicket] = useState(null); // Vendedor para el ticket
  const [clienteBalanceForTicket, setClienteBalanceForTicket] = useState(0); // Saldo del cliente para el ticket

  const [isImageActionModalOpen, setIsImageActionModalOpen] = useState(false);
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState(null);
  const [generatedImageFile, setGeneratedImageFile] = useState(null); 
  const [isProcessingImage, setIsProcessingImage] = useState(false); 
  const ticketImageRef = useRef(null);


  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);
  const [sortColumn, setSortColumn] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
      async function loadLogoImg() {
          const base64 = await getBase64Image('/images/PERFUMESELISAwhite.jpg');
          setLogoBase64(base64);
      }
      loadLogoImg();
  }, []);

  const handleSort = (column) => {
      setSortDirection(prevDirection => (sortColumn === column && prevDirection === 'asc' ? 'desc' : 'asc'));
      setSortColumn(column);
      setPagina(1);
  };

  const clientesFiltradosYOrdenados = useMemo(() => {
      let clientesTrabajo = [...clientes];
      if (busqueda) {
          const lowerBusqueda = busqueda.toLowerCase();
          clientesTrabajo = clientesTrabajo.filter(c =>
              (c.nombre || '').toLowerCase().includes(lowerBusqueda) ||
              (c.telefono || '').toLowerCase().includes(lowerBusqueda) ||
              (c.correo || '').toLowerCase().includes(lowerBusqueda) ||
              (c.direccion || '').toLowerCase().includes(lowerBusqueda)
          );
      }
      if (sortColumn) {
          clientesTrabajo.sort((a, b) => {
              const aValue = a[sortColumn] || '';
              const bValue = b[sortColumn] || '';
              if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
              if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return clientesTrabajo;
  }, [clientes, busqueda, sortColumn, sortDirection]);

  const inicio = (pagina - 1) * porPagina;
  const clientesPag = clientesFiltradosYOrdenados.slice(inicio, inicio + porPagina);
  const totalPaginas = Math.ceil(clientesFiltradosYOrdenados.length / porPagina);

  const handleVerCompras = async (cliente) => {
    setClienteActualParaVentas(cliente);
    setVentasDelClienteSeleccionado([]);
    setClientSalesLoading(true);
    try {
        const { data, error } = await supabase
          .from('ventas')
          .select('*, monto_credito_aplicado, enganche, gastos_envio, cliente_nombre, clientes(nombre, telefono, correo, direccion)') // Incluir datos del cliente si es necesario
          .eq('cliente_id', cliente.id)
          .order('fecha', { ascending: false }); 
        if (error) throw error;
        
        // Mapear para asegurar que display_cliente_nombre (o similar) esté disponible si se usa en TicketParaImagen
        const ventasMapeadas = data.map(v => ({
            ...v,
            // Usar el nombre del cliente de la relación si existe, sino el campo cliente_nombre de la venta
            display_cliente_nombre: v.clientes?.nombre || v.cliente_nombre || 'Público General'
        }));
        setVentasDelClienteSeleccionado(ventasMapeadas || []);

    } catch (error) {
        console.error('Error al obtener ventas del cliente:', error.message);
        toast.error('Error al cargar historial de ventas.');
    } finally {
        setClientSalesLoading(false);
    }
  };

  // Esta función ahora prepara los datos para el modal de detalle de venta Y para los tickets
  const handleSelectSaleForDetail = async (venta) => {
    setSelectedSaleForDetail(venta); 
    setDetailLoading(true);
    setSelectedSaleDetailsItems([]);
    
    // Información específica para el ticket
    setClienteInfoForTicket(null);
    setVendedorInfoForTicket(null);
    setClienteBalanceForTicket(0);

    try {
        const { data: detalleItems, error: errDetalle } = await supabase
            .from('detalle_venta')
            .select('*, productos(id, nombre)') // Asegurar que se trae el id y nombre del producto
            .eq('venta_id', venta.id);
        if (errDetalle) throw errDetalle;
        
        const mappedDetails = (detalleItems || []).map(item => ({
            ...item,
            nombreProducto: item.productos?.nombre || 'Producto desconocido', // Usado en ClienteVentaDetalleModal
            id: item.productos?.id || item.producto_id, // Usado como key en TicketParaImagen
            nombre: item.productos?.nombre || 'Producto desconocido' // Usado en TicketParaImagen
        }));
        setSelectedSaleDetailsItems(mappedDetails);
        // Actualizar la venta seleccionada con los productos mapeados para TicketParaImagen
        setSelectedSaleForDetail(prev => ({...prev, productos: mappedDetails}));


        // Obtener información del cliente para el ticket
        if (venta.cliente_id) {
            // Si la venta tiene un cliente_id, intentar obtener sus datos completos
             const { data: cliData, error: cliError } = await supabase.from('clientes')
                .select('id, nombre, telefono, correo, direccion').eq('id', venta.cliente_id).single();
            if (cliError) console.error("Error cargando cliente para ticket:", cliError);
            setClienteInfoForTicket(cliData || { id: venta.cliente_id, nombre: venta.cliente_nombre || venta.display_cliente_nombre || 'Público General' });
        } else {
            // Venta a público general
            setClienteInfoForTicket({ id: null, nombre: venta.cliente_nombre || venta.display_cliente_nombre || 'Público General' });
        }

        // Obtener información del vendedor para el ticket
        if (venta.vendedor_id) {
            const { data: vendData, error: vendError } = await supabase.from('usuarios')
                .select('id, nombre').eq('id', venta.vendedor_id).single();
            if (vendError) console.error("Error cargando vendedor para ticket:", vendError);
            setVendedorInfoForTicket(vendData || { nombre: currentUser?.email || 'N/A' });
        } else {
            setVendedorInfoForTicket({ nombre: currentUser?.email || 'N/A' });
        }
        
        // Obtener balance del cliente para el ticket
        if (venta.cliente_id) {
            const { data: balanceData, error: balanceError } = await supabase.rpc('get_cliente_con_saldo', { p_cliente_id: venta.cliente_id });
            if (balanceError) console.error("Error cargando balance para ticket:", balanceError);
            setClienteBalanceForTicket(balanceData && balanceData.length > 0 ? balanceData[0].balance : 0);
        }

    } catch (error) {
        toast.error(`Error al cargar detalles de la venta: ${error.message}`);
    } finally {
        setDetailLoading(false);
        setShowSaleDetailModal(true); // Abrir el modal de detalle de venta
    }
  };
  
  const handleCancelSaleFromCliente = async (ventaACancelar) => {
    if (cancelSaleLoading) return;
    if (!window.confirm(`¿Seguro que quieres cancelar la venta ${ventaACancelar.codigo_venta}? Se restaurará el stock.`)) return;
    setCancelSaleLoading(true);
    try {
      const { data: detallesVenta = [] } = await supabase.from('detalle_venta').select('producto_id, cantidad').eq('venta_id', ventaACancelar.id);
      for (const item of detallesVenta) {
        const { data: prodActual } = await supabase.from('productos').select('stock').eq('id', item.producto_id).single();
        const nuevoStock = (parseFloat(prodActual?.stock) || 0) + (parseFloat(item.cantidad) ?? 0);
        await supabase.from('productos').update({ stock: nuevoStock }).eq('id', item.producto_id);
      }
      await supabase.from('movimientos_cuenta_clientes').delete().eq('referencia_venta_id', ventaACancelar.id);
      await supabase.from('detalle_venta').delete().eq('venta_id', ventaACancelar.id);
      await supabase.from('ventas').delete().eq('id', ventaACancelar.id);

      toast.success(`Venta ${ventaACancelar.codigo_venta} cancelada.`);
      setShowSaleDetailModal(false); 
      // Actualizar la lista de ventas del cliente
      if (clienteActualParaVentas) {
        handleVerCompras(clienteActualParaVentas); // Recargar ventas del cliente
      }
    } catch (err) {
      toast.error(`Error al cancelar venta: ${err.message}`);
    } finally {
      setCancelSaleLoading(false);
    }
  };

  // --- Funciones de Ticket adaptadas de Ventas.jsx ---
  const handleShareTicketAsPDFFromCliente = async () => {
      if (!selectedSaleForDetail || !selectedSaleDetailsItems.length || !clienteInfoForTicket || !vendedorInfoForTicket) {
          toast.error("Datos incompletos para generar el PDF."); return;
      }
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const margin = 15; let yOffset = margin;
      const logoWidth = 30; const logoHeight = 30; const companyInfoX = margin + logoWidth + 10;

      if (logoBase64) doc.addImage(logoBase64, 'JPEG', margin, yOffset, logoWidth, logoHeight);
      else { doc.setFontSize(10); doc.text("Logo Aquí", margin + logoWidth / 2, yOffset + logoHeight / 2, { align: 'center' });}

      doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text('PERFUMES ELISA', companyInfoX, yOffset + 5);
      doc.setFontSize(10); doc.setFont(undefined, 'normal');
      doc.text('Ciudad Apodaca, N.L., C.P. 66640', companyInfoX, yOffset + 17);
      doc.text('Teléfono: 81 3080 4010', companyInfoX, yOffset + 22);
      doc.setFontSize(20); doc.setFont(undefined, 'bold'); doc.text('TICKET DE VENTA', doc.internal.pageSize.getWidth() - margin, yOffset + 10, { align: 'right' });
      doc.setFontSize(12); doc.setFont(undefined, 'normal'); doc.text(`Código: ${selectedSaleForDetail.codigo_venta || 'N/A'}`, doc.internal.pageSize.getWidth() - margin, yOffset + 17, { align: 'right' });
      yOffset += Math.max(logoHeight, 30) + 15;
      doc.line(margin, yOffset, doc.internal.pageSize.getWidth() - margin, yOffset); yOffset += 10;
      const infoLabelFontSize = 9; const infoValueFontSize = 10; const infoLineHeight = 6;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('CLIENTE:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(clienteInfoForTicket?.nombre || selectedSaleForDetail.cliente_nombre || 'Público General', margin + doc.getTextWidth('CLIENTE:') + 5, yOffset); yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('TELÉFONO:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(clienteInfoForTicket?.telefono || 'N/A', margin + doc.getTextWidth('TELÉFONO:') + 5, yOffset); yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('FECHA:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(formatTicketDateTime(selectedSaleForDetail.fecha || selectedSaleForDetail.created_at), margin + doc.getTextWidth('FECHA:') + 5, yOffset);
      yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('VENDEDOR:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(vendedorInfoForTicket?.nombre || 'N/A', margin + doc.getTextWidth('VENDEDOR:') + 5, yOffset); yOffset += infoLineHeight * 2;
      const productsHead = [['Producto', 'Cant.', 'P. Unitario', 'Total Item']];
      const productsRows = selectedSaleDetailsItems.map(p => [ p.nombreProducto || p.nombre || '–', (parseFloat(p.cantidad ?? 0)).toString(), formatCurrency(p.precio_unitario ?? 0), formatCurrency(p.total_parcial ?? 0) ]);
      doc.autoTable({ head: productsHead, body: productsRows, startY: yOffset, theme: 'striped', styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [220,220,220], textColor: 0, fontStyle: 'bold'}, columnStyles: {0:{cellWidth:80},1:{cellWidth:15,halign:'center'},2:{cellWidth:25,halign:'right'},3:{cellWidth:30,halign:'right'}}, margin:{left:margin,right:margin}, didDrawPage:(data)=>{doc.setFontSize(8);doc.text('Página '+data.pageNumber,doc.internal.pageSize.getWidth()-margin,doc.internal.pageSize.getHeight()-margin,{align:'right'});}});
      yOffset = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yOffset + 10;
      const totalsLabelWidth = 45; const totalsValueStartX = doc.internal.pageSize.getWidth() - margin;
      const totalsLineHeight = 6; const totalsFontSize = 10; const finalTotalFontSize = 14;
      doc.setFontSize(totalsFontSize); doc.setFont(undefined, 'normal');
      doc.text('Subtotal (Productos):', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.text(formatCurrency(selectedSaleForDetail.subtotal ?? 0), totalsValueStartX, yOffset, { align: 'right' }); yOffset += totalsLineHeight;
      if ((selectedSaleForDetail.valor_descuento ?? 0) > 0) { doc.text('Descuento:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.setTextColor(220,53,69); doc.text(`- ${formatCurrency(selectedSaleForDetail.valor_descuento ?? 0)}`, totalsValueStartX, yOffset, { align: 'right' }); doc.setTextColor(0,0,0); yOffset += totalsLineHeight; }
      if ((selectedSaleForDetail.gastos_envio ?? 0) > 0) { doc.text('Gastos de Envío:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.text(formatCurrency(selectedSaleForDetail.gastos_envio ?? 0), totalsValueStartX, yOffset, { align: 'right' }); yOffset += totalsLineHeight; }
      if ((selectedSaleForDetail.monto_credito_aplicado ?? 0) > 0) { doc.text('Saldo a Favor Aplicado:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.setTextColor(40,167,69); doc.text(`- ${formatCurrency(selectedSaleForDetail.monto_credito_aplicado ?? 0)}`, totalsValueStartX, yOffset, { align: 'right' }); doc.setTextColor(0,0,0); yOffset += totalsLineHeight; }
      if (selectedSaleForDetail.forma_pago === 'Crédito cliente' && (selectedSaleForDetail.enganche ?? 0) > 0) { doc.text('Enganche Pagado:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.text(formatCurrency(selectedSaleForDetail.enganche ?? 0), totalsValueStartX, yOffset, { align: 'right' }); yOffset += totalsLineHeight; }
      doc.text('Forma de Pago:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.text(selectedSaleForDetail.forma_pago || 'Desconocida', totalsValueStartX, yOffset, { align: 'right' }); yOffset += totalsLineHeight * 1.5;
      doc.setFontSize(finalTotalFontSize); doc.setFont(undefined, 'bold'); doc.text('TOTAL PAGADO:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' }); doc.setTextColor(40,167,69); doc.text(formatCurrency(selectedSaleForDetail.total ?? 0), totalsValueStartX, yOffset, { align: 'right' }); doc.setTextColor(0,0,0); yOffset += finalTotalFontSize + 15;
       if (selectedSaleForDetail.forma_pago === 'Crédito cliente') {
           const balFontSize=10, balValFontSize=12, balNoteSize=8, balLineHeight=5; const curBal=(clienteBalanceForTicket??0);
           doc.setFontSize(balFontSize); doc.setFont(undefined,'bold'); doc.text('BALANCE DE CUENTA ACTUAL',margin,yOffset); yOffset+=balLineHeight*2;
           doc.setFontSize(balValFontSize+2); doc.setFont(undefined,'bold'); doc.text('Saldo Actual Cliente:',margin+10,yOffset);
           if(curBal > 0) doc.setTextColor(220,53,69); else doc.setTextColor(40,167,69);
           doc.text(formatCurrency(curBal),doc.internal.pageSize.getWidth()-margin,yOffset,{align:'right'}); doc.setTextColor(0,0,0); yOffset+=balLineHeight*2;
           doc.setFontSize(balNoteSize); doc.setFont(undefined,'normal'); doc.text(curBal>0?'(Saldo positivo indica deuda del cliente)':'(Saldo negativo indica crédito a favor del cliente)',margin,yOffset); yOffset+=balLineHeight*2;
       }
      const footFontSize=8, footLineHeight=4; doc.setFontSize(footFontSize); doc.setFont(undefined,'normal');
      doc.text('¡Gracias por tu compra!',margin,yOffset); yOffset+=footLineHeight; doc.text('Visítanos de nuevo pronto.',margin,yOffset);
      
      try {
          const pdfBlob = doc.output('blob');
          const pdfFile = new File([pdfBlob], `Ticket_${selectedSaleForDetail.codigo_venta || 'venta'}.pdf`, { type: 'application/pdf' });
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
              await navigator.share({
                  title: `Ticket de Venta ${selectedSaleForDetail.codigo_venta || ''}`,
                  text: `Adjunto: Ticket de Venta ${selectedSaleForDetail.codigo_venta || ''}.`,
                  files: [pdfFile],
              });
              toast.success('Ticket PDF compartido.');
          } else {
              toast.info('Compartir no disponible. Abriendo PDF.');
              doc.output('dataurlnewwindow'); 
          }
      } catch (error) {
          if (error.name === 'AbortError') { toast('Compartir PDF cancelado.'); } 
          else { toast.error(`Error al compartir PDF: ${error.message}`); console.error("Error PDF:", error); }
      }
  };

  const handleViewTicketImageAndShowModalFromCliente = async () => {
    if (!selectedSaleForDetail || !clienteInfoForTicket || !vendedorInfoForTicket || !ticketImageRef.current) {
        toast.error("Datos o referencia del ticket no disponibles."); return;
    }
    if (isProcessingImage) return;
    setIsProcessingImage(true);
    toast.loading('Generando imagen...', { id: 'processingImgCliente' });
    try {
        const canvas = await html2canvas(ticketImageRef.current, { useCORS: true, scale: 2, backgroundColor: '#ffffff' });
        const dataUrl = canvas.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        const imageFile = new File([blob], `Ticket_${selectedSaleForDetail.codigo_venta || 'venta'}.png`, { type: 'image/png' });
        setGeneratedImageDataUrl(dataUrl);
        setGeneratedImageFile(imageFile);
        setIsImageActionModalOpen(true); 
        toast.dismiss('processingImgCliente');
    } catch (error) {
        toast.error(`Error al generar imagen: ${error.message}`, { id: 'processingImgCliente' });
    } finally {
        setIsProcessingImage(false);
    }
  };

  const handleShareTicketAsImageDirectlyFromCliente = async () => {
    if (!selectedSaleForDetail || !clienteInfoForTicket || !vendedorInfoForTicket || !ticketImageRef.current) {
        toast.error("Datos o referencia no disponibles."); return;
    }
    if (isProcessingImage) return;
    setIsProcessingImage(true);
    toast.loading('Preparando imagen...', { id: 'sharingDirectlyCliente' });
    try {
        const canvas = await html2canvas(ticketImageRef.current, { useCORS: true, scale: 2, backgroundColor: '#ffffff'});
        const dataUrl = canvas.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        const imageFileToShare = new File([blob], `Ticket_${selectedSaleForDetail.codigo_venta || 'venta'}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageFileToShare] })) {
            await navigator.share({
                title: `Ticket Venta ${selectedSaleForDetail.codigo_venta || ''}`,
                text: `Imagen Ticket Venta ${selectedSaleForDetail.codigo_venta || ''}. Cliente: ${clienteInfoForTicket?.nombre || 'Público General'}. Total: ${formatCurrency(selectedSaleForDetail.total ?? 0)}.`,
                files: [imageFileToShare],
            });
            toast.success('Ticket imagen compartido.', { id: 'sharingDirectlyCliente' });
        } else {
            toast.info('No se pudo compartir. Mostrando opciones...', { id: 'sharingDirectlyCliente' });
            setGeneratedImageDataUrl(dataUrl);
            setGeneratedImageFile(imageFileToShare);
            setIsImageActionModalOpen(true); 
        }
    } catch (error) {
        if (error.name === 'AbortError') { toast('Compartir cancelado.', { id: 'sharingDirectlyCliente' });} 
        else { toast.error(`Error al compartir: ${error.message}`, { id: 'sharingDirectlyCliente' });}
    } finally {
        setIsProcessingImage(false);
    }
  };
  
  const handleSelectClienteCheckbox = (clienteId) => { /* ... */ };
  const handleSelectTodosClientesVisibles = (e) => { /* ... */ };
  const handleEliminarSeleccionados = () => { /* ... */ };

  if (clientesLoadingFromContext) {
     return <div className="text-center p-10">Cargando clientes...</div>;
  }

  return (
    <>
      {/* Componente oculto para generar la imagen del ticket */}
      {selectedSaleForDetail && clienteInfoForTicket && vendedorInfoForTicket && (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -1 }}>
              <TicketParaImagen 
                  ref={ticketImageRef}
                  venta={selectedSaleForDetail} // Usar la venta seleccionada para el detalle
                  cliente={clienteInfoForTicket}
                  vendedor={vendedorInfoForTicket}
                  logoSrc={logoBase64}
                  dateTimeFormatter={formatTicketDateTime}
                  currencyFormatter={formatCurrency}
              />
          </div>
      )}

      {/* Modal para acciones con la imagen generada */}
      <ImageActionModal
          isOpen={isImageActionModalOpen}
          onClose={() => setIsImageActionModalOpen(false)}
          imageDataUrl={generatedImageDataUrl}
          imageFile={generatedImageFile} 
          ventaCodigo={selectedSaleForDetail?.codigo_venta}
          currencyFormatter={formatCurrency}
          clienteNombre={clienteInfoForTicket?.nombre || selectedSaleForDetail?.cliente_nombre}
          ventaTotal={selectedSaleForDetail?.total}
      />

      <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800">
            Volver al inicio
          </button>
          <h1 className="text-3xl font-bold text-gray-800 text-center">Gestión de Clientes</h1>
          <div className="w-full md:w-auto md:min-w-[150px]"></div>
        </div>

        <ClientesAccionesBarra
          busqueda={busqueda}
          onBusquedaChange={(text) => { setBusqueda(text); setPagina(1);}}
          onAbrirNuevoCliente={() => { setEditingClient(null); setShowNewOrEditClientModal(true); }}
          porPagina={porPagina}
          onPorPaginaChange={(num) => { setPorPagina(num); setPagina(1); }}
          onEliminarSeleccionados={handleEliminarSeleccionados}
          selectedIdsCount={selectedIds.length}
          disabledEliminar={selectedIds.length === 0}
        />

        <ClientesTabla
          clientesPag={clientesPag}
          selectedIds={selectedIds}
          onSelectCliente={handleSelectClienteCheckbox}
          onSelectTodosClientes={handleSelectTodosClientesVisibles}
          onAbrirEditar={(cliente) => { setEditingClient(cliente); setShowNewOrEditClientModal(true); }}
          onHandleVerCompras={handleVerCompras}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          areAnyClientesVisible={clientesPag.length > 0}
          formatDateFunction={formatTicketDateTime}
        />
        
        <ClientesPaginacion
          pagina={pagina}
          totalPaginas={totalPaginas}
          onPaginaAnterior={() => setPagina(p => Math.max(1, p - 1))}
          onPaginaSiguiente={() => setPagina(p => Math.min(totalPaginas, p + 1))}
          disabledAnterior={pagina === 1}
          disabledSiguiente={pagina === totalPaginas || totalPaginas === 0}
        />

        <NewClientModal
          isOpen={showNewOrEditClientModal}
          onClose={() => { setShowNewOrEditClientModal(false); setEditingClient(null); }}
          editingClient={editingClient}
          onClientSaved={() => { setShowNewOrEditClientModal(false); setEditingClient(null); }}
        />

        {clienteActualParaVentas && (
          <ClienteVentasModal
            isOpen={!!clienteActualParaVentas}
            onClose={() => setClienteActualParaVentas(null)}
            clienteActual={clienteActualParaVentas}
            ventasCliente={ventasDelClienteSeleccionado}
            onSelectSale={handleSelectSaleForDetail} // Esta función ahora prepara datos para los tickets también
            loading={clientSalesLoading}
            formatDateFunction={formatTicketDateTime}
          />
        )}

        {showSaleDetailModal && selectedSaleForDetail && (
          <ClienteVentaDetalleModal
              isOpen={showSaleDetailModal}
              onClose={() => { setShowSaleDetailModal(false); setSelectedSaleForDetail(null); setSelectedSaleDetailsItems([]); setIsImageActionModalOpen(false);}}
              selectedSale={selectedSaleForDetail}
              selectedSaleDetails={selectedSaleDetailsItems}
              detailLoading={detailLoading}
              clienteInfoTicket={clienteInfoForTicket} // Usar los estados preparados para el ticket
              vendedorInfoTicket={vendedorInfoForTicket} // Usar los estados preparados para el ticket
              clienteBalanceTicket={clienteBalanceForTicket} // Usar los estados preparados para el ticket
              
              // Pasar las nuevas funciones de ticket
              onShareTicket={handleShareTicketAsPDFFromCliente} 
              onShareTicketAsImage={handleShareTicketAsImageDirectlyFromCliente} 
              onViewTicketImage={handleViewTicketImageAndShowModalFromCliente} 
              
              onCancelSale={handleCancelSaleFromCliente}
              cancelLoading={cancelSaleLoading}
              logoBase64={logoBase64} // Ya lo tenías, pero asegúrate que se use en PDF
              formatDateFunction={formatTicketDateTime}
          />
        )}
        
        {/* Lógica de HtmlTicketDisplay eliminada ya que "Ver Ticket" ahora usa imagen */}
        {/* {showHtmlTicket && htmlTicketData && (
            <HtmlTicketDisplay saleData={htmlTicketData} onClose={closeHtmlTicket} />
        )} */}
      </div>
    </>
  );
}
