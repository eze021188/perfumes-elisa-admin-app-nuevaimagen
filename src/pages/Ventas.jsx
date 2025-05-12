// src/pages/Ventas.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
// >>> Importar el componente HtmlTicketDisplay (necesario para el estado htmlTicketData) <<<
import HtmlTicketDisplay from '../components/HtmlTicketDisplay';
// >>> Importar useAuth para obtener info del vendedor (necesario para el PDF/Ticket) <<<
import { useAuth } from '../contexts/AuthContext';


// >>> Helper simple para formatear moneda (necesario para el PDF/Ticket) <<<
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

// >>> Función para cargar una imagen local y convertirla a Base64 para jsPDF (necesario para el logo en PDF) <<<
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


export default function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null); // Usado para el modal de detalle y datos
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const navigate = useNavigate();

  // >>> Estados para mostrar el ticket HTML (necesario para el botón "Ver ticket") <<<
   const [showHtmlTicket, setShowHtmlTicket] = useState(false);
   const [htmlTicketData, setHtmlTicketData] = useState(null);

   // >>> Estado para almacenar la imagen del logo en Base64 para el PDF (necesario para el logo en PDF) <<<
   const [logoBase64, setLogoBase64] = useState(null);

    // >>> Estados para almacenar información adicional para el PDF/Ticket (necesario para el PDF/Ticket) <<<
    const [clienteInfoTicket, setClienteInfoTicket] = useState(null); // Información del cliente seleccionado
    const [vendedorInfoTicket, setVendedorInfoTicket] = useState(null); // Información del vendedor de la venta
    const [clienteBalanceTicket, setClienteBalanceTicket] = useState(0); // Balance del cliente seleccionado

     // >>> Obtener usuario logueado (vendedor) del contexto (necesario para el PDF/Ticket) <<<
    const { user: currentUser } = useAuth(); // Usuario actualmente logueado


  // --- TU FUNCIÓN CARGARVENTAS ORIGINAL (NO MODIFICADA EN ESTE PASO) ---
  const cargarVentas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .order('fecha', { ascending: false });
    if (error) {
      console.error('❌ Error al cargar ventas:', error.message);
      toast.error('Error al cargar ventas.');
      setVentas([]);
    } else {
      setVentas(data || []);
    }
    setLoading(false);
  };
  // ------------------------------------------------------------------

    // >>> Cargar logo al iniciar para el PDF (necesario para el logo en PDF) <<<
    useEffect(() => {
        async function loadLogo() {
            const logoUrl = '/images/PERFUMESELISAwhite.jpg'; // Asegúrate que esta ruta sea correcta
            const base64 = await getBase64Image(logoUrl);
            setLogoBase64(base64);
        }
        loadLogo();
    }, []); // Solo se ejecuta una vez al montar


  useEffect(() => {
    cargarVentas();
  }, []);

  const cancelarVenta = async (venta) => {
    if (cancelLoading) return;
    if (!window.confirm(`¿Seguro que quieres cancelar la venta ${venta.codigo_venta}? Se restaurará el stock.`)) {
      return;
    }
    setCancelLoading(true);
    try {
      const { data: detalles = [], error: errDet } = await supabase
        .from('detalle_venta')
        .select('producto_id, cantidad')
        .eq('venta_id', venta.id);
      if (errDet) throw new Error('No se pudieron obtener los detalles de la venta.');

      for (const item of detalles) {
        const { data: prodActual, error: errProd } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.producto_id)
          .single();
        if (errProd) {
          console.error(`Error al obtener stock del producto ${item.producto_id}:`, errProd.message);
          toast.error(`Error al obtener stock del producto ${item.producto_id}.`);
          continue;
        }
        const nuevoStock = (prodActual?.stock || 0) + item.cantidad;
        const { error: errUpd } = await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', item.producto_id);
        if (errUpd) {
          console.error(`Error actualizando stock del producto ${item.producto_id}:`, errUpd.message);
          toast.error(`Error actualizando stock del producto ${item.producto_id}.`);
        }
      }

      // Eliminar movimientos de cuenta relacionados con esta venta (si existen)
      const { error: errDelMovs } = await supabase
        .from('movimientos_cuenta_clientes')
        .delete()
        .eq('referencia_venta_id', venta.id);
       if (errDelMovs) {
           console.error('Error eliminando movimientos de cuenta:', errDelMovs.message);
            toast.error('Error al eliminar movimientos de cuenta relacionados.');
            // No lanzamos error fatal aquí para permitir que la venta se elimine
       }


      const { error: errDel } = await supabase
        .from('detalle_venta')
        .delete()
        .eq('venta_id', venta.id);
      if (errDel) throw new Error('Error al eliminar los detalles de la venta.');

      const { error: errVenta } = await supabase
        .from('ventas')
        .delete()
        .eq('id', venta.id);
      if (errVenta) throw new Error('No se pudo eliminar la venta principal.');

      toast.success(` Venta ${venta.codigo_venta} cancelada correctamente.`);
      setVentaSeleccionada(null);
      cargarVentas(); // Recargar ventas para actualizar la lista
    } catch (err) {
      console.error('❌ Error general al cancelar la venta:', err.message);
      toast.error(`Ocurrió un error: ${err.message}`);
    } finally {
      setCancelLoading(false);
    }
  };

  // >>> Función para generar el PDF en formato Carta (con diseño más completo) <<<
  // Ajustada para usar los estados existentes: ventaSeleccionada, clienteInfoTicket, vendedorInfoTicket, clienteBalanceTicket, logoBase64
  const generarPDF = async () => {
      if (!ventaSeleccionada || !ventaSeleccionada.productos || ventaSeleccionada.productos.length === 0 || !clienteInfoTicket || !vendedorInfoTicket) {
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
      doc.text(`Código: ${ventaSeleccionada.codigo_venta || 'N/A'}`, doc.internal.pageSize.getWidth() - margin, yOffset + 17, { align: 'right' });

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
       // Nota: Si tienes la dirección del cliente en clienteActual, úsala aquí
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal');
      const direccionCliente = clienteInfoTicket?.direccion || 'N/A';
       // Autoajustar texto si la dirección es larga
      const splitDir = doc.splitTextToSize(direccionCliente, doc.internal.pageSize.getWidth() - margin - (margin + doc.getTextWidth('DIRECCIÓN:') + 5));
      doc.text(splitDir, margin + doc.getTextWidth('DIRECCIÓN:') + 5, yOffset);
      yOffset += (splitDir.length * infoLineHeight) + infoLineHeight; // Ajustar yOffset por las líneas de dirección


      yOffset += infoLineHeight; // Espacio antes de los datos de venta
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('FECHA:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(((ventaSeleccionada.fecha || ventaSeleccionada.created_at) ? new Date(ventaSeleccionada.fecha || ventaSeleccionada.created_at).toLocaleString() : 'Fecha desconocida'), margin + doc.getTextWidth('FECHA:') + 5, yOffset);

      yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('VENDEDOR:', margin, yOffset);
       // Nota: Obtener el nombre completo del vendedor aquí requeriría cargar su info desde la tabla 'usuarios'
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(vendedorInfoTicket?.nombre || 'N/A', margin + doc.getTextWidth('VENDEDOR:') + 5, yOffset);


      yOffset += infoLineHeight * 2; // Espacio antes de la tabla de productos


      // --- Tabla de Productos ---
      const productsHead = [['Producto', 'Cant.', 'P. Unitario', 'Desc. Item', 'Total Item']]; // Columnas más detalladas
      const productsRows = ventaSeleccionada.productos.map(p => {
          // Aquí necesitarías calcular el descuento por ítem si lo aplicas de forma individual
          // Como la lógica actual aplica el descuento al total, mostraremos 0 o N/A para Desc. Item
          // y el Total Item será solo Cant * P. Unitario si no hay descuento por ítem
          const unitPrice = parseFloat(p.precio ?? 0); // Usar p.precio del detalle de venta
          const quantity = parseFloat(p.cantidad ?? 0);
          const totalItem = parseFloat(p.subtotal ?? 0); // Usar p.subtotal del detalle de venta

          return [
              p.nombre || '–',
              quantity.toString(),
              formatCurrency(unitPrice),
              formatCurrency(0), // Simulación: Descuento por ítem (ajustar si aplicas descuento por ítem)
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
              0: { cellWidth: 60 }, // Ancho para nombre producto
              1: { cellWidth: 15, halign: 'center' }, // Cantidad
              2: { cellWidth: 25, halign: 'right' }, // P. Unitario
              3: { cellWidth: 25, halign: 'right' }, // Desc. Item (ajustar si es real)
              4: { cellWidth: 30, halign: 'right' }, // Total Item
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

      doc.text('Subtotal:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.text(formatCurrency(ventaSeleccionada.subtotal ?? 0), totalsValueStartX, yOffset, { align: 'right' });
      yOffset += totalsLineHeight;

      let descuentoTexto = 'Descuento:';
      let montoDescuentoTexto = formatCurrency(0);
      if (ventaSeleccionada.tipo_descuento === 'porcentaje' && (ventaSeleccionada.valor_descuento ?? 0) > 0) {
          // Asumiendo que valor_descuento es el MONTO del descuento, no el porcentaje
          // Si valor_descuento fuera el porcentaje, necesitarías calcular el monto:
          // const montoDescuentoCalc = (ventaSeleccionada.subtotal ?? 0) * ((ventaSeleccionada.valor_descuento ?? 0) / 100);
          // descuentoTexto = `Descuento (${ventaSeleccionada.valor_descuento}%):`;
          // montoDescuentoTexto = `- ${formatCurrency(montoDescuentoCalc)}`;

          // Si valor_descuento es el MONTO:
           descuentoTexto = 'Descuento:';
           montoDescuentoTexto = `- ${formatCurrency(ventaSeleccionada.valor_descuento ?? 0)}`;
      } else if (ventaSeleccionada.tipo_descuento === 'fijo' && (ventaSeleccionada.valor_descuento ?? 0) > 0) {
          descuentoTexto = 'Descuento:';
          montoDescuentoTexto = `- ${formatCurrency(ventaSeleccionada.valor_descuento ?? 0)}`;
      }
      doc.text(descuentoTexto, totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.setTextColor(220, 53, 69); // Rojo para descuento
      doc.text(montoDescuentoTexto, totalsValueStartX, yOffset, { align: 'right' });
      doc.setTextColor(0, 0, 0); // Resetear color a negro
      yOffset += totalsLineHeight;

       // Forma de Pago
      doc.text('Forma de Pago:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.text(ventaSeleccionada.forma_pago || 'Desconocida', totalsValueStartX, yOffset, { align: 'right' });
      yOffset += totalsLineHeight;

       // Enganche (solo si es Crédito cliente Y hubo enganche > 0)
      if (ventaSeleccionada.forma_pago === 'Crédito cliente' && (ventaSeleccionada.enganche ?? 0) > 0) {
          doc.text('Enganche:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
          doc.text(formatCurrency(ventaSeleccionada.enganche ?? 0), totalsValueStartX, yOffset, { align: 'right' });
          yOffset += totalsLineHeight;
      }

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
      doc.text(formatCurrency(ventaSeleccionada.total ?? 0), totalsValueStartX, yOffset, { align: 'right' });
      doc.setTextColor(0, 0, 0); // Resetear color a negro
      yOffset += finalTotalFontSize + 15;


      // --- Sección de Balance de Cuenta (solo si es Crédito cliente) ---
       if (ventaSeleccionada.forma_pago === 'Crédito cliente') {
           const balanceLabelFontSize = 10;
           const balanceValueFontSize = 12;
           const balanceNoteFontSize = 8;
           const balanceLineHeight = 5;

           // Necesitamos obtener el balance anterior para mostrar el desglose
           // Balance Anterior = Balance Actual - Total de Venta (si la venta es un cargo) + Enganche (si fue un abono)
           // Usamos el balance_cuenta calculado en handleSelectSale (clienteBalanceTicket)
           const currentBalance = (clienteBalanceTicket ?? 0);
           // Para obtener el balance anterior, restamos el efecto de ESTA venta (total) y sumamos el enganche (que fue un abono)
           const previousBalance = currentBalance - (ventaSeleccionada.total ?? 0) + (ventaSeleccionada.enganche ?? 0);


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
           doc.text(formatCurrency(ventaSeleccionada.total ?? 0), doc.internal.pageSize.getWidth() - margin, yOffset, { align: 'right' });
           yOffset += balanceLineHeight;

           // Pagos/Enganche (si aplica)
           if ((ventaSeleccionada.enganche ?? 0) > 0) {
                doc.text('Enganche Pagado:', margin + 10, yOffset);
                 doc.text(`- ${formatCurrency(ventaSeleccionada.enganche ?? 0)}`, doc.internal.pageSize.getWidth() - margin, yOffset, { align: 'right' });
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


    // >>> Función para preparar datos y mostrar el ticket HTML (necesario para el botón "Ver ticket") <<<
    const handleShowHtmlTicket = async () => {
        if (!ventaSeleccionada || !ventaSeleccionada.productos || ventaSeleccionada.productos.length === 0 || !clienteInfoTicket || !vendedorInfoTicket) {
            toast.error("Datos incompletos para mostrar el ticket HTML.");
            return;
        }

        // Los datos necesarios ya están cargados en los estados:
        // ventaSeleccionada (contiene detalles y totales), clienteInfoTicket, vendedorInfoTicket, clienteBalanceTicket

         const now = ventaSeleccionada.fecha || ventaSeleccionada.created_at ? new Date(ventaSeleccionada.fecha || ventaSeleccionada.created_at) : new Date();
         // Formatear la fecha a dd/mm/aa HH:MM
         const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;


        const ticketData = {
             codigo_venta: ventaSeleccionada.codigo_venta,
             cliente: {
                 id: clienteInfoTicket.id,
                 nombre: clienteInfoTicket.nombre,
                 telefono: clienteInfoTicket.telefono || 'N/A',
             },
             vendedor: {
                 nombre: vendedorInfoTicket.nombre || 'N/A',
             },
             fecha: formattedDate,
             productosVenta: ventaSeleccionada.productos.map(item => ({ // Mapear los detalles de venta cargados
                 id: item.producto_id, // Asumiendo que el detalle tiene producto_id
                 nombre: item.nombre, // Usar el nombre del producto obtenido en la carga del detalle
                 cantidad: item.cantidad,
                 precio_unitario: item.precio, // Usar el precio unitario del detalle
                 total_parcial: item.subtotal, // Usar el subtotal por ítem del detalle
             })),
             originalSubtotal: ventaSeleccionada.subtotal, // Usar subtotal de la venta seleccionada (antes de descuento general)
             discountAmount: ventaSeleccionada.valor_descuento, // Usar valor_descuento de la venta seleccionada (descuento general)
             forma_pago: ventaSeleccionada.forma_pago, // Usar forma_pago de la venta seleccionada
             enganche: ventaSeleccionada.enganche || 0, // Usar enganche de la venta seleccionada
             total: ventaSeleccionada.total, // Usar total de la venta seleccionada (después de descuento general)
             balance_cuenta: clienteBalanceTicket, // Usar el balance de cuenta cargado
         };

         setHtmlTicketData(ticketData); // Guardar los datos para el ticket HTML
         setShowHtmlTicket(true); // Mostrar el modal del ticket HTML
         // No cerramos el modal de detalle de venta aquí, solo mostramos el ticket HTML encima
    };

     // >>> Función para cerrar el modal del ticket HTML (necesario para el botón "Ver ticket") <<<
      const closeHtmlTicket = () => {
          setShowHtmlTicket(false);
          setHtmlTicketData(null); // Limpiar datos del ticket al cerrar
      };
    // --------------------------------------------------

    // --- Modificar la lógica de selección de venta para cargar datos adicionales ---
    const handleSelectSale = async (venta) => {
        // >>> CORRECCIÓN: Usar setVentaSeleccionada en lugar de setSelectedSale <<<
        setVentaSeleccionada(venta); // Establecer la venta seleccionada para mostrar el modal
        setDetailLoading(true); // Iniciar carga de detalle del modal
        setClienteInfoTicket(null); // Limpiar info cliente previa
        setVendedorInfoTicket(null); // Limpiar info vendedor previa
        setClienteBalanceTicket(0); // Limpiar balance previo

        console.log(`[handleSelectSale] Fetching details for venta ID: ${venta.id}`);

        // 1. Cargar detalles de la venta (ya lo haces)
        const { data: dets = [], error: errDet } = await supabase
            .from('detalle_venta')
            .select(`
              producto_id,
              cantidad,
              precio_unitario,
              total_parcial,
              producto:productos(nombre)
            `)
            .eq('venta_id', venta.id);

        if (errDet) {
            console.error('Error cargando detalle:', errDet.message);
            toast.error('Error al cargar los detalles de la venta.');
            setDetailLoading(false);
            setVentaSeleccionada(null); // Cerrar modal si falla la carga del detalle
            return;
        }

        const productosMapeados = dets.map(d => ({
            // Mapear a una estructura compatible con el PDF y el ticket HTML
            producto_id: d.producto_id,
            nombre: d.producto?.nombre || '–',
            cantidad: d.cantidad ?? 0,
            precio: d.precio_unitario ?? 0, // Precio unitario
            subtotal: d.total_parcial ?? 0 // Total por ítem
        }));


        // 2. Cargar información completa del cliente (si no está ya en el objeto venta)
        // Nota: Tu función cargarVentas original no carga la relación cliente.
        // Necesitamos cargar la info del cliente aquí.
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
         setClienteInfoTicket(clienteData);


        // 3. Cargar información del vendedor (si no está ya en el objeto venta)
         let vendedorData = null;
         // Nota: Tu función cargarVentas original no carga la relación vendedor.
         // Necesitamos cargar la info del vendedor aquí si venta.vendedor_id existe.
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
         setVendedorInfoTicket(vendedorData);


        // 4. Cargar el balance actual del cliente (solo si hay cliente_id)
        let currentClientBalance = 0;
         if (clienteData?.id) {
            const { data: balanceData, error: balanceError } = await supabase
                .from('movimientos_cuenta_clientes')
                .select('monto')
                .eq('cliente_id', clienteData.id);

            if (balanceError) {
                console.error("Error loading client balance for ticket:", balanceError);
                 toast.error("No se pudo cargar el balance del cliente para el ticket.");
            } else {
                currentClientBalance = (balanceData || []).reduce((sum, mov) => sum + (parseFloat(mov.monto) || 0), 0);
            }
         }
         setClienteBalanceTicket(currentClientBalance);


        // 5. Actualizar el estado ventaSeleccionada con los detalles y datos adicionales
        // Ya establecimos ventaSeleccionada al inicio, ahora solo actualizamos sus propiedades
        // con los datos cargados.
        setVentaSeleccionada(prev => ({
            ...prev, // Mantener propiedades de la venta original
            productos: productosMapeados, // Usar los productos mapeados
            // Asegurarse de que los totales, descuento y enganche estén presentes
            subtotal: venta.subtotal ?? 0, // Subtotal original antes del descuento general
            total: venta.total ?? 0, // Total final después del descuento general
            valor_descuento: venta.valor_descuento ?? 0, // Monto del descuento general
            tipo_descuento: venta.tipo_descuento || 'fijo', // Tipo de descuento general
            enganche: venta.enganche ?? 0, // Enganche
            // Los datos de cliente, vendedor y balance se guardan en sus propios estados
            // y se usan directamente desde ellos en el JSX del modal.
        }));


        setDetailLoading(false); // Finalizar carga de detalle
        // El modal de detalle de venta se abre automáticamente al establecer ventaSeleccionada
    };
    // -------------------------------------------------------------------------


  const ventasFiltradas = ventas.filter(v =>
    (v.cliente_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.codigo_venta || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.forma_pago || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
       {/* Encabezado responsive */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>

        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Historial de Ventas
        </h1>

        <div className="w-full md:w-[150px]" />
      </div>
      <div className="mb-6 flex justify-center">
        <input
          type="text"
          placeholder="Buscar por cliente, código o pago..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="p-3 border rounded-md shadow-sm w-full md:w-1/2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
        />
      </div>

      {loading ? (
        <p className="text-center text-lg font-semibold text-gray-700">Cargando ventas...</p>
      ) : ventasFiltradas.length === 0 ? (
        <p className="text-center text-gray-500 italic">No hay ventas encontradas.</p>
      ) : (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-200">
              <tr>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Fecha</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Pago</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                  <th className="p-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th> {/* Columna de acciones */}
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map(venta => (
                // >>> CORRECCIÓN: Eliminar espacios en blanco entre <tr> y <td> <<<
                <tr key={venta.id} className="border-b hover:bg-gray-50 transition duration-150 ease-in-out cursor-pointer">
                  <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900">{venta.codigo_venta}</td>
                  <td className="p-4 whitespace-nowrap text-sm text-gray-700">{venta.cliente_nombre}</td>
                  <td className="p-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{venta.fecha ? new Date(venta.fecha).toLocaleString() : 'Fecha desconocida'}</td>
                  <td className="p-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{venta.forma_pago}</td>
                  <td className="p-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">{formatCurrency(venta.total ?? 0)}</td>
                   {/* Celda de acciones */}
                   <td className="p-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleSelectSale(venta); }}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition duration-200 ease-in-out text-xs"
                        >
                            Ver Detalle
                        </button>
                   </td>
                </tr>
                // >>> CORRECCIÓN: Eliminar espacios en blanco entre </td> y </tr> <<<
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ventaSeleccionada && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" onClick={() => setVentaSeleccionada(null)}>
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg relative max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setVentaSeleccionada(null)} className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-3xl font-bold leading-none">&times;</button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Detalle de Venta - {ventaSeleccionada.codigo_venta}</h2>
            {detailLoading ? (
              <p className="text-center text-blue-600 font-semibold">Cargando detalles...</p>
            ) : (
              <>
                <div className="mb-6 text-gray-700 space-y-2">
                  {/* Usar la info del cliente cargada para el ticket */}
                  <p><strong>Cliente:</strong> {clienteInfoTicket?.nombre || 'Público General'}</p>
                   {/* Mostrar teléfono si está disponible */}
                   {clienteInfoTicket?.telefono && <p><strong>Teléfono:</strong> {clienteInfoTicket.telefono}</p>}
                   {/* Mostrar correo si está disponible */}
                   {clienteInfoTicket?.correo && <p><strong>Correo:</strong> {clienteInfoTicket.correo}</p>}
                   {/* Mostrar dirección si está disponible */}
                   {clienteInfoTicket?.direccion && <p><strong>Dirección:</strong> {clienteInfoTicket.direccion}</p>}

                  <p><strong>Fecha:</strong> {ventaSeleccionada.fecha ? new Date(ventaSeleccionada.fecha).toLocaleString() : 'Fecha desconocida'}</p>
                   {/* Usar la info del vendedor cargada para el ticket */}
                   <p><strong>Vendedor:</strong> {vendedorInfoTicket?.nombre || 'N/A'}</p>
                  <p><strong>Forma de Pago:</strong> {ventaSeleccionada.forma_pago}</p>
                   {/* Mostrar enganche si es Crédito cliente y > 0 */}
                   {ventaSeleccionada.forma_pago === 'Crédito cliente' && (ventaSeleccionada.enganche ?? 0) > 0 && (
                       <p><strong>Enganche:</strong> {formatCurrency(ventaSeleccionada.enganche ?? 0)}</p>
                   )}
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
                      {ventaSeleccionada.productos.map((p, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="p-3">{p.nombre}</td>
                            <td className="p-3 text-center">{p.cantidad}</td>
                            <td className="p-3 text-right">{formatCurrency(p.precio ?? 0)}</td> {/* Usar formatCurrency */}
                            <td className="p-3 text-right">{formatCurrency(p.subtotal ?? 0)}</td> {/* Usar formatCurrency */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-right text-gray-800 space-y-1 mb-6">
                  <p className="font-semibold">Subtotal: {formatCurrency(ventaSeleccionada.subtotal ?? 0)}</p> {/* Usar formatCurrency */}
                  {((ventaSeleccionada.tipo_descuento === 'porcentaje' && (ventaSeleccionada.valor_descuento ?? 0) > 0) || (ventaSeleccionada.tipo_descuento === 'fijo' && (ventaSeleccionada.valor_descuento ?? 0) > 0)) && (
                    <p className="font-semibold text-red-600">
                      Descuento:{' '}
                      {ventaSeleccionada.tipo_descuento === 'porcentaje'
                        ? `-${ventaSeleccionada.valor_descuento}%`
                        : `- ${formatCurrency(ventaSeleccionada.valor_descuento ?? 0)}`} {/* Usar formatCurrency */}
                    </p>
                  )}
                  <p className="font-bold text-xl text-green-700 mt-2 pt-2 border-t border-gray-300">Total: {formatCurrency(ventaSeleccionada.total ?? 0)}</p> {/* Usar formatCurrency */}
                </div>
                 {/* Sección de Balance de Cuenta (solo si es Crédito cliente) */}
                 {ventaSeleccionada.forma_pago === 'Crédito cliente' && (
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
                    {/* >>> Botón "Ver ticket" <<< */}
                    <button
                        onClick={handleShowHtmlTicket} // Llama a la función para mostrar el ticket HTML
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
                    >
                        Ver ticket
                    </button>
                    {/* ------------------------- */}
                  {/* >>> Botón "Ver PDF" que llama a la nueva función generarPDF <<< */}
                  <button onClick={generarPDF} className="px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-200">
                    Ver PDF
                  </button>
                  {/* ---------------------------------------------------------- */}
                  <button
                    onClick={() => cancelarVenta(ventaSeleccionada)}
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

      {/* >>> Componente para mostrar el ticket HTML <<< */}
      {showHtmlTicket && htmlTicketData && (
          <HtmlTicketDisplay saleData={htmlTicketData} onClose={closeHtmlTicket} />
      )}
      {/* ------------------------------------------ */}

    </div>
  );
}
