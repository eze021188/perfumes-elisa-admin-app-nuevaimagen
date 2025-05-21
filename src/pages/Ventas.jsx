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


  const cargarVentas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ventas')
      .select('*, enganche, gastos_envio, monto_credito_aplicado') // Asegúrate que monto_credito_aplicado exista
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

    useEffect(() => {
        async function loadLogo() {
            const logoUrl = '/images/PERFUMESELISAwhite.jpg'; 
            const base64 = await getBase64Image(logoUrl);
            setLogoBase64(base64);
        }
        loadLogo();
    }, []);


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
        const nuevoStock = (prodActual?.stock || 0) + (item.cantidad ?? 0);
        const { error: errUpd } = await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', item.producto_id);
        if (errUpd) {
          console.error(`Error actualizando stock del producto ${item.producto_id}:`, errUpd.message);
          toast.error(`Error actualizando stock del producto ${item.producto_id}.`);
        }
      }

      const { error: errDelMovs } = await supabase
        .from('movimientos_cuenta_clientes')
        .delete()
        .eq('referencia_venta_id', venta.id);
       if (errDelMovs) {
           console.error('Error eliminando movimientos de cuenta:', errDelMovs.message);
            toast.error('Error al eliminar movimientos de cuenta relacionados.');
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
      cargarVentas();
    } catch (err) {
      console.error('❌ Error general al cancelar la venta:', err.message);
      toast.error(`Ocurrió un error: ${err.message}`);
    } finally {
      setCancelLoading(false);
    }
  };

  const generarPDF = async () => {
      if (!ventaSeleccionada || !ventaSeleccionada.productos || ventaSeleccionada.productos.length === 0 || !clienteInfoTicket || !vendedorInfoTicket || ventaSeleccionada.enganche === undefined || ventaSeleccionada.gastos_envio === undefined) {
          toast.error("Datos incompletos para generar el PDF.");
          return;
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const margin = 15;
      let yOffset = margin;
      const logoWidth = 30;
      const logoHeight = 30;
      const companyInfoX = margin + logoWidth + 10;

      if (logoBase64) {
          doc.addImage(logoBase64, 'JPEG', margin, yOffset, logoWidth, logoHeight);
      } else {
           doc.setFontSize(10);
           doc.text("Logo Aquí", margin + logoWidth / 2, yOffset + logoHeight / 2, { align: 'center' });
      }

      doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text('PERFUMES ELISA', companyInfoX, yOffset + 5);
      doc.setFontSize(10); doc.setFont(undefined, 'normal');
      doc.text('Ciudad Apodaca, N.L., C.P. 66640', companyInfoX, yOffset + 17);
      doc.text('Teléfono: 81 3080 4010', companyInfoX, yOffset + 22);
      
      doc.setFontSize(20); doc.setFont(undefined, 'bold'); doc.text('TICKET DE VENTA', doc.internal.pageSize.getWidth() - margin, yOffset + 10, { align: 'right' });
      doc.setFontSize(12); doc.setFont(undefined, 'normal'); doc.text(`Código: ${ventaSeleccionada.codigo_venta || 'N/A'}`, doc.internal.pageSize.getWidth() - margin, yOffset + 17, { align: 'right' });
      yOffset += Math.max(logoHeight, 30) + 15;
      doc.line(margin, yOffset, doc.internal.pageSize.getWidth() - margin, yOffset);
      yOffset += 10;

      const infoLabelFontSize = 9; const infoValueFontSize = 10; const infoLineHeight = 6;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('CLIENTE:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(clienteInfoTicket?.nombre || 'Público General', margin + doc.getTextWidth('CLIENTE:') + 5, yOffset);
      yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('TELÉFONO:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(clienteInfoTicket?.telefono || 'N/A', margin + doc.getTextWidth('TELÉFONO:') + 5, yOffset);
      yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('CORREO:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(clienteInfoTicket?.correo || 'N/A', margin + doc.getTextWidth('CORREO:') + 5, yOffset);
      yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('DIRECCIÓN:', margin, yOffset);
      const direccionCliente = clienteInfoTicket?.direccion || 'N/A';
      const splitDir = doc.splitTextToSize(direccionCliente, doc.internal.pageSize.getWidth() - margin - (margin + doc.getTextWidth('DIRECCIÓN:') + 5));
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(splitDir, margin + doc.getTextWidth('DIRECCIÓN:') + 5, yOffset);
      yOffset += (splitDir.length * infoLineHeight) + infoLineHeight;
      yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('FECHA:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(((ventaSeleccionada.fecha || ventaSeleccionada.created_at) ? new Date(ventaSeleccionada.fecha || ventaSeleccionada.created_at).toLocaleString() : 'Fecha desconocida'), margin + doc.getTextWidth('FECHA:') + 5, yOffset);
      yOffset += infoLineHeight;
      doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('VENDEDOR:', margin, yOffset);
      doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(vendedorInfoTicket?.nombre || 'N/A', margin + doc.getTextWidth('VENDEDOR:') + 5, yOffset);
      yOffset += infoLineHeight * 2;

      const productsHead = [['Producto', 'Cant.', 'P. Unitario', 'Total Item']];
      const productsRows = ventaSeleccionada.productos.map(p => [
          p.nombre || '–',
          (parseFloat(p.cantidad ?? 0)).toString(),
          formatCurrency(p.precio_unitario ?? 0),
          formatCurrency(p.total_parcial ?? 0)
      ]);
      doc.autoTable({
          head: productsHead, body: productsRows, startY: yOffset, theme: 'striped',
          styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 15, halign: 'center' }, 2: { cellWidth: 25, halign: 'right' }, 3: { cellWidth: 30, halign: 'right' }},
          margin: { left: margin, right: margin },
          didDrawPage: (data) => { doc.setFontSize(8); doc.text('Página ' + data.pageNumber, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - margin, { align: 'right' }); }
      });
      yOffset = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yOffset + 10;

      const totalsLabelWidth = 45;
      const totalsValueStartX = doc.internal.pageSize.getWidth() - margin;
      const totalsLineHeight = 6; const totalsFontSize = 10; const finalTotalFontSize = 14;
      doc.setFontSize(totalsFontSize); doc.setFont(undefined, 'normal');

      doc.text('Subtotal (Productos):', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.text(formatCurrency(ventaSeleccionada.subtotal ?? 0), totalsValueStartX, yOffset, { align: 'right' });
      yOffset += totalsLineHeight;

      if ((ventaSeleccionada.valor_descuento ?? 0) > 0) {
          let discountLabel = 'Descuento:';
          doc.text(discountLabel, totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
          doc.setTextColor(220, 53, 69);
          doc.text(`- ${formatCurrency(ventaSeleccionada.valor_descuento ?? 0)}`, totalsValueStartX, yOffset, { align: 'right' });
          doc.setTextColor(0, 0, 0);
          yOffset += totalsLineHeight;
      }
      
      if ((ventaSeleccionada.gastos_envio ?? 0) > 0) {
           doc.text('Gastos de Envío:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
           doc.text(formatCurrency(ventaSeleccionada.gastos_envio ?? 0), totalsValueStartX, yOffset, { align: 'right' });
           yOffset += totalsLineHeight;
       }

      // --- NUEVO/MODIFICADO: Mostrar Saldo a Favor Aplicado en PDF ---
      if ((ventaSeleccionada.monto_credito_aplicado ?? 0) > 0) {
          doc.text('Saldo a Favor Aplicado:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
          doc.setTextColor(40, 167, 69); // Verde para crédito aplicado
          doc.text(`- ${formatCurrency(ventaSeleccionada.monto_credito_aplicado ?? 0)}`, totalsValueStartX, yOffset, { align: 'right' });
          doc.setTextColor(0, 0, 0);
          yOffset += totalsLineHeight;
      }
      // --- FIN NUEVO/MODIFICADO ---

      if (ventaSeleccionada.forma_pago === 'Crédito cliente' && (ventaSeleccionada.enganche ?? 0) > 0) {
           doc.text('Enganche Pagado:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
           doc.text(formatCurrency(ventaSeleccionada.enganche ?? 0), totalsValueStartX, yOffset, { align: 'right' });
           yOffset += totalsLineHeight;
       }
      
      doc.text('Forma de Pago:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.text(ventaSeleccionada.forma_pago || 'Desconocida', totalsValueStartX, yOffset, { align: 'right' });
      yOffset += totalsLineHeight * 1.5;

      doc.setFontSize(finalTotalFontSize); doc.setFont(undefined, 'bold');
      doc.text('TOTAL PAGADO:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.setTextColor(40, 167, 69);
      doc.text(formatCurrency(ventaSeleccionada.total ?? 0), totalsValueStartX, yOffset, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      yOffset += finalTotalFontSize + 15;

       if (ventaSeleccionada.forma_pago === 'Crédito cliente') {
           const balanceLabelFontSize = 10; const balanceValueFontSize = 12; const balanceNoteFontSize = 8; const balanceLineHeight = 5;
           const currentBalance = (clienteBalanceTicket ?? 0);
           
           doc.setFontSize(balanceLabelFontSize); doc.setFont(undefined, 'bold');
           doc.text('BALANCE DE CUENTA ACTUAL', margin, yOffset);
           yOffset += balanceLineHeight * 2;

           doc.setFontSize(balanceValueFontSize + 2); doc.setFont(undefined, 'bold');
           doc.text('Saldo Actual Cliente:', margin + 10, yOffset);
           if (currentBalance > 0) doc.setTextColor(220, 53, 69); else doc.setTextColor(40, 167, 69);
           doc.text(formatCurrency(currentBalance), doc.internal.pageSize.getWidth() - margin, yOffset, { align: 'right' });
           doc.setTextColor(0, 0, 0);
           yOffset += balanceLineHeight * 2;
           doc.setFontSize(balanceNoteFontSize); doc.setFont(undefined, 'normal');
           const balanceNoteText = currentBalance > 0 ? '(Saldo positivo indica deuda del cliente)' : '(Saldo negativo indica crédito a favor del cliente)';
           doc.text(balanceNoteText, margin, yOffset);
           yOffset += balanceLineHeight * 2;
       }

      const footerFontSize = 8; const footerLineHeight = 4;
      doc.setFontSize(footerFontSize); doc.setFont(undefined, 'normal');
      doc.text('¡Gracias por tu compra!', margin, yOffset);
      yOffset += footerLineHeight;
      doc.text('Visítanos de nuevo pronto.', margin, yOffset);
      doc.output('dataurlnewwindow');
  };

    const handleShowHtmlTicket = async () => {
        if (!ventaSeleccionada || !ventaSeleccionada.productos || ventaSeleccionada.productos.length === 0 || !clienteInfoTicket || !vendedorInfoTicket) {
            toast.error("Datos incompletos para mostrar el ticket HTML.");
            return;
        }
         const now = ventaSeleccionada.fecha || ventaSeleccionada.created_at ? new Date(ventaSeleccionada.fecha || ventaSeleccionada.created_at) : new Date();
         const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
         const enganchePagado = ventaSeleccionada.enganche ?? 0;
         const gastosEnvioVenta = ventaSeleccionada.gastos_envio ?? 0;
         const montoCreditoAplicadoVenta = ventaSeleccionada.monto_credito_aplicado ?? 0;

        const ticketData = {
             codigo_venta: ventaSeleccionada.codigo_venta,
             cliente: { id: clienteInfoTicket.id, nombre: clienteInfoTicket.nombre, telefono: clienteInfoTicket.telefono || 'N/A' },
             vendedor: { nombre: vendedorInfoTicket?.nombre || 'N/A' },
             fecha: formattedDate,
             productosVenta: ventaSeleccionada.productos.map(item => ({
                 id: item.producto_id, nombre: item.nombre || '–', cantidad: item.cantidad,
                 precio_unitario: item.precio_unitario, total_parcial: item.total_parcial,
             })),
             originalSubtotal: ventaSeleccionada.subtotal,
             discountAmount: ventaSeleccionada.valor_descuento,
             monto_credito_aplicado: montoCreditoAplicadoVenta, // Ya se estaba pasando
             forma_pago: ventaSeleccionada.forma_pago,
             enganche: enganchePagado,
             gastos_envio: gastosEnvioVenta,
             total_final: ventaSeleccionada.total,
             balance_cuenta: clienteBalanceTicket,
         };
         setHtmlTicketData(ticketData);
         setShowHtmlTicket(true);
    };

    const closeHtmlTicket = () => {
        setShowHtmlTicket(false);
        setHtmlTicketData(null);
    };

    const handleSelectSale = async (venta) => {
        setVentaSeleccionada(venta);
        setDetailLoading(true);
        setClienteInfoTicket(null);
        setVendedorInfoTicket(null);
        setClienteBalanceTicket(0);

        const { data: dets = [], error: errDet } = await supabase
            .from('detalle_venta')
            .select(`producto_id, cantidad, precio_unitario, total_parcial, producto:productos(nombre)`)
            .eq('venta_id', venta.id);

        if (errDet) {
            toast.error('Error al cargar los detalles de la venta.');
            setDetailLoading(false); setVentaSeleccionada(null); return;
        }
        const productosMapeados = dets.map(d => ({
            producto_id: d.producto_id, nombre: d.producto?.nombre || '–', cantidad: d.cantidad ?? 0,
            precio_unitario: d.precio_unitario ?? 0, total_parcial: d.total_parcial ?? 0
        }));

        let clienteData = null;
        if (venta.cliente_id) {
             const { data: cliData, error: cliError } = await supabase.from('clientes').select('id, nombre, telefono, correo, direccion').eq('id', venta.cliente_id).single();
             if (cliError) clienteData = { id: venta.cliente_id, nombre: venta.cliente_nombre || 'Público General', telefono: 'N/A' };
             else clienteData = cliData;
        } else {
             clienteData = { id: null, nombre: venta.cliente_nombre || 'Público General', telefono: 'N/A' };
        }
         setClienteInfoTicket(clienteData);

         let vendedorData = null;
         if (venta.vendedor_id) {
             const { data: vendData, error: vendError } = await supabase.from('usuarios').select('id, nombre').eq('id', venta.vendedor_id).single();
             if (vendError) vendedorData = { id: venta.vendedor_id, nombre: currentUser?.email || 'N/A' };
             else vendedorData = vendData;
         } else {
             vendedorData = { id: currentUser?.id || null, nombre: currentUser?.email || 'N/A' };
         }
         setVendedorInfoTicket(vendedorData);

        let currentClientBalance = 0;
         if (clienteData?.id) {
            const { data: balanceData, error: balanceError } = await supabase.from('movimientos_cuenta_clientes').select('monto').eq('cliente_id', clienteData.id);
            if (!balanceError) currentClientBalance = (balanceData || []).reduce((sum, mov) => sum + (parseFloat(mov.monto) || 0), 0);
         }
         setClienteBalanceTicket(currentClientBalance);

        setVentaSeleccionada(prev => ({
            ...prev,
            productos: productosMapeados,
            subtotal: venta.subtotal ?? 0,
            total: venta.total ?? 0,
            valor_descuento: venta.valor_descuento ?? 0,
            tipo_descuento: venta.tipo_descuento || 'fijo',
            enganche: venta.enganche ?? 0,
            gastos_envio: venta.gastos_envio ?? 0,
            monto_credito_aplicado: venta.monto_credito_aplicado ?? 0
        }));
        setDetailLoading(false);
    };

  const ventasFiltradas = ventas.filter(v =>
    (v.cliente_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.codigo_venta || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.forma_pago || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
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
            <thead className="bg-gray-200"><tr>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Fecha</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Pago</th>
              <th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
              <th className="p-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr></thead>
            <tbody>{ventasFiltradas.map(venta => (
              <tr key={venta.id} className="border-b hover:bg-gray-50 transition duration-150 ease-in-out cursor-pointer">
                <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900">{venta.codigo_venta}</td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-700">{venta.cliente_nombre}</td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{venta.fecha ? new Date(venta.fecha).toLocaleString() : 'Fecha desconocida'}</td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{venta.forma_pago}</td>
                <td className="p-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">{formatCurrency(venta.total ?? 0)}</td>
                 <td className="p-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                          onClick={(e) => { e.stopPropagation(); handleSelectSale(venta); }}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition duration-200 ease-in-out text-xs"
                      >
                          Ver Detalle
                      </button>
                 </td>
              </tr>
            ))}</tbody>
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
                  <p><strong>Cliente:</strong> {clienteInfoTicket?.nombre || 'Público General'}</p>
                   {clienteInfoTicket?.telefono && <p><strong>Teléfono:</strong> {clienteInfoTicket.telefono}</p>}
                   {clienteInfoTicket?.correo && <p><strong>Correo:</strong> {clienteInfoTicket.correo}</p>}
                   {clienteInfoTicket?.direccion && <p><strong>Dirección:</strong> {clienteInfoTicket.direccion}</p>}
                  <p><strong>Fecha:</strong> {ventaSeleccionada.fecha ? new Date(ventaSeleccionada.fecha).toLocaleString() : 'Fecha desconocida'}</p>
                   <p><strong>Vendedor:</strong> {vendedorInfoTicket?.nombre || 'N/A'}</p>
                  <p><strong>Forma de Pago:</strong> {ventaSeleccionada.forma_pago}</p>
                </div>
                <hr className="my-6 border-gray-200" />
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Productos:</h3>
                <div className="overflow-x-auto shadow-sm rounded-md mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100"><tr>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                      <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Cantidad</th>
                      <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio</th>
                      <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Subtotal</th>
                    </tr></thead>
                    <tbody>{ventaSeleccionada.productos.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="p-3">{p.nombre}</td>
                        <td className="p-3 text-center">{p.cantidad}</td>
                        <td className="p-3 text-right">{formatCurrency(p.precio_unitario ?? 0)}</td>
                        <td className="p-3 text-right">{formatCurrency(p.total_parcial ?? 0)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                 <div className="text-right text-gray-800 space-y-1 mb-6">
                     {ventaSeleccionada.forma_pago === 'Crédito cliente' && (ventaSeleccionada.enganche ?? 0) > 0 && (
                         <p className="font-semibold">Enganche: {formatCurrency(ventaSeleccionada.enganche ?? 0)}</p>
                     )}
                     {(ventaSeleccionada.gastos_envio ?? 0) > 0 && (
                         <p className="font-semibold">Gastos de Envío: {formatCurrency(ventaSeleccionada.gastos_envio ?? 0)}</p>
                     )}
                     <p className="font-semibold">Subtotal: {formatCurrency(ventaSeleccionada.subtotal ?? 0)}</p>
                     {((ventaSeleccionada.tipo_descuento === 'porcentaje' && (ventaSeleccionada.valor_descuento ?? 0) > 0) || (ventaSeleccionada.tipo_descuento === 'fijo' && (ventaSeleccionada.valor_descuento ?? 0) > 0)) && (
                         <p className="font-semibold text-red-600">
                             Descuento:{' '}
                             {ventaSeleccionada.tipo_descuento === 'porcentaje'
                                 ? `-${ventaSeleccionada.valor_descuento}%` // Esto podría estar mal si valor_descuento es el monto
                                 : `- ${formatCurrency(ventaSeleccionada.valor_descuento ?? 0)}`}
                         </p>
                     )}
                     {(ventaSeleccionada.monto_credito_aplicado ?? 0) > 0 && (
                        <p className="font-semibold text-blue-600">Saldo a Favor Aplicado: -{formatCurrency(ventaSeleccionada.monto_credito_aplicado ?? 0)}</p>
                     )}
                     <p className="font-bold text-xl text-green-700 mt-2 pt-2 border-t border-gray-300">Total Venta: {formatCurrency(ventaSeleccionada.total ?? 0)}</p>
                 </div>
                           {ventaSeleccionada.forma_pago === 'Crédito cliente' && (
                                <div className="text-center text-gray-800 mb-6">
                                   <p className="font-semibold mb-1">Balance de Cuenta:</p>
                                   <p className={`text-xl font-bold ${clienteBalanceTicket > 0 ? 'text-red-600' : 'text-green-700'}`}>
                                       {formatCurrency(Math.abs(clienteBalanceTicket ?? 0))}
                                   </p>
                                   <p className="text-xs text-gray-500 mt-1">
                                       {(clienteBalanceTicket ?? 0) > 0
                                           ? '(Saldo positivo indica deuda del cliente)'
                                           : '(Saldo negativo indica crédito a favor del cliente)'}
                                   </p>
                               </div>
                           )}
                <div className="flex flex-wrap justify-end gap-3">
                    <button
                        onClick={handleShowHtmlTicket}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
                    >
                        Ver ticket
                    </button>
                  <button onClick={generarPDF} className="px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-200">
                    Ver PDF
                  </button>
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

      {showHtmlTicket && htmlTicketData && (
          <HtmlTicketDisplay saleData={htmlTicketData} onClose={closeHtmlTicket} />
      )}

    </div>
  );
}
