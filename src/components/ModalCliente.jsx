// src/components/ModalCliente.jsx
import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

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

// Función para cargar una imagen local y convertirla a Base64 para jsPDF
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

export default function ModalCliente({
  venta,
  clientName,
  isOpen,
  onClose,
  onDelete
}) {
  const [detalle, setDetalle] = useState({ info: null, items: [] });
  const [loading, setLoading] = useState(true);
  const [vendedorInfoTicket, setVendedorInfoTicket] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);

  useEffect(() => {
    if (!venta || !isOpen) {
      setLoading(false);
      return;
    }
    fetchDetalle();

    async function loadLogo() {
        const logoUrl = '/images/PERFUMESELISAwhite.jpg';
        const base64 = await getBase64Image(logoUrl);
        setLogoBase64(base64);
    }
    loadLogo();

  }, [venta, isOpen]);

  const fetchDetalle = async () => {
    setLoading(true);
    setDetalle({ info: null, items: [] });
    setVendedorInfoTicket(null);

    try {
      // 1. Cabecera de venta
      // --- MODIFICADO: Asegurar que monto_credito_aplicado se selecciona y se usa ---
      const { data: infoRaw, error: errInfo } = await supabase
        .from('ventas')
        .select('*, monto_credito_aplicado, enganche, gastos_envio') // Selecciona explícitamente
        .eq('id', venta.id)
        .single();

      if (errInfo) {
        console.error("Error cargando info de venta en ModalCliente:", errInfo);
        toast.error("Error al cargar información de la venta.");
        setLoading(false);
        return;
      }

      // 2. Items desde detalle_venta
      const { data: itemsRaw, error: errItems } = await supabase
        .from('detalle_venta')
        .select('producto_id, cantidad, precio_unitario, total_parcial, productos(nombre)')
        .eq('venta_id', venta.id);

      if (errItems) {
        console.error("Error cargando items de venta en ModalCliente:", errItems);
        toast.error("Error al cargar productos de la venta.");
        setLoading(false);
        return;
      }

      const items = itemsRaw.map(item => ({
        nombre: item.productos?.nombre || 'Producto Desconocido',
        cantidad: item.cantidad,
        precio: item.precio_unitario,
        subtotal: item.total_parcial
      }));

      // 3. Cargar información del vendedor para el ticket
      if (infoRaw.vendedor_id) {
        const { data: vendData, error: vendError } = await supabase
            .from('usuarios')
            .select('nombre')
            .eq('id', infoRaw.vendedor_id)
            .single();
        if (vendError) {
            console.error("Error cargando info del vendedor para ticket en ModalCliente:", vendError);
            setVendedorInfoTicket({ nombre: 'N/A' });
        } else {
            setVendedorInfoTicket(vendData);
        }
      } else {
        setVendedorInfoTicket({ nombre: 'N/A' });
      }

      setDetalle({ info: infoRaw, items }); // infoRaw ahora debe contener monto_credito_aplicado

    } catch (error) {
        console.error("Error general en fetchDetalle (ModalCliente):", error);
        toast.error("Ocurrió un error al cargar los detalles completos de la venta.");
    } finally {
        setLoading(false);
    }
  };

  const abrirPDF = () => {
    const { info, items } = detalle;

    if (!info || items.length === 0) {
        toast.error("No hay datos suficientes para generar el PDF.");
        return;
    }
    if (!clientName || !vendedorInfoTicket) { // clientName viene de props
        toast.error("Falta información del cliente o vendedor para el PDF.");
        return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const margin = 15; let yOffset = margin;
    const logoWidth = 30; const logoHeight = 30;
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
    doc.setFontSize(12); doc.setFont(undefined, 'normal'); doc.text(`Código: ${info.codigo_venta || 'N/A'}`, doc.internal.pageSize.getWidth() - margin, yOffset + 17, { align: 'right' });
    yOffset += Math.max(logoHeight, 30) + 15;
    doc.line(margin, yOffset, doc.internal.pageSize.getWidth() - margin, yOffset);
    yOffset += 10;

    const infoLabelFontSize = 9; const infoValueFontSize = 10; const infoLineHeight = 6;
    doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('CLIENTE:', margin, yOffset);
    doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(clientName || 'Público General', margin + doc.getTextWidth('CLIENTE:') + 5, yOffset);
    yOffset += infoLineHeight;
    // Aquí podrías añadir teléfono, correo, dirección del cliente si los tuvieras en una prop `clienteCompleto`
    doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('FECHA:', margin, yOffset);
    doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(((info.fecha || info.created_at) ? new Date(info.fecha || info.created_at).toLocaleString() : 'Fecha desconocida'), margin + doc.getTextWidth('FECHA:') + 5, yOffset);
    yOffset += infoLineHeight;
    doc.setFontSize(infoLabelFontSize); doc.setFont(undefined, 'bold'); doc.text('VENDEDOR:', margin, yOffset);
    doc.setFontSize(infoValueFontSize); doc.setFont(undefined, 'normal'); doc.text(vendedorInfoTicket?.nombre || 'N/A', margin + doc.getTextWidth('VENDEDOR:') + 5, yOffset);
    yOffset += infoLineHeight * 2;

    const productsHead = [['Producto', 'Cant.', 'P. Unitario', 'Total Item']];
    const productsRows = items.map(i => [
      i.nombre,
      i.cantidad,
      formatCurrency(i.precio),
      formatCurrency(i.subtotal)
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
    doc.text(formatCurrency(info.subtotal ?? 0), totalsValueStartX, yOffset, { align: 'right' });
    yOffset += totalsLineHeight;

    if ((info.valor_descuento ?? 0) > 0) {
      let discountLabel = 'Descuento:';
      doc.text(discountLabel, totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
      doc.setTextColor(220, 53, 69);
      doc.text(`- ${formatCurrency(info.valor_descuento ?? 0)}`, totalsValueStartX, yOffset, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      yOffset += totalsLineHeight;
    }
    
    if ((info.gastos_envio ?? 0) > 0) {
         doc.text('Gastos de Envío:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
         doc.text(formatCurrency(info.gastos_envio ?? 0), totalsValueStartX, yOffset, { align: 'right' });
         yOffset += totalsLineHeight;
     }

    // --- MODIFICADO: Mostrar Saldo a Favor Aplicado en PDF ---
    if ((info.monto_credito_aplicado ?? 0) > 0) {
        doc.text('Saldo a Favor Aplicado:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
        doc.setTextColor(40, 167, 69); // Verde o azul para crédito aplicado
        doc.text(`- ${formatCurrency(info.monto_credito_aplicado ?? 0)}`, totalsValueStartX, yOffset, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yOffset += totalsLineHeight;
    }
    // --- FIN MODIFICADO ---

    if (info.forma_pago === 'Crédito cliente' && (info.enganche ?? 0) > 0) {
         doc.text('Enganche Pagado:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
         doc.text(formatCurrency(info.enganche ?? 0), totalsValueStartX, yOffset, { align: 'right' });
         yOffset += totalsLineHeight;
     }
    
    doc.text('Forma de Pago:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
    doc.text(info.forma_pago || 'Desconocida', totalsValueStartX, yOffset, { align: 'right' });
    yOffset += totalsLineHeight * 1.5;

    doc.setFontSize(finalTotalFontSize); doc.setFont(undefined, 'bold');
    doc.text('TOTAL PAGADO:', totalsValueStartX - totalsLabelWidth, yOffset, { align: 'right' });
    doc.setTextColor(40, 167, 69);
    doc.text(formatCurrency(info.total ?? 0), totalsValueStartX, yOffset, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yOffset += finalTotalFontSize + 15;

    const footerFontSize = 8; const footerLineHeight = 4;
    doc.setFontSize(footerFontSize); doc.setFont(undefined, 'normal');
    doc.text('¡Gracias por tu compra!', margin, yOffset);
    yOffset += footerLineHeight;
    doc.text('Visítanos de nuevo pronto.', margin, yOffset);
    doc.output('dataurlnewwindow');
  }

  if (!isOpen) return null; 

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-black text-2xl"
          aria-label="Cerrar"
        >
          &times;
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-800">Detalle de Venta</h2>
        {loading ? (
            <p className="text-center text-gray-600">Cargando detalles...</p>
        ) : !detalle.info ? (
            <p className="text-center text-red-500">No se pudo cargar la información de la venta.</p>
        ) : (
          <>
            <div className="space-y-1 text-sm text-gray-700 mb-4">
                <p><strong>Código:</strong> {detalle.info.codigo_venta}</p>
                <p><strong>Cliente:</strong> {clientName}</p>
                <p><strong>Fecha:</strong> {new Date(detalle.info.fecha || detalle.info.created_at).toLocaleString()}</p>
                <p><strong>Vendedor:</strong> {vendedorInfoTicket?.nombre || 'N/A'}</p>
                <p><strong>Forma de pago:</strong> {detalle.info.forma_pago}</p>
            </div>
            <hr className="my-3 border-gray-200" />

            <h3 className="text-md font-semibold mb-2 text-gray-800">Productos:</h3>
            <table className="w-full text-sm border-collapse border border-gray-300 mb-3">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border border-gray-300 text-left">Producto</th>
                  <th className="p-2 border border-gray-300 text-center">Cant.</th>
                  <th className="p-2 border border-gray-300 text-right">Precio</th>
                  <th className="p-2 border border-gray-300 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalle.items.map((i, idx) => (
                  <tr key={idx} className="text-center hover:bg-gray-50">
                    <td className="p-2 border border-gray-300 text-left">{i.nombre}</td>
                    <td className="p-2 border border-gray-300">{i.cantidad}</td>
                    <td className="p-2 border border-gray-300 text-right">{formatCurrency(i.precio)}</td>
                    <td className="p-2 border border-gray-300 text-right">{formatCurrency(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right space-y-1 text-sm font-medium text-gray-800">
                <p>Subtotal (Productos): {formatCurrency(detalle.info.subtotal ?? 0)}</p>
                {(detalle.info.valor_descuento ?? 0) > 0 && (
                    <p className="text-red-600">
                        Descuento:
                        - {formatCurrency(detalle.info.valor_descuento ?? 0)}
                    </p>
                )}
                {(detalle.info.gastos_envio ?? 0) > 0 && (
                    <p>Gastos de Envío: {formatCurrency(detalle.info.gastos_envio ?? 0)}</p>
                )}
                {/* --- MODIFICADO: Mostrar Saldo a Favor Aplicado en el modal de detalle --- */}
                {(detalle.info.monto_credito_aplicado ?? 0) > 0 && (
                    <p className="text-blue-600">
                        Saldo a Favor Aplicado: -{formatCurrency(detalle.info.monto_credito_aplicado ?? 0)}
                    </p>
                )}
                {/* --- FIN MODIFICADO --- */}
                {detalle.info.forma_pago === 'Crédito cliente' && (detalle.info.enganche ?? 0) > 0 && (
                    <p>Enganche Pagado: {formatCurrency(detalle.info.enganche ?? 0)}</p>
                )}
                <p className="text-lg font-bold text-green-600 border-t pt-1 mt-1">
                    Total Pagado: {formatCurrency(detalle.info.total ?? 0)}
                </p>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={abrirPDF}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-150 ease-in-out text-sm"
              >Ver PDF</button>
              {/* No hay botón para ticket HTML en este modal específico según el código original */}
              <button
                onClick={() => onDelete(venta)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-150 ease-in-out text-sm"
              >Eliminar Venta</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

