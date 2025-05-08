import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import 'jspdf-autotable';
import QuickEntryBar from '../components/QuickEntryBar';
import QuickSaleModal from '../components/QuickSaleModal';
import ClientSelector from '../components/ClientSelector';
import NewClientModal from '../components/NewClientModal';
import FilterTabs from '../components/FilterTabs';
import ProductGrid from '../components/ProductGrid';
import ModalCheckout from '../components/ModalCheckout';

export default function Checkout() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productosVenta, setProductosVenta] = useState([]);
  const [filtro, setFiltro] = useState('All');
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentType, setPaymentType] = useState('');
  const [discountType, setDiscountType] = useState('Sin descuento');
  const [discountValue, setDiscountValue] = useState(0);

  // Carga inicial
  useEffect(() => {
    async function loadData() {
      const { data: cli } = await supabase.from('clientes').select('*');
      const { data: prod } = await supabase.from('productos').select('*');
      const prodMapped = (prod || []).map(p => {
        let imagenUrl = p.imagenUrl || p.imagen_url || p.imagen || '';
        if (imagenUrl && !imagenUrl.startsWith('http')) {
          const { data } = supabase.storage.from('productos').getPublicUrl(p.imagen);
          imagenUrl = data.publicUrl;
        }
        return { ...p, imagenUrl };
      });
      setClientes(cli || []);
      setProductos(prodMapped);
    }
    loadData();
  }, []);

  // Filtrado y totales
  const productosFiltrados = productos.filter(p =>
    (filtro === 'All' || p.categoria === filtro) &&
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const totalItems = productosVenta.reduce((sum, p) => sum + (p.cantidad || 0), 0);
  const originalSubtotal = productosVenta.reduce((sum, p) => sum + (p.total ?? 0), 0);
  let subtotal = originalSubtotal;
  if (discountType === 'Por importe') {
    subtotal = Math.max(0, subtotal - discountValue);
  } else if (discountType === 'Por porcentaje') {
    subtotal *= (1 - discountValue / 100);
  }
  const discountAmount = originalSubtotal - subtotal;

  const onAddToCart = producto => {
    setProductosVenta(prev => {
      const existe = prev.find(p => p.id === producto.id);
      if (existe) {
        if (existe.cantidad + 1 > (producto.stock || 0)) {
          toast.error('Stock insuficiente');
          return prev;
        }
        return prev.map(p =>
          p.id === producto.id
            ? { ...p, cantidad: p.cantidad + 1, total: (p.cantidad + 1) * (p.promocion ?? 0) }
            : p
        );
      }
      return [...prev, { ...producto, cantidad: 1, total: producto.promocion ?? 0 }];
    });
  };

  const openSaleModal = () => {
    if (!clienteSeleccionado || totalItems === 0) {
      // Mostrar un mensaje de advertencia si no hay cliente o ítems
      if (!clienteSeleccionado) {
        toast.error('Selecciona un cliente para proceder.');
      } else if (totalItems === 0) {
        toast.error('Agrega productos a la venta.');
      }
      return; // No abrir el modal si no se cumplen las condiciones
    }
    setShowSaleModal(true);
  };

  const handleFinalize = async () => {
    setProcessing(true);
    try {
      // Obtener el último código de venta para generar el siguiente
      const { data: ventasPrevias, error: errorVentasPrevias } = await supabase
        .from('ventas')
        .select('codigo_venta')
        .order('created_at', { ascending: false }) // Ordenar para obtener el último
        .limit(1); // Solo necesitamos el último

      if (errorVentasPrevias) {
         console.error('Error al obtener ventas previas:', errorVentasPrevias.message);
         // Considerar si lanzar un error aquí o intentar generar un código básico
         // Por ahora, si falla, generamos un código basado en 0 ventas previas
      }

      // Generar el nuevo código de venta
      const lastCodigoVenta = ventasPrevias && ventasPrevias.length > 0 ? ventasPrevias[0].codigo_venta : null;
      let nextCodigoNumber = 1;
      if (lastCodigoVenta) {
          const lastNumberMatch = lastCodigoVenta.match(/VT(\d+)/);
          if (lastNumberMatch && lastNumberMatch[1]) {
              nextCodigoNumber = parseInt(lastNumberMatch[1], 10) + 1;
          }
      }
      const codigo = 'VT' + String(nextCodigoNumber).padStart(5, '0');


      const { data: ventaInsertada, error: errorVenta } = await supabase
        .from('ventas')
        .insert([{
          codigo_venta: codigo,
          cliente_id: clienteSeleccionado.id,
          subtotal,
          forma_pago: paymentType,
          tipo_descuento: discountType,
          valor_descuento: discountAmount,
          total: subtotal // El total ya incluye el descuento aplicado
        }])
        .select('id')
        .single();
      if (errorVenta) throw errorVenta;
      const ventaId = ventaInsertada.id;

      // Insertar detalles de venta y actualizar stock/movimientos
      for (const p of productosVenta) {
        // Insertar detalle de venta
        const { error: errorDetalle } = await supabase.from('detalle_venta').insert([{
          venta_id: ventaId,
          producto_id: p.id,
          cantidad: p.cantidad,
          precio_unitario: p.promocion ?? 0, // Usar el precio de promoción o 0
          total_parcial: p.total ?? 0 // Usar el total parcial calculado previamente
        }]);
        if (errorDetalle) {
             console.error(`Error al insertar detalle de venta para producto ${p.nombre}:`, errorDetalle.message);
             // Decide si quieres detener el proceso o continuar registrando otros ítems
             // Por ahora, solo loguea el error y continúa
        }


        // Actualizar stock del producto
        const { data: prodActual, error: errorProdActual } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', p.id)
          .single();

        if (errorProdActual) {
            console.error(`Error al obtener stock actual para producto ${p.nombre}:`, errorProdActual.message);
            // Decide si quieres detener el proceso o continuar
        } else {
            const nuevoStock = (prodActual?.stock || 0) - p.cantidad;
             const { error: errorUpdateStock } = await supabase.from('productos').update({ stock: nuevoStock }).eq('id', p.id);
             if (errorUpdateStock) {
                 console.error(`Error al actualizar stock para producto ${p.nombre}:`, errorUpdateStock.message);
                 // Decide si quieres detener el proceso o continuar
             }
        }


        // Registrar movimiento de inventario (SALIDA)
        const { error: errMov } = await supabase
          .from('movimientos_inventario')
          .insert([{
            producto_id: p.id,
            tipo: 'SALIDA',
            cantidad: p.cantidad,
            referencia: codigo, // Referencia al código de venta
            motivo: 'venta',
            fecha: new Date().toISOString() // Registrar la fecha y hora del movimiento
          }]);
        if (errMov) console.error('Error mov_inventario (' + p.nombre + '):', errMov.message);
      }

      // Limpiar estados y cerrar modal
      setShowSaleModal(false);
      setProductosVenta([]);
      setClienteSeleccionado(null); // Limpiar cliente seleccionado después de la venta
      setPaymentType(''); // Limpiar forma de pago
      setDiscountType('Sin descuento'); // Resetear descuento
      setDiscountValue(0); // Resetear valor descuento

      // Generar PDF del ticket
      generarPDF(codigo);

      toast.success(`Venta ${codigo} registrada exitosamente!`);

    } catch (err) {
      console.error('Error general al finalizar venta:', err.message);
      toast.error('Ocurrió un error al procesar la venta.');
    } finally {
      setProcessing(false);
    }
  };

  const generarPDF = codigo => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Ticket - ${codigo}`, 10, 12);
    if (clienteSeleccionado) {
      doc.text(`Cliente: ${clienteSeleccionado.nombre}`, 10, 22);
    }
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, 30);

    const rows = productosVenta.map(p => [
      p.nombre,
      p.cantidad.toString(),
      `$${((p.promocion ?? 0)).toFixed(2)}`,
      `$${((p.total ?? 0)).toFixed(2)}`
    ]);

    doc.autoTable({
      head: [['Producto', 'Cant.', 'P.U.', 'Total']],
      body: rows,
      startY: 40,
      // Estilos básicos para la tabla
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
      margin: { top: 10 }
    });

    const y = doc.lastAutoTable.finalY + 10;
    doc.text(`Subtotal: $${originalSubtotal.toFixed(2)}`, 10, y); // Mostrar subtotal original
    doc.text(`Descuento: -$${discountAmount.toFixed(2)}`, 10, y + 6);
    doc.text(`Total: $${subtotal.toFixed(2)}`, 10, y + 12); // Mostrar total con descuento

    // Abrir PDF en una nueva ventana
    doc.output('dataurlnewwindow');
  };

  return (
    // Contenedor principal con padding y fondo ligero
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Botón Volver al inicio */}
      <button
        onClick={() => navigate('/')}
        className="mb-6 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
      >
        Volver al inicio
      </button>

      {/* Selector de Cliente y Modales */}
      <div className="mb-6">
        <ClientSelector
          clientes={clientes}
          clienteSeleccionado={clienteSeleccionado}
          onSelect={setClienteSeleccionado}
          onCreateNew={() => setShowNewClient(true)}
        />
        <NewClientModal
          isOpen={showNewClient}
          onClose={() => setShowNewClient(false)}
          onClientAdded={c => setClienteSeleccionado(c)}
        />
      </div>

      {/* Barra de búsqueda rápida y Modal de Venta Rápida */}
      <div className="mb-6">
         <QuickEntryBar
            busqueda={busqueda}
            onChangeBusqueda={e => setBusqueda(e.target.value)}
            onQuickSaleClick={() => setShowQuickSale(true)}
          />
          <QuickSaleModal
            isOpen={showQuickSale}
            onClose={() => setShowQuickSale(false)}
            onAdd={onAddToCart}
          />
      </div>


      {/* Tabs de Filtro */}
      <div className="mb-6">
         <FilterTabs filtro={filtro} setFiltro={setFiltro} />
      </div>


      {/* Grid de Productos */}
      <div className="mb-20"> {/* Añadido mb-20 para dejar espacio al footer fijo */}
         <ProductGrid
            productos={productosFiltrados}
            onAddToCart={onAddToCart}
            showStock // Asegúrate de que ProductGrid maneje esta prop si quieres mostrar stock
          />
      </div>


      {/* Footer Fijo con Resumen de Venta */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 p-4 text-center rounded-t-xl shadow-lg
          flex justify-between items-center
          transition-colors duration-300 ease-in-out
          ${totalItems === 0
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed' // Estilo para carrito vacío
            : processing
            ? 'bg-yellow-500 text-white cursor-wait' // Estilo mientras procesa
            : 'bg-green-600 text-white cursor-pointer hover:bg-green-700' // Estilo para carrito con items, listo para abrir modal
          }
        `}
        onClick={openSaleModal}
        // Deshabilitar el clic si no hay ítems o cliente seleccionado, aunque el estilo cambie
        style={{ pointerEvents: (!clienteSeleccionado || totalItems === 0 || processing) ? 'none' : 'auto' }}
      >
        {/* Información del resumen */}
        <div className="flex-1 text-left">
            <span className="font-semibold text-lg">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
        </div>
         <div className="flex-1 text-right">
             <span className="font-bold text-xl">${subtotal.toFixed(2)}</span>
         </div>
         {/* Indicador de procesamiento */}
         {processing && (
             <div className="ml-4 text-sm font-semibold">Procesando…</div>
         )}
      </div>

      {/* Modal de Checkout */}
      <ModalCheckout
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        title="Detalle de venta"
        footer={
          <>
            <button
              onClick={() => setShowSaleModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200 ease-in-out"
            >
              Cancelar
            </button>
            <button
              onClick={handleFinalize}
              disabled={!paymentType || processing} // Mantiene la lógica de deshabilitación
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              {processing ? 'Confirmando...' : 'Confirmar'}
            </button>
          </>
        }
      >
        {/* Contenido del Modal de Checkout */}
        <div className="p-4"> {/* Añadido padding al contenido del modal */}
            <h4 className="font-semibold mb-3">Productos en el carrito:</h4>
            <ul className="mb-4 text-sm space-y-2 border-b pb-4"> {/* Añadido borde y padding */}
              {productosVenta.map((p, i) => (
                <li key={i} className="flex justify-between items-center"> {/* Centrado vertical */}
                  <span className="truncate w-2/3 font-medium">{p.nombre}</span> {/* Ancho y fuente */}
                  <span className="text-gray-600">x{p.cantidad}</span> {/* Color gris */}
                  <span className="font-semibold">${((p.total ?? 0)).toFixed(2)}</span> {/* Negrita */}
                </li>
              ))}
            </ul>

            <div className="mb-4 space-y-2 text-sm border-b pb-4"> {/* Espaciado y borde */}
              <div className="flex justify-between">
                <span className="font-medium">Subtotal:</span> {/* Negrita */}
                <span>${originalSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600"> {/* Color rojo para descuento */}
                <span className="font-medium">Descuento:</span> {/* Negrita */}
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-green-700"> {/* Negrita, tamaño grande, color verde */}
                <span>Total:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">Forma de pago</label> {/* Label con estilo */}
              <select
                value={paymentType}
                onChange={e => setPaymentType(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Estilo de input
              >
                <option value="">Seleccione…</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Crédito">Crédito cliente</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">Tipo de descuento</label> {/* Label con estilo */}
              <div className="flex space-x-3"> {/* Espaciado entre elementos flex */}
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value)}
                  className="flex-1 border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Estilo de input
                >
                  <option>Sin descuento</option>
                  <option>Por importe</option>
                  <option>Por porcentaje</option>
                </select>
                {(discountType === 'Por importe' ||
                  discountType === 'Por porcentaje') && (
                  <input
                    type="number"
                    value={discountValue}
                    onChange={e => setDiscountValue(Number(e.target.value))}
                    className="w-24 border border-gray-300 p-2 rounded-md text-right focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Estilo de input y alineación derecha
                    placeholder="Valor"
                  />
                )}
              </div>
            </div>
        </div>
      </ModalCheckout>
    </div>
  );
}
