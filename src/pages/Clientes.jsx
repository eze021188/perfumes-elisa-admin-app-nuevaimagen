// src/pages/Clientes.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { useClientes } from '../contexts/ClientesContext';
import NewClientModal from '../components/NewClientModal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
// Importar el componente HtmlTicketDisplay
import HtmlTicketDisplay from '../components/HtmlTicketDisplay';
// Importar useAuth para obtener info del vendedor
import { useAuth } from '../contexts/AuthContext';


// Helper simple para formatear moneda (si no está global)
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

// Función para cargar una imagen local y convertirla a Base64 para jsPDF
// Esta función es necesaria si quieres incluir el logo en el PDF
const getBase64Image = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
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


export default function Clientes() {
  const navigate = useNavigate();
  const { clientes, loading: clientesLoading, actualizarCliente, eliminarCliente } = useClientes();
  // Obtener usuario logueado (vendedor) del contexto
  const { user: currentUser } = useAuth();

  const [busqueda, setBusqueda] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [clienteActual, setClienteActual] = useState(null); // Información del cliente seleccionado en la lista
  const [ventasCliente, setVentasCliente] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);

  const [showSaleDetailModal, setShowSaleDetailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null); // Venta seleccionada en el modal de detalle
  const [selectedSaleDetails, setSelectedSaleDetails] = useState([]); // Detalles de la venta seleccionada
  const [cancelLoading, setCancelLoading] = useState(false);
  const [clientSalesLoading, setClientSalesLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Estados para mostrar el ticket HTML
   const [showHtmlTicket, setShowHtmlTicket] = useState(false);
   const [htmlTicketData, setHtmlTicketData] = useState(null);

   // Estado para almacenar la imagen del logo en Base64 para el PDF
   const [logoBase64, setLogoBase64] = useState(null);

    // Estados para almacenar información adicional para el PDF/Ticket
    // Nota: Estos estados se cargan en handleSelectSale y se usan en PDF/HTML
    const [clienteInfoTicket, setClienteInfoTicket] = useState(null); // Información del cliente de la venta seleccionada
    const [vendedorInfoTicket, setVendedorInfoTicket] = useState(null); // Información del vendedor de la venta seleccionada
    const [clienteBalanceTicket, setClienteBalanceTicket] = useState(0); // Balance del cliente de la venta seleccionada


  const filtrados = clientes.filter(c => (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));
  const inicio = (pagina - 1) * porPagina;
  const clientesPag = filtrados.slice(inicio, inicio + porPagina);
  const totalPaginas = Math.ceil(filtrados.length / porPagina);

  // Cargar logo al iniciar
  useEffect(() => {
      async function loadLogo() {
          const logoUrl = '/images/PERFUMESELISAwhite.jpg'; // Asegúrate que esta ruta sea correcta
          const base64 = await getBase64Image(logoUrl);
          setLogoBase64(base64);
      }
      loadLogo();
  }, []); // Solo se ejecuta una vez al montar


  const handleVerCompras = async c => {
    setClienteActual(c); // Establecer el cliente seleccionado en la lista
    setVentasCliente([]);
    setClientSalesLoading(true);
    // >>> Incluir 'enganche' y 'gastos_envio' en la consulta de ventas <<<
    const { data, error } = await supabase
      .from('ventas')
      .select('*, enganche, gastos_envio') // Seleccionar todas las columnas de ventas + enganche y gastos_envio
      .eq('cliente_id', c.id)
      .order('fecha', { ascending: false });
    if (error) {
      console.error('Error al obtener ventas del cliente:', error.message);
      toast.error('Error al cargar historial de ventas.');
      setVentasCliente([]);
    } else {
      setVentasCliente(data || []);
    }
    setClientSalesLoading(false);
  };

  const handlePaginaAnterior = () => {
    if (pagina > 1) setPagina(pagina - 1);
  };

  const handlePaginaSiguiente = () => {
    if (pagina < totalPaginas) setPagina(pagina + 1);
  };

  // --- Funciones de detalle de venta (para el modal) ---
  const handleSelectSale = async (venta) => {
    setSelectedSale(venta); // Establecer la venta seleccionada para mostrar el modal
    setDetailLoading(true); // Iniciar carga de detalle del modal
    setSelectedSaleDetails([]); // Limpiar detalles anteriores
    // Limpiar también la info del vendedor y cliente previa que se usará en PDF/HTML
    setClienteInfoTicket(null);
    setVendedorInfoTicket(null);
    setClienteBalanceTicket(0);


    console.log(`[handleSelectSale] Fetching details for venta ID: ${venta.id}`);

    // 1. Cargar detalles de la venta
    const { data: detalle, error: errDetalle } = await supabase
        .from('detalle_venta')
        .select('*, productos(nombre)') // Asegúrate de que 'productos' es el nombre correcto de tu tabla de productos
        .eq('venta_id', venta.id);

    if (errDetalle) {
        console.error('[handleSelectSale] Error al obtener detalles de la venta:', errDetalle.message);
        toast.error('Error al cargar detalles de la venta.');
        setSelectedSaleDetails([]);
        setDetailLoading(false);
        setSelectedSale(null); // Cerrar modal si falla la carga del detalle
        return; // Salir de la función si falla la carga de detalles
    }

    const mappedDetails = (detalle || []).map(item => ({
        ...item,
        // Acceder al nombre del producto a través de la relación
        nombreProducto: item.productos ? item.productos.nombre : 'Producto desconocido'
    }));
    setSelectedSaleDetails(mappedDetails);


    // 2. Cargar información completa del cliente (si no está ya en el objeto venta)
    // Usar venta.cliente_id para buscar en la tabla clientes
    let clienteData = null;
    if (venta.cliente_id) {
         const { data: cliData, error: cliError } = await supabase
             .from('clientes')
             .select('id, nombre, telefono, correo, direccion') // Seleccionar todos los campos necesarios
             .eq('id', venta.cliente_id)
             .single();
         if (cliError) {
             console.error('Error cargando info cliente para ticket:', cliError.message);
             toast.error('Error al cargar datos del cliente para el ticket.');
             // Continuar con info parcial si falla la carga del cliente
             clienteData = { id: venta.cliente_id, nombre: venta.cliente_nombre || 'Público General', telefono: 'N/A' };
         } else {
             clienteData = cliData;
         }
    } else {
         // Si no hay cliente_id (venta a público general), crear un objeto cliente básico
         clienteData = { id: null, nombre: venta.cliente_nombre || 'Público General', telefono: 'N/A' };
    }
     setClienteInfoTicket(clienteData); // <<< Guardar la info del cliente en este estado


    // 3. Cargar información del vendedor
     let vendedorData = null;
     // Usar venta.vendedor_id para buscar en la tabla usuarios
     if (venta.vendedor_id) {
         const { data: vendData, error: vendError } = await supabase
             .from('usuarios')
             .select('id, nombre') // Seleccionar campos necesarios del vendedor
             .eq('id', venta.vendedor_id)
             .single();
         if (vendError) {
             console.error('Error cargando info vendedor para ticket:', vendError.message);
             toast.error('Error al cargar datos del vendedor para el ticket.');
             // Continuar con info parcial si falla la carga del vendedor
             vendedorData = { id: venta.vendedor_id, nombre: currentUser?.email || 'N/A' }; // Usar email logueado como fallback
         } else {
             vendedorData = vendData;
         }
     } else {
         // Si no hay vendedor_id, usar el usuario logueado como vendedor si existe
         vendedorData = { id: currentUser?.id || null, nombre: currentUser?.email || 'N/A' };
     }
     setVendedorInfoTicket(vendedorData); // <<< Guardar la info del vendedor en este estado


    // 4. Cargar el balance actual del cliente (solo si hay cliente_id)
    let currentClientBalance = 0;
     if (clienteData?.id) { // Usar clienteData cargado en este handler
        const { data: balanceData, error: balanceError } = await supabase
            .from('movimientos_cuenta_clientes')
            .select('monto')
            .eq('cliente_id', clienteData.id); // Usar clienteData.id

        if (balanceError) {
            console.error("Error loading client balance for ticket:", balanceError);
             toast.error("No se pudo cargar el balance del cliente para el ticket.");
        } else {
            currentClientBalance = (balanceData || []).reduce((sum, mov) => sum + (parseFloat(mov.monto) || 0), 0);
        }
     }
     setClienteBalanceTicket(currentClientBalance); // <<< Guardar el balance en este estado


    // 5. Actualizar el estado selectedSale con los detalles mapeados
    // y asegurar que los campos de totales, descuento, enganche y gastos_envio estén presentes,
    // además de incluir el balance de cuenta (balance_cuenta) de la venta si existe, o el balance actual calculado si no.
    setSelectedSale(prev => ({
        ...prev, // Mantener propiedades de la venta original (incluyendo enganche y gastos_envio cargados en handleVerCompras)
        productos: mappedDetails, // Usar los detalles mapeados para la propiedad 'productos'
        // Asegurarse de que los totales, descuento, enganche y gastos_envio estén presentes
        subtotal: venta.subtotal ?? 0, // Subtotal original antes del descuento general
        total: venta.total ?? 0, // Total final de la venta (subtotal - descuento + gastos_envio)
        valor_descuento: venta.valor_descuento ?? 0, // Monto del descuento general
        tipo_descuento: venta.tipo_descuento || 'fijo', // Tipo de descuento general
        enganche: venta.enganche ?? 0, // Enganche (ya cargado en handleVerCompras)
        gastos_envio: venta.gastos_envio ?? 0, // Gastos de envío (ya cargado en handleVerCompras)
        // Si selectedSale.balance_cuenta existe en la venta original, úsalo, sino, el balance calculado
        balance_cuenta: venta.balance_cuenta ?? currentClientBalance, // Usar el balance de la venta si existe, sino el calculado
    }));


    setDetailLoading(false); // Finalizar carga de detalle
    setShowSaleDetailModal(true); // Mostrar el modal de detalle de venta
};

const handleCloseSaleDetailModal = () => {
    setShowSaleDetailModal(false);
    setSelectedSale(null);
    setSelectedSaleDetails([]);
    // Limpiar también los estados de info adicional al cerrar el modal de detalle
    setClienteInfoTicket(null);
    setVendedorInfoTicket(null);
    setClienteBalanceTicket(0);
    // Asegurarse de cerrar también el modal HTML si estuviera abierto
    closeHtmlTicket();
};

// --- Función para cancelar/eliminar venta ---
const handleCancelSale = async () => {
    if (cancelLoading || !selectedSale) return;

    if (!window.confirm(`¿Estás seguro de cancelar la venta ${selectedSale.codigo_venta || selectedSale.id}? Esta acción eliminará permanentemente la venta y devolverá el stock.`)) return;

    setCancelLoading(true);

    try {
        for (const item of selectedSaleDetails) {
            if (!item.producto_id) {
                toast.error(`Falta ID de producto para un ítem. No se actualizará el stock.`, { duration: 6000 });
                continue;
            }

            const { data: producto, error: errorGetProduct } = await supabase
                .from('productos')
                .select('id, stock')
                .eq('id', item.producto_id)
                .single();

            if (errorGetProduct) {
                console.error(`Error al obtener stock para producto ${item.producto_id}:`, errorGetProduct.message);
                toast.error(`Error al obtener stock del producto. La cancelación podría ser parcial.`, { duration: 6000 });
                continue;
            }

            const nuevoStock = (producto?.stock ?? 0) + (item.cantidad ?? 0);

             const { error: errorUpdateStock } = await supabase
                .from('productos')
                .update({ stock: nuevoStock })
                .eq('id', item.producto_id);


            if (errorUpdateStock) {
                console.error(`Error actualizando stock para producto ${item.producto_id}:`, errorUpdateStock.message);
                toast.error(`Error actualizando stock del producto. La cancelación podría ser parcial.`, { duration: 6000 });
                continue;
            }
        }

        const { error: errorDeleteDetails } = await supabase.from('detalle_venta').delete().eq('venta_id', selectedSale.id);
        if (errorDeleteDetails) {
             console.error('Error eliminando detalles de venta:', errorDeleteDetails.message);
             toast.error('Error al eliminar detalles de la venta.');
             throw new Error('Error al eliminar detalles de la venta.');
        }

        const { error: errorDeleteSale } = await supabase.from('ventas').delete().eq('id', selectedSale.id);
         if (errorDeleteSale) {
            console.error('Error eliminando venta principal:', errorDeleteSale.message);
            toast.error('Error al eliminar la venta principal.');
             throw new Error('Error al eliminar la venta principal.');
         }

        setVentasCliente(prev => prev.filter(v => v.id !== selectedSale.id));
        handleCloseSaleDetailModal();

        toast.success(`✅ Venta cancelada y eliminada exitosamente.`);
    } catch (error) {
        console.error('Error general en cancelación:', error.message);
        toast.error(`Fallo al cancelar venta: ${error.message || 'Error desconocido'}`);
    } finally {
        setCancelLoading(false);
    }
};

  // >>> Función para generar el PDF en formato Carta (con diseño más completo) <<<
  // Ajustada para usar los estados existentes: selectedSale, selectedSaleDetails, clienteInfoTicket, vendedorInfoTicket, clienteBalanceTicket, logoBase64
  const generarPDF = async () => {
      // >>> DEBUG LOGS <<<
      console.log("Datos para generar PDF:");
      console.log("selectedSale:", selectedSale); // Ahora incluye enganche y gastos_envio
      console.log("selectedSaleDetails:", selectedSaleDetails);
      console.log("clienteInfoTicket:", clienteInfoTicket);
      console.log("vendedorInfoTicket:", vendedorInfoTicket);
      console.log("clienteBalanceTicket:", clienteBalanceTicket);
      // >>> FIN DEBUG LOGS <<<

      // >>> CORRECCIÓN: Verificar también gastos_envio en selectedSale <<<
      if (!selectedSale || !selectedSaleDetails.length || !clienteInfoTicket || !vendedorInfoTicket || selectedSale.enganche === undefined || selectedSale.gastos_envio === undefined) {
          toast.error("Datos incompletos para generar el PDF.");
          return;
      }

      const doc = new jsPDF({
          orientation: 'portrait', // Vertical
          unit: 'mm', // Unidades en milímetros
          format: 'letter' // Formato Carta
      });

      const margin = 15; // Margen en mm
      let yOffset = margin; // Offset vertical inicial con margen

      // --- Encabezado del Documento ---
      const logoWidth = 30; // Ancho del logo en mm
      const logoHeight = 30; // Alto del logo en mm
      const companyInfoX = margin + logoWidth + 10; // Posición X para la información de la empresa

      if (logoBase64) {
          doc.addImage(logoBase64, 'JPEG', margin, yOffset, logoWidth, logoHeight);
      } else {
          console.warn("Logo image not loaded for PDF.");
          // Placeholder si el logo no carga
           doc.setFontSize(10);
           doc.text("Logo Aquí", margin + logoWidth / 2, yOffset + logoHeight / 2, { align: 'center' });
      }

      // Información de la Empresa
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('PERFUMES ELISA', companyInfoX, yOffset + 5); // Título de la empresa
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Tu Calle #123, Tu Colonia', companyInfoX, yOffset + 12); // Dirección
      doc.text('Ciudad Apodaca, N.L., C.P. 66600', companyInfoX, yOffset + 17); // Ciudad y CP
      doc.text('Teléfono: 81 3080 4010', companyInfoX, yOffset + 22); // Teléfono
      // doc.text('RFC: TU RFC AQUÍ', companyInfoX, yOffset + 27); // RFC (opcional)


      // Título del Documento y Código de Venta (alineado a la derecha)
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('TICKET DE VENTA', doc.internal.pageSize.getWidth() - margin, yOffset + 10, { align: 'right' });
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Código: ${selectedSale.codigo_venta || 'N/A'}`, doc.internal.pageSize.getWidth() - margin, yOffset + 17, { align: 'right' });

      yOffset += Math.max(logoHeight, 30) + 15; // Espacio después del encabezado (usar el mayor entre logoHeight y un mínimo)

      // --- Divisor ---
      doc.line(margin, yOffset, doc.internal.pageSize.getWidth() - margin, yOffset);
      yOffset += 10;

      // --- Información del Cliente y Venta ---
      const infoLabelFontSize = 9;
      const infoValueFontSize = 10;
      const infoLineHeight = 6; // Espaciado entre líneas de info

      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('CLIENTE:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(clienteInfoTicket?.nombre || 'Público General', margin + doc.getTextWidth('CLIENTE:') + 5, yOffset);

      yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('TELÉFONO:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(clienteInfoTicket?.telefono || 'N/A', margin + doc.getTextWidth('TELÉFONO:') + 5, yOffset);

      yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('CORREO:', margin, yOffset);
       // Nota: Si tienes el correo del cliente en clienteActual, úsalo aquí
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(clienteInfoTicket?.correo || 'N/A', margin + doc.getTextWidth('CORREO:') + 5, yOffset);

       yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('DIRECCIÓN:', margin, yOffset);
       // Nota: Si tienes la dirección del cliente en clienteActual, úsalo aquí
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal');
      const direccionCliente = clienteInfoTicket?.direccion || 'N/A';
       // Autoajustar texto si la dirección es larga
      const splitDir = doc.splitTextToSize(direccionCliente, doc.internal.pageSize.getWidth() - margin - (margin + doc.getTextWidth('DIRECCIÓN:') + 5));
      doc.text(splitDir, margin + doc.getTextWidth('DIRECCIÓN:') + 5, yOffset);
      yOffset += (splitDir.length * infoLineHeight) + infoLineHeight; // Ajustar yOffset por las líneas de dirección


      yOffset += infoLineHeight; // Espacio antes de los datos de venta
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('FECHA:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(((selectedSale.fecha || selectedSale.created_at) ? new Date(selectedSale.fecha || selectedSale.created_at).toLocaleString() : 'Fecha desconocida'), margin + doc.getTextWidth('FECHA:') + 5, yOffset);

      yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('VENDEDOR:', margin, yOffset);
       // >>> USAR vendedorInfoTicket.nombre <<<
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(vendedorInfoTicket?.nombre || 'N/A', margin + doc.getTextWidth('VENDEDOR:') + 5, yOffset);


      yOffset += infoLineHeight * 2; // Espacio antes de la tabla de productos


      // --- Tabla de Productos ---
      const productsHead = [['Producto', 'Cant.', 'P. Unitario', 'Total Item']]; // Columnas ajustadas (sin Desc. Item)
      const productsRows = selectedSaleDetails.map(p => {
          const unitPrice = parseFloat(p.precio_unitario ?? 0);
          const quantity = parseFloat(p.cantidad ?? 0);
          const totalItem = parseFloat(p.total_parcial ?? 0); // Usar p.total_parcial del detalle de venta

          return [
              p.nombreProducto || '–',
              quantity.toString(),
              formatCurrency(unitPrice),
              formatCurrency(totalItem) // Total del ítem sin considerar el descuento general
          ];
      });

      doc.autoTable({
          head: productsHead,
          body: productsRows,
          startY: yOffset,
          theme: 'striped', // Tema rayado para mejor legibilidad
          styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
          columnStyles: {
              0: { cellWidth: 80 }, // Ancho para nombre producto
              1: { cellWidth: 15, halign: 'center' }, // Cantidad
              2: { cellWidth: 25, halign: 'right' }, // P. Unitario
              3: { cellWidth: 30, halign: 'right' }, // Total Item
          },
          margin: { left: margin, right: margin },
          didDrawPage: function (data) {
              // Añadir número de página en el pie si hay varias páginas
              doc.setFontSize(8);
              doc.text('Página ' + data.pageNumber, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - margin, { align: 'right' });
          }
      });

      yOffset = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yOffset + 10; // Actualizar yOffset después de la tabla

      // --- Resumen de Totales ---
      const totalsLabelWidth = 40; // Ancho para las etiquetas de totales
      const totalsValueStartX = doc.internal.pageSize.getWidth() - margin - 50; // Posición X para los valores alineados a la derecha
      const totalsLineHeight = 6;
      const totalsFontSize = 10;
      const finalTotalFontSize = 14;


      doc.setFontSize(totalsFontSize);
      doc.setFont(undefined, 'normal');

      // >>> Mostrar Enganche si es Crédito cliente Y hubo enganche > 0 (Antes del subtotal) <<<
      if (selectedSale.forma_pago === 'Crédito cliente' && (selectedSale.enganche ?? 0) > 0) {
           doc.text('Enganche:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
           doc.text(formatCurrency(selectedSale.enganche ?? 0), totalsValueStartX, yOffset, { align: 'right' });
           yOffset += totalsLineHeight;
       }

       // >>> Mostrar Gastos de Envío si son > 0 (Antes del subtotal) <<<
       if ((selectedSale.gastos_envio ?? 0) > 0) {
            doc.text('Gastos de Envío:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
            doc.text(formatCurrency(selectedSale.gastos_envio ?? 0), totalsValueStartX, yOffset, { align: 'right' });
            yOffset += totalsLineHeight;
        }


      doc.text('Subtotal:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.text(formatCurrency(selectedSale.subtotal ?? 0), totalsValueStartX, yOffset, { align: 'right' });
      yOffset += totalsLineHeight;

      let descuentoTexto = 'Descuento:';
      let montoDescuentoTexto = formatCurrency(0);
      if (selectedSale.tipo_descuento === 'porcentaje' && (selectedSale.valor_descuento ?? 0) > 0) {
          // Asumiendo que valor_descuento es el MONTO del descuento, no el porcentaje
          // Si valor_descuento fuera el porcentaje, necesitarías calcular el monto:
          // const montoDescuentoCalc = (selectedSale.subtotal ?? 0) * ((selectedSale.valor_descuento ?? 0) / 100);
          // descuentoTexto = `Descuento (${selectedSale.valor_descuento}%):`;
          // montoDescuentoTexto = `- ${formatCurrency(montoDescuentoCalc)}`;

          // Si valor_descuento es el MONTO:
           descuentoTexto = 'Descuento:';
           montoDescuentoTexto = `- ${formatCurrency(selectedSale.valor_descuento ?? 0)}`;
      } else if (selectedSale.tipo_descuento === 'fijo' && (selectedSale.valor_descuento ?? 0) > 0) {
          descuentoTexto = 'Descuento:';
          montoDescuentoTexto = `- ${formatCurrency(selectedSale.valor_descuento ?? 0)}`;
      }
      doc.text(descuentoTexto, totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.setTextColor(220, 53, 69); // Rojo para descuento
      doc.text(montoDescuentoTexto, totalsValueStartX, yOffset, { align: 'right' });
      doc.setTextColor(0, 0, 0); // Resetear color a negro
      yOffset += totalsLineHeight;

       // Forma de Pago
      doc.text('Forma de Pago:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.text(selectedSale.forma_pago || 'Desconocida', totalsValueStartX, yOffset, { align: 'right' });
      yOffset += totalsLineHeight;


       // Impuestos (simulación si aplica)
       // doc.text('Impuestos (IVA):', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
       // doc.text(formatCurrency(0), totalsValueStartX, yOffset, { align: 'right' }); // Ajustar si calculas impuestos
       // yOffset += totalsLineHeight;


      yOffset += totalsLineHeight; // Espacio antes del Total Final

      // Total Final
      doc.setFontSize(finalTotalFontSize);
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.setTextColor(40, 167, 69); // Verde para total
      // >>> CORRECCIÓN: Usar selectedSale.total (que ahora es el total final) <<<
      doc.text(formatCurrency(selectedSale.total ?? 0), totalsValueStartX, yOffset, { align: 'right' });
      doc.setTextColor(0, 0, 0); // Resetear color a negro
      yOffset += finalTotalFontSize + 15;


      // --- Sección de Balance de Cuenta (solo si es Crédito cliente) ---
       if (selectedSale.forma_pago === 'Crédito cliente') {
           const balanceLabelFontSize = 10;
           const balanceValueFontSize = 12;
           const balanceNoteFontSize = 8;
           const balanceLineHeight = 5;

           // Necesitamos obtener el balance anterior para mostrar el desglose
           // Balance Anterior = Balance Actual - Total de Venta (si la venta es un cargo) + Enganche (si fue un abono)
           // Usamos el balance_cuenta calculado en handleSelectSale (clienteBalanceTicket)
           const currentBalance = (clienteBalanceTicket ?? 0);
           // Para obtener el balance anterior, restamos el efecto de ESTA venta (total_final) y sumamos el enganche (que fue un abono)
           // >>> CORRECCIÓN: Usar selectedSale.total (el total final) para el cálculo del balance anterior <<<
           const previousBalance = currentBalance - (selectedSale.total ?? 0) + (selectedSale.enganche ?? 0);


           doc.setFontSize(balanceLabelFontSize);
           doc.setFont(undefined, 'bold');
           doc.text('DETALLE DE CUENTA', margin, yOffset);
           yOffset += balanceLineHeight * 2;

           doc.setFontSize(balanceValueFontSize);
           doc.setFont(undefined, 'normal');

           // Balance Anterior
           doc.text('Saldo Anterior:', margin + 10, yOffset);
           doc.text(formatCurrency(previousBalance), doc.internal.pageSize.getWidth() - margin, yOffset, { align: 'right' });
           yOffset += balanceLineHeight;

           // Cargo por Venta Actual
           doc.text('Venta Actual:', margin + 10, yOffset);
            // >>> CORRECCIÓN: Usar selectedSale.total (el total final) para el cargo <<<
           doc.text(formatCurrency(selectedSale.total ?? 0), doc.internal.pageSize.getWidth() - margin, yOffset, { align: 'right' });
           yOffset += balanceLineHeight;

           // Pagos/Enganche (si aplica)
           if ((selectedSale.enganche ?? 0) > 0) {
                doc.text('Enganche Pagado:', margin + 10, yOffset);
                 doc.text(`- ${formatCurrency(selectedSale.enganche ?? 0)}`, doc.internal.pageSize.getWidth() - margin, yOffset, { align: 'right' });
                 yOffset += balanceLineHeight;
           }
           // Si hubiera otros pagos registrados en esta venta, también se sumarían aquí

           yOffset += balanceLineHeight; // Espacio antes del Nuevo Balance

           // Nuevo Balance
           doc.setFontSize(balanceValueFontSize + 2); // Fuente más grande
           doc.setFont(undefined, 'bold');
           doc.text('Nuevo Saldo:', margin + 10, yOffset);
            // Determinar color del nuevo balance
           if (currentBalance > 0) {
               doc.setTextColor(220, 53, 69); // Rojo para deuda
           } else {
               doc.setTextColor(40, 167, 69); // Verde para saldo a favor
           }
           doc.text(formatCurrency(currentBalance), doc.internal.pageSize.getWidth() - margin, yOffset, { align: 'right' });
           doc.setTextColor(0, 0, 0); // Resetear color a negro
           yOffset += balanceLineHeight * 2;

            doc.setFontSize(balanceNoteFontSize);
            doc.setFont(undefined, 'normal');
            const balanceNoteText = currentBalance > 0
                ? '(Saldo positivo indica deuda del cliente)'
                : '(Saldo negativo indica crédito a favor del cliente)';
            doc.text(balanceNoteText, margin, yOffset); // Nota alineada a la izquierda


           yOffset += balanceLineHeight * 2; // Espacio después del balance
       }


      // --- Información Adicional / Pie de Página ---
      const footerFontSize = 8;
      const footerLineHeight = 4;

      doc.setFontSize(footerFontSize);
      doc.setFont(undefined, 'normal');

      // Mensaje de agradecimiento
      doc.text('¡Gracias por tu compra!', margin, yOffset);
      yOffset += footerLineHeight;
      doc.text('Visítanos de nuevo pronto.', margin, yOffset);
      yOffset += footerLineHeight * 2;

      // Línea para firma del cliente (opcional)
      // doc.line(margin, yOffset, margin + 50, yOffset);
      // doc.text('Firma del Cliente', margin, yOffset + footerLineHeight);


      // Abrir PDF en una nueva ventana
      doc.output('dataurlnewwindow');
  };
  // >>> FIN FUNCIÓN PARA GENERAR EL PDF <<<


    // >>> Función para preparar datos y mostrar el ticket HTML <<<
    const handleShowHtmlTicket = async () => {
        // >>> DEBUG LOGS <<<
        console.log("Datos para mostrar Ticket HTML:");
        console.log("ventaSeleccionada:", selectedSale); // Usar selectedSale
        console.log("productos de la venta seleccionada:", selectedSale?.productos); // Usar selectedSale.productos
        console.log("clienteInfoTicket:", clienteInfoTicket);
        console.log("vendedorInfoTicket:", vendedorInfoTicket);
        console.log("clienteBalanceTicket:", clienteBalanceTicket);
        // >>> FIN DEBUG LOGS <<<

        // >>> CORRECCIÓN: Usar selectedSale y selectedSale.productos en la verificación <<<
        if (!selectedSale || !selectedSale.productos || selectedSale.productos.length === 0 || !clienteInfoTicket || !vendedorInfoTicket) {
            console.error("Datos incompletos para mostrar el ticket HTML. Check logs above."); // Log adicional para depuración
            toast.error("Datos incompletos para mostrar el ticket HTML.");
            return;
        }

        // Los datos necesarios ya están cargados en los estados:
        // selectedSale (contiene detalles y totales), clienteInfoTicket, vendedorInfoTicket, clienteBalanceTicket

         const now = selectedSale.fecha || selectedSale.created_at ? new Date(selectedSale.fecha || selectedSale.created_at) : new Date();
         // Formatear la fecha a dd/mm/aa HH:MM
         const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

       // Asumiendo que 'enganche' y 'gastos_envio' están disponibles en el objeto 'selectedSale'
       const enganchePagado = selectedSale.enganche ?? 0;
       const gastosEnvioVenta = selectedSale.gastos_envio ?? 0; // <<< Obtener gastos_envio


        const ticketData = {
             codigo_venta: selectedSale.codigo_venta,
             cliente: {
                 id: clienteInfoTicket.id,
                 nombre: clienteInfoTicket.nombre,
                 telefono: clienteInfoTicket.telefono || 'N/A', // Asegúrate de que clienteInfoTicket tenga 'telefono'
                // Puedes añadir más campos del cliente aquí si los cargas en clienteInfoTicket
               // correo: clienteInfoTicket.correo || 'N/A',
               // direccion: clienteInfoTicket.direccion || 'N/A',
             },
             vendedor: {
                 // Usar el nombre del vendedor cargado en vendedorInfoTicket
                 nombre: vendedorInfoTicket?.nombre || 'N/A',
             },
             fecha: formattedDate,
             productosVenta: selectedSale.productos.map(item => ({ // Mapear los detalles de venta cargados (ahora en selectedSale.productos)
                 id: item.producto_id,
                 nombre: item.nombreProducto, // Usar el nombre del producto obtenido
                 cantidad: item.cantidad,
                 precio_unitario: item.precio_unitario,
                 total_parcial: item.total_parcial, // Total del ítem (cantidad * precio unitario)
             })),
             originalSubtotal: selectedSale.subtotal, // Usar subtotal de la venta seleccionada (antes de descuento general)
             discountAmount: selectedSale.valor_descuento, // Usar valor_descuento de la venta seleccionada (descuento general)
             forma_pago: selectedSale.forma_pago, // Usar forma_pago de la venta seleccionada
             enganche: enganchePagado, // Usar el enganche de la venta seleccionada
             gastos_envio: gastosEnvioVenta, // <<< Incluir gastos_envio en los datos del ticket
             total: selectedSale.total, // Usar total de la venta seleccionada (después de descuento general, que ahora es el total final)
             total_final: selectedSale.total, // <<< Usar total de la venta seleccionada (que es el total final)
             balance_cuenta: clienteBalanceTicket, // Usar el balance de cuenta obtenido/calculado
         };

         setHtmlTicketData(ticketData); // Guardar los datos del ticket
         setShowHtmlTicket(true); // Mostrar el modal del ticket HTML
         // No cerramos el modal de detalle de venta aquí, solo mostramos el ticket HTML encima
    };

     // Función para cerrar el modal del ticket HTML
    const closeHtmlTicket = () => {
        setShowHtmlTicket(false);
        setHtmlTicketData(null); // Limpiar datos del ticket al cerrar
    };


  // Handler cuando se guarda (nuevo o editado)
  const onClientSaved = async clienteData => {
    if (editingClient) {
      await actualizarCliente(editingClient.id, clienteData);
    }
    setModalOpen(false);
  };

  // Abrir modal en “nuevo”
  const abrirNuevo = () => {
    setEditingClient(null);
    setModalOpen(true);
  };

  // Abrir modal en “editar”
  const abrirEditar = c => {
    setEditingClient(c);
    setModalOpen(true);
  };

  // Mostrar carga inicial
  if (clientesLoading) {
     return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
           <p className="text-lg font-semibold text-gray-700">Cargando clientes…</p>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
      <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Gestión de Clientes
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
            className="w-full md:w-64 border p-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button onClick={abrirNuevo} className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-200">
            Agregar cliente
          </button>
        </div>
      </div>
      {/* Acciones masivas y paginación */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="items-per-page" className="text-gray-700 text-sm">Mostrar:</label>
          <select
            id="items-per-page"
            value={porPagina}
            onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1); }}
            className="border p-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
          </select>
        </div>
        <button
          disabled={selectedIds.length === 0}
          onClick={() => {
            if (confirm(`¿Seguro que quieres eliminar ${selectedIds.length} cliente(s)? Esta acción también eliminará sus ventas.`)) {
              selectedIds.forEach(id => eliminarCliente(id));
              setSelectedIds([]); // Limpiar selección después de eliminar
            }
          }}
          className={`px-4 py-2 rounded-md shadow-sm transition duration-200 ease-in-out text-sm ${
            selectedIds.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          Eliminar seleccionados ({selectedIds.length})
        </button>
        {/* Paginación */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePaginaAnterior}
            disabled={pagina === 1}
            className="px-3 py-1 bg-gray-300 text-gray-800 rounded-md shadow-sm hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Anterior
          </button>
          <span className="text-gray-700 text-sm">Página {pagina} de {totalPaginas}</span>
          <button
            onClick={handlePaginaSiguiente}
            disabled={pagina === totalPaginas}
            className="px-3 py-1 bg-gray-300 text-gray-800 rounded-md shadow-sm hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <input
                  type="checkbox"
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedIds(clientesPag.map(c => c.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  checked={selectedIds.length === clientesPag.length && clientesPag.length > 0}
                  disabled={clientesPag.length === 0}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Correo</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Dirección</th>
              <th className="p-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clientesPag.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500 italic">No hay clientes encontrados.</td>
              </tr>
            ) : (
              clientesPag.map(cliente => (
                <tr key={cliente.id}>
                  <td className="p-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(cliente.id)}
                      onChange={() => {
                        setSelectedIds(prev =>
                          prev.includes(cliente.id)
                            ? prev.filter(id => id !== cliente.id)
                            : [...prev, cliente.id]
                        );
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900">{cliente.nombre}</td>
                  <td className="p-4 whitespace-nowrap text-sm text-gray-700 hidden sm:table-cell">{cliente.telefono || 'N/A'}</td>
                  <td className="p-4 whitespace-nowrap text-sm text-gray-700 hidden md:table-cell">{cliente.correo || 'N/A'}</td>
                  <td className="p-4 whitespace-nowrap text-sm text-gray-700 hidden lg:table-cell">{cliente.direccion || 'N/A'}</td>
                  <td className="p-4 whitespace-nowrap text-center text-sm font-medium flex justify-center space-x-2">
                    <button
                      onClick={() => abrirEditar(cliente)}
                      className="px-3 py-1 bg-yellow-500 text-white rounded-md shadow-sm hover:bg-yellow-600 transition duration-200 ease-in-out text-xs"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleVerCompras(cliente)}
                      className="px-3 py-1 bg-purple-600 text-white rounded-md shadow-sm hover:bg-purple-700 transition duration-200 ease-in-out text-xs"
                    >
                      Ver Ventas
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Edici\u00f3n/Nuevo Cliente */}
      <NewClientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onClientAdded={(newClient) => {
             // Si se añade un nuevo cliente, lo agregamos a la lista local
             if (newClient) {
                 setClientes(prev => [...prev, newClient]);
             }
            setModalOpen(false);
        }}
         onClientUpdated={(updatedClient) => {
             // Si se actualiza un cliente, actualizamos la lista local
             if (updatedClient) {
                 setClientes(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
             }
             setModalOpen(false);
         }}
        editingClient={editingClient}
      />

      {/* Modal de Ventas del Cliente */}
      {clienteActual && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40 flex items-center justify-center p-4" onClick={() => setClienteActual(null)}>
              <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl relative max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setClienteActual(null)} className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-3xl font-bold leading-none">&times;</button>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Ventas de {clienteActual.nombre}</h2>
                  {clientSalesLoading ? (
                      <p className="text-center text-blue-600 font-semibold">Cargando ventas...</p>
                  ) : ventasCliente.length === 0 ? (
                      <p className="text-center text-gray-500 italic">Este cliente no tiene ventas registradas.</p>
                  ) : (
                      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-200">
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
                                      <tr key={venta.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                                          <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{venta.codigo_venta}</td>
                                          <td className="p-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{venta.fecha ? new Date(venta.fecha).toLocaleString() : 'Fecha desconocida'}</td>
                                          <td className="p-3 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{venta.forma_pago}</td>
                                          {/* Mostrar el total final de la venta (que incluye gastos de envío y enganche) */}
                                          <td className="p-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">{formatCurrency(venta.total ?? 0)}</td>
                                          <td className="p-3 whitespace-nowrap text-center text-sm font-medium">
                                              <button
                                                  onClick={() => handleSelectSale(venta)}
                                                  className="px-3 py-1 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition duration-200 ease-in-out text-xs"
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
              </div>
          </div>
      )}

      {/* Modal de Detalle de Venta (cuando se selecciona una venta de la lista del cliente) */}
      {showSaleDetailModal && selectedSale && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" onClick={handleCloseSaleDetailModal}>
              <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg relative max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <button onClick={handleCloseSaleDetailModal} className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-3xl font-bold leading-none">&times;</button>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Detalle de Venta - {selectedSale.codigo_venta}</h2>
                  {detailLoading ? (
                      <p className="text-center text-blue-600 font-semibold">Cargando detalles...</p>
                  ) : (
                      <>
                          <div className="mb-6 text-gray-700 space-y-2">
                              <p><strong>Cliente:</strong> {clienteInfoTicket?.nombre || 'Público General'}</p> {/* Usar clienteInfoTicket */}
                              {clienteInfoTicket?.telefono && <p><strong>Teléfono:</strong> {clienteInfoTicket.telefono}</p>} {/* Usar clienteInfoTicket */}
                              {clienteInfoTicket?.correo && <p><strong>Correo:</strong> {clienteInfoTicket.correo}</p>} {/* Usar clienteInfoTicket */}
                              {clienteInfoTicket?.direccion && <p><strong>Dirección:</strong> {clienteInfoTicket.direccion}</p>} {/* Usar clienteInfoTicket */}

                              <p><strong>Fecha:</strong> {selectedSale.fecha ? new Date(selectedSale.fecha).toLocaleString() : 'Fecha desconocida'}</p>
                              <p><strong>Vendedor:</strong> {vendedorInfoTicket?.nombre || 'N/A'}</p> {/* Usar vendedorInfoTicket */}
                              <p><strong>Forma de Pago:</strong> {selectedSale.forma_pago}</p>
                          </div>
                          <hr className="my-6 border-gray-200" />
                          <h3 className="text-xl font-semibold text-gray-800 mb-4">Productos:</h3>
                          <div className="overflow-x-auto shadow-sm rounded-md mb-6">
                              <table className="w-full text-sm border-collapse">
                                  <thead className="bg-gray-100">
                                      <tr>
                                          <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                                          <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Cantidad</th>
                                          <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio</th>
                                          <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Subtotal</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {selectedSaleDetails.map((p, i) => ( // Usar selectedSaleDetails
                                          <tr key={i} className="border-b hover:bg-gray-50">
                                              <td className="p-3">{p.nombreProducto}</td> {/* Usar nombreProducto */}
                                              <td className="p-3 text-center">{p.cantidad}</td>
                                              <td className="p-3 text-right">{formatCurrency(p.precio_unitario ?? 0)}</td> {/* Usar precio_unitario */}
                                              <td className="p-3 text-right">{formatCurrency(p.total_parcial ?? 0)}</td> {/* Usar total_parcial */}
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                          {/* >>> Sección de Totales en el Modal de Detalle de Venta <<< */}
                          <div className="text-right text-gray-800 space-y-1 mb-6">
                                {/* Mostrar Enganche si es Crédito cliente y > 0 (Antes del subtotal) */}
                               {selectedSale.forma_pago === 'Crédito cliente' && (selectedSale.enganche ?? 0) > 0 && (
                                   <p className="font-semibold">Enganche: {formatCurrency(selectedSale.enganche ?? 0)}</p>
                               )}
                               {/* Mostrar Gastos de Envío si son > 0 (Antes del subtotal) */}
                               {(selectedSale.gastos_envio ?? 0) > 0 && (
                                   <p className="font-semibold">Gastos de Envío: {formatCurrency(selectedSale.gastos_envio ?? 0)}</p>
                               )}
                               {/* Mostrar Subtotal original */}
                               <p className="font-semibold">Subtotal Original: {formatCurrency(selectedSale.originalSubtotal ?? 0)}</p>
                               {/* Mostrar Descuento si aplica */}
                               {((selectedSale.tipo_descuento === 'porcentaje' && (selectedSale.valor_descuento ?? 0) > 0) || (selectedSale.tipo_descuento === 'fijo' && (selectedSale.valor_descuento ?? 0) > 0)) && (
                                   <p className="font-semibold text-red-600">
                                       Descuento:{' '}
                                       {selectedSale.tipo_descuento === 'porcentaje'
                                           ? `-${selectedSale.valor_descuento}%`
                                           : `- ${formatCurrency(selectedSale.valor_descuento ?? 0)}`}
                                   </p>
                               )}
                               {/* Mostrar Subtotal con descuento si aplica */}
                               {/* Solo mostrar si hay descuento aplicado, para evitar duplicar el subtotal original */}
                               {((selectedSale.tipo_descuento === 'porcentaje' && (selectedSale.valor_descuento ?? 0) > 0) || (selectedSale.tipo_descuento === 'fijo' && (selectedSale.valor_descuento ?? 0) > 0)) && (
                                    <p className="font-semibold">Subtotal (con descuento): {formatCurrency((selectedSale.originalSubtotal ?? 0) - (selectedSale.valor_descuento ?? 0))}</p>
                               )}

                              {/* Mostrar Total Final */}
                              <p className="font-bold text-xl text-green-700 mt-2 pt-2 border-t border-gray-300">Total Venta: {formatCurrency(selectedSale.total ?? 0)}</p> {/* selectedSale.total ya es el total final */}
                          </div>
                           {/* Fin Sección de Totales en el Modal de Detalle de Venta */}

                           {/* Sección de Balance de Cuenta (solo si es Crédito cliente) */}
                           {selectedSale.forma_pago === 'Crédito cliente' && (
                                <div className="text-center text-gray-800 mb-6">
                                   <p className="font-semibold mb-1">Balance de Cuenta:</p>
                                   {/* Aplicar clase condicional para el color */}
                                   <p className={`text-xl font-bold ${clienteBalanceTicket > 0 ? 'text-red-600' : 'text-green-700'}`}>
                                       {formatCurrency(Math.abs(clienteBalanceTicket ?? 0))} {/* Mostrar valor absoluto */}
                                   </p>
                                   <p className="text-xs text-gray-500 mt-1">
                                       {(clienteBalanceTicket ?? 0) > 0
                                           ? '(Saldo positivo indica deuda del cliente)'
                                           : '(Saldo negativo indica crédito a favor del cliente)'}
                                   </p>
                               </div>
                           )}

                          <div className="flex flex-wrap justify-end gap-3">
                              {/* Botón "Ver ticket" */}
                              <button
                                  onClick={handleShowHtmlTicket} // Llama a la función para mostrar el ticket HTML
                                  className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
                              >
                                  Ver ticket
                              </button>
                              {/* Botón "Ver PDF" que llama a la función generarPDF */}
                              <button onClick={generarPDF} className="px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-200">
                                  Ver PDF
                              </button>
                              <button
                                  onClick={handleCancelSale} // Llama a handleCancelSale
                                  disabled={cancelLoading}
                                  className={`px-6 py-2 rounded-lg shadow-md transition duration-200 ${cancelLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                              >
                                  {cancelLoading ? 'Cancelando...' : 'Eliminar venta'}
                              </button>
                          </div>
                      </>
                  )}
              </div>
          </div>
      )}


      {/* Componente para mostrar el ticket HTML */}
      {showHtmlTicket && htmlTicketData && (
          <HtmlTicketDisplay saleData={htmlTicketData} onClose={closeHtmlTicket} />
      )}

    </div>
  );
}

