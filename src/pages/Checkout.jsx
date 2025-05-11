// src/pages/Checkout.jsx
import React, { useEffect, useState, useMemo } from 'react';
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

// Helper simple para formatear moneda (si no está global)
const formatCurrency = (amount) => {
     // Asegurarse de que amount sea un número antes de formatear
     const numericAmount = parseFloat(amount);
     if (isNaN(numericAmount)) {
         return '$0.00'; // Devolver un valor por defecto si no es un número válido
     }
     return numericAmount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD', // Ajusta según tu moneda
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};


export default function Checkout() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productosVenta, setProductosVenta] = useState([]);
  const [filtro, setFiltro] = useState('All');
  const [busqueda, setBusqueda] = useState('');
  // El cliente seleccionado desde el selector
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  // El usuario logueado (vendedor)
  const [currentUser, setCurrentUser] = useState(null);

  const [showQuickSale, setShowQuickSale] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentType, setPaymentType] = useState('');
  const [discountType, setDiscountType] = useState('Sin descuento'); // 'Sin descuento', 'Por importe', 'Por porcentaje'
  const [discountValue, setDiscountValue] = useState(0); // Valor numérico del descuento

  // Carga inicial de clientes, productos y usuario logueado
  useEffect(() => {
    async function loadData() {
      // Obtener el usuario logueado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          setCurrentUser(user);
      } else {
          console.warn('No hay usuario logueado en Checkout.');
           // Decide si quieres redirigir al login o permitir ventas sin vendedor asignado (requiere vendedor_id sea nullable)
          // toast.error('Debes iniciar sesión para registrar ventas.');
          // navigate('/login');
          // return;
      }

      const { data: cli, error: errorClientes } = await supabase.from('clientes').select('*');
       if (errorClientes) {
           console.error("Error loading clients:", errorClientes);
           toast.error("Error al cargar clientes.");
       } else {
           setClientes(cli || []);
       }


      const { data: prod, error: errorProductos } = await supabase.from('productos').select('*');
       if (errorProductos) {
           console.error("Error loading products:", errorProductos);
           toast.error("Error al cargar productos.");
       } else {
            const prodMapped = (prod || []).map(p => {
                let imagenUrl = p.imagenUrl || p.imagen_url || p.imagen || '';
                // Supabase Storage URL - Asegúrate de que el bucket se llama 'productos'
                 if (imagenUrl && !imagenUrl.startsWith('http') && supabase.storage) {
                     // Verificar si la ruta es correcta dentro del bucket
                     // Por ejemplo, si 'p.imagen' es solo el nombre del archivo 'mi_imagen.jpg'
                     const { data } = supabase.storage.from('productos').getPublicUrl(p.imagen);
                     imagenUrl = data.publicUrl;
                 } else if (imagenUrl && !imagenUrl.startsWith('http')) {
                    // Manejar caso si supabase.storage no accesible o bucket no encontrado
                    console.warn('Supabase Storage no accesible o bucket "productos" no encontrado para obtener URL pública.');
                     imagenUrl = ''; // O poner una URL de imagen placeholder
                 }

                return { ...p, imagenUrl };
            });
            setProductos(prodMapped);
       }
    }
    loadData();
  }, []); // Vacío para que solo se ejecute una vez al montar

  // Filtrado de productos por búsqueda y filtro de categoría
  const productosFiltrados = useMemo(() => {
       return productos.filter(p =>
         (filtro === 'All' || p.categoria === filtro) &&
         p.nombre.toLowerCase().includes(busqueda.toLowerCase())
       );
  }, [productos, filtro, busqueda]);


   // Cálculos de totales y descuento
  const { totalItems, originalSubtotal, subtotal, discountAmount } = useMemo(() => {
      // Calcular el subtotal original basado en la cantidad y precio de promoción
      const calculatedOriginalSubtotal = productosVenta.reduce((sum, p) => {
          // Asegurarse de que p.cantidad y p.promocion son números válidos
          const cantidad = parseFloat(p.cantidad) || 0;
          const precio = parseFloat(p.promocion) || 0;
          return sum + (cantidad * precio);
      }, 0);

      const calculatedTotalItems = productosVenta.reduce((sum, p) => sum + (parseFloat(p.cantidad) || 0), 0);


      let calculatedSubtotal = calculatedOriginalSubtotal;
      let calculatedDiscountAmount = 0;

      // Calcular descuento basado en el tipo y valor
      if (discountType === 'Por importe') {
          // El descuento no puede ser mayor que el subtotal original
          calculatedDiscountAmount = Math.min(parseFloat(discountValue) || 0, calculatedOriginalSubtotal);
          calculatedSubtotal = Math.max(0, calculatedOriginalSubtotal - calculatedDiscountAmount);
      } else if (discountType === 'Por porcentaje') {
          // El porcentaje debe estar entre 0 y 100
          const discountPercentage = Math.min(Math.max(0, parseFloat(discountValue) || 0), 100);
          calculatedDiscountAmount = calculatedOriginalSubtotal * (discountPercentage / 100);
          calculatedSubtotal = calculatedOriginalSubtotal - calculatedDiscountAmount;
      }
      // Si discountType es 'Sin descuento', discountAmount es 0 y subtotal es originalSubtotal

      return {
          totalItems: calculatedTotalItems,
          originalSubtotal: calculatedOriginalSubtotal,
          subtotal: calculatedSubtotal,
          discountAmount: calculatedDiscountAmount
      };
  }, [productosVenta, discountType, discountValue]);


  // Función para agregar producto al carrito
  const onAddToCart = producto => {
    // Validación de stock antes de añadir
    const currentStock = parseFloat(producto.stock) || 0;
    if (currentStock <= 0) {
        toast.error('Producto sin stock disponible');
        return;
    }

    setProductosVenta(prev => {
      const existe = prev.find(p => p.id === producto.id);
      if (existe) {
        // Validación de stock al incrementar cantidad
        if (existe.cantidad + 1 > currentStock) {
          toast.error('Stock insuficiente');
          return prev;
        }
        // Incrementar cantidad y recalcular total parcial
        return prev.map(p =>
          p.id === producto.id
            ? { ...p, cantidad: p.cantidad + 1, total: (p.cantidad + 1) * (parseFloat(producto.promocion) || 0) }
            : p
        );
      }
      // Añadir nuevo producto con cantidad 1 y total parcial inicial
      return [...prev, { ...producto, cantidad: 1, total: (parseFloat(producto.promocion) || 0) }];
    });
  };

    // Función para eliminar un producto del carrito
    const onRemoveFromCart = (productoId) => {
        setProductosVenta(prev => prev.filter(p => p.id !== productoId));
    };

    // Función para ajustar la cantidad de un producto en el carrito
    const onUpdateQuantity = (productoId, newQuantity) => {
        const quantity = parseInt(newQuantity, 10);
        // Validar que la cantidad sea un número positivo
        if (isNaN(quantity) || quantity <= 0) {
            // Si la cantidad es inválida o 0, eliminar el producto
             onRemoveFromCart(productoId);
            return;
        }

        setProductosVenta(prev => {
            const productoIndex = prev.findIndex(p => p.id === productoId);

            if (productoIndex === -1) return prev; // Producto no encontrado

            const producto = prev[productoIndex];
            const currentStock = parseFloat(producto.stock) || 0;

            // Validar que la nueva cantidad no exceda el stock disponible
            if (quantity > currentStock) {
                toast.error(`Stock insuficiente. Máximo disponible: ${currentStock}`);
                // Opcional: podrías establecer la cantidad al stock máximo en lugar de no hacer nada
                 return prev; // No actualizar si excede stock
            }

            // Actualizar cantidad y recalcular total parcial
            const updatedProductos = [...prev];
            updatedProductos[productoIndex] = {
                ...producto,
                cantidad: quantity,
                total: quantity * (parseFloat(producto.promocion) || 0)
            };
            return updatedProductos;
        });
    };


  // Función para abrir el modal de venta
  const openSaleModal = () => {
    // Verificar que haya usuario logueado (vendedor) Y tenga ID (tipo UUID)
    if (!currentUser || !currentUser.id) {
         toast.error('Debes iniciar sesión como vendedor para registrar una venta.');
         // navigate('/login'); // Descomentar si quieres forzar login
         return;
    }

    if (!clienteSeleccionado || totalItems === 0) {
       if (!clienteSeleccionado) {
          toast.error('Selecciona un cliente para proceder.');
      } else if (totalItems === 0) {
        toast.error('Agrega productos a la venta.');
      }
      return;
    }
    setShowSaleModal(true);
  };


  // Función para finalizar la venta
  const handleFinalize = async () => {
    setProcessing(true);

    // Validar nuevamente antes de procesar
    // Aseguramos que currentUser y su ID existan
    if (!currentUser || !currentUser.id) {
         toast.error('Error de vendedor: Debes iniciar sesión.');
         setProcessing(false);
         return;
    }
    if (!clienteSeleccionado) {
         toast.error('Error de cliente: Selecciona un cliente.');
         setProcessing(false);
         return;
    }
     if (productosVenta.length === 0) {
         toast.error('Error de productos: Agrega productos a la venta.');
         setProcessing(false);
         return;
    }
     if (!paymentType) {
         toast.error('Error de pago: Selecciona una forma de pago.');
         setProcessing(false);
         return;
    }


    try {
      // Obtener el último código de venta para generar el siguiente
      const { data: ventasPrevias, error: errorVentasPrevias } = await supabase
        .from('ventas')
        .select('codigo_venta')
        .order('created_at', { ascending: false })
        .limit(1);

      if (errorVentasPrevias) {
         console.error('Error al obtener ventas previas:', errorVentasPrevias.message);
           // No lanzar error aquí, solo loguear y seguir con VT00001 si es necesario
      }

      // Generar el nuevo código de venta (mejorado para ser más robusto)
       let nextCodigoNumber = 1;
       if (ventasPrevias && ventasPrevias.length > 0 && ventasPrevias[0].codigo_venta) {
           const lastCodigoVenta = ventasPrevias[0].codigo_venta;
           const lastNumberMatch = lastCodigoVenta.match(/VT(\d+)/);
            if (lastNumberMatch && lastNumberMatch[1]) {
                const lastNumber = parseInt(lastNumberMatch[1], 10);
                if (!isNaN(lastNumber)) {
                    nextCodigoNumber = lastNumber + 1;
                } else {
                    console.warn('Código de venta previo no tiene el formato esperado (VT seguido de número). Iniciando secuencia en 1.');
                }
            } else {
                console.warn('Código de venta previo no tiene el formato esperado (VT seguido de número). Iniciando secuencia en 1.');
            }
       } else {
            console.log('No hay ventas previas. Iniciando secuencia de código de venta en 1.');
       }
      const codigo = 'VT' + String(nextCodigoNumber).padStart(5, '0');


      // Insertar cabecera de venta
      const { data: ventaInsertada, error: errorVenta } = await supabase
        .from('ventas')
        .insert([{
          codigo_venta: codigo,
          cliente_id: clienteSeleccionado.id,
           vendedor_id: currentUser.id,       // <<< Usando el ID del usuario logueado (UUID)
          subtotal: originalSubtotal,
          forma_pago: paymentType,
          tipo_descuento: discountType,
          valor_descuento: discountAmount,
          total: subtotal
        }])
        .select('id')
        .single();

      if (errorVenta) {
           console.error('Error al insertar cabecera de venta:', errorVenta.message);
           if (errorVenta.code === '23503') { // Código de error típico de violación de FK
              toast.error('Error de base de datos: El vendedor no está registrado o hay un problema de configuración.');
           } else {
              toast.error(`Error al registrar la venta: ${errorVenta.message}`);
           }
           throw errorVenta; // Lanzar el error para detener el proceso
       }
      const ventaId = ventaInsertada.id;

      // Si la forma de pago es 'Crédito cliente', registra un movimiento de CARGO
      // Asegúrate que 'Crédito cliente' coincida exactamente con el valor en tu select/BD
      if (paymentType === 'Crédito cliente') {
        const { error: errorCargo } = await supabase
            .from('movimientos_cuenta_clientes')
            .insert([{
                cliente_id: clienteSeleccionado.id, // El ID del cliente
                tipo_movimiento: 'CARGO_VENTA',
                monto: subtotal,                   // El monto total de la venta (positivo)
                referencia_venta_id: ventaId,      // El ID de la venta asociada
                descripcion: `Venta ${codigo}`,
            }]);

        if (errorCargo) {
            console.error('Error al registrar cargo por venta a crédito:', errorCargo.message);
            toast.error('Error al registrar el cargo en la cuenta del cliente.');
             throw errorCargo; // Detener si falla el cargo a crédito
        }
    }

      // Insertar detalles de venta y actualizar stock/movimientos
      // Usamos un for...of para permitir await dentro del loop
      for (const p of productosVenta) {
          // Validación extra de stock antes de insertar/actualizar
           const { data: prodCheck, error: errorProdCheck } = await supabase
            .from('productos')
            .select('stock')
            .eq('id', p.id)
            .single();

           if (errorProdCheck || (prodCheck?.stock || 0) < p.cantidad) {
                console.error(`Error de stock o producto no encontrado para ${p.nombre}. Stock disponible: ${prodCheck?.stock ?? 'N/A'}`);
                 toast.error(`Stock insuficiente para ${p.nombre}. Venta cancelada para este ítem o total.`);
                 // Idealmente, aquí deberías revertir la inserción de la venta principal si ya se hizo
                throw new Error(`Stock insuficiente para ${p.nombre}.`); // Detener la venta completamente
           }


        // Insertar detalle de venta
        const { error: errorDetalle } = await supabase.from('detalle_venta').insert([{
          venta_id: ventaId,
          producto_id: p.id,
          cantidad: p.cantidad,
          precio_unitario: parseFloat(p.promocion) || 0, // Usar el precio de promoción
          total_parcial: parseFloat(p.total) || 0 // Usar el total calculado en el frontend
        }]);
        if (errorDetalle) {
             console.error(`Error al insertar detalle de venta para producto ${p.nombre}:`, errorDetalle.message);
             toast.error(`Error al guardar detalle para ${p.nombre}.`);
             throw errorDetalle; // Detener si falla el detalle
        }


        // Actualizar stock del producto
        const nuevoStock = (prodCheck.stock || 0) - p.cantidad;
        const { error: errorUpdateStock } = await supabase.from('productos').update({ stock: nuevoStock }).eq('id', p.id);
        if (errorUpdateStock) {
             console.error(`Error al actualizar stock para producto ${p.nombre}:`, errorUpdateStock.message);
              toast.error(`Error al actualizar stock para ${p.nombre}.`);
              throw errorUpdateStock; // Detener si falla el stock
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
            fecha: new Date().toISOString() // O usar created_at que Supabase añade automáticamente si existe
          }]);
        if (errMov) {
            console.error('Error mov_inventario (' + p.nombre + '):', errMov.message);
             toast.error(`Error al registrar movimiento de inventario para ${p.nombre}.`);
             throw errMov; // Detener si falla el movimiento de inventario
         }
      } // Fin del loop de productosVenta

      // Si llegamos aquí, la venta (cabecera y detalles/stock/mov inventario) se procesó sin errores
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
      // Muestra un toast de error general si no se manejó un error específico arriba
      // Usar err.message para dar más detalles si es posible
      toast.error(`Error al procesar la venta: ${err.message || 'Error desconocido'}`);

    } finally {
      setProcessing(false);
    }
  };

  // Función para generar el PDF del ticket
  const generarPDF = codigo => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Ticket - ${codigo}`, 10, 12);
    if (clienteSeleccionado) {
      doc.text(`Cliente: ${clienteSeleccionado.nombre}`, 10, 22); // Asume clienteSeleccionado tiene .nombre
    }
    if (currentUser && currentUser.email) { // Mostrar vendedor si está logueado
        doc.text(`Vendedor: ${currentUser.email}`, 10, 30); // O usar otro campo si tu tabla de usuarios tiene nombre
        doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, 38);
    } else {
        doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, 30);
    }


    const rows = productosVenta.map(p => [
      p.nombre,
      p.cantidad.toString(),
      // Formatear precios unitarios y totales parciales en el PDF
      `${formatCurrency(p.promocion ?? 0)}`,
      `${formatCurrency(p.total ?? 0)}`
    ]);

    doc.autoTable({
      head: [['Producto', 'Cant.', 'P.U.', 'Total']],
      body: rows,
      startY: currentUser ? 45 : 38, // Ajustar startY si mostramos vendedor
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
      margin: { top: 10 }
    });

    const y = doc.lastAutoTable.finalY + 10;
     // Usar formatCurrency para totales en el PDF
    doc.text(`Subtotal: ${formatCurrency(originalSubtotal)}`, 10, y);
    doc.text(`Descuento: -${formatCurrency(discountAmount)}`, 10, y + 6);
    doc.text(`Total: ${formatCurrency(subtotal)}`, 10, y + 12);

    // Abrir PDF en una nueva ventana
    doc.output('dataurlnewwindow');
  };

  // --- Renderizado (JSX) ---
   return (
// Contenedor principal con padding y fondo ligero
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Encabezado responsive */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        {/* Botón Volver al inicio */}
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>

        {/* Aquí tu título */}
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Gestión de Ventas {/* <-- Título ajustado a Ventas */}
        </h1>

        {/* Spacer para md+ */}
        <div className="w-full md:w-[150px]" />
      </div>

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
          // Si onClientAdded en NewClientModal espera el cliente agregado,
          // puedes pasárselo así para seleccionarlo automáticamente después de crear
          onClientAdded={(newClient) => {
              // Asume que NewClientModal devuelve el objeto del nuevo cliente con 'id' y 'nombre'
              if (newClient && newClient.id) {
                  setClienteSeleccionado(newClient); // Seleccionar el nuevo cliente
                  setClientes(prev => [...prev, newClient]); // Añadir a la lista de clientes disponibles
              }
              setShowNewClient(false); // Cerrar modal después de añadir
          }}
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
            onAdd={onAddToCart} // QuickSaleModal debe llamar onAddToCart con el producto
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
            onAddToCart={onAddToCart} // Pasamos la función onAddToCart
            showStock // Asegúrate de que ProductGrid maneje esta prop si quieres mostrar stock
          />
      </div>


      {/* Footer Fijo con Resumen de Venta */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 p-4 text-center rounded-t-xl shadow-lg
          flex justify-between items-center
          transition-colors duration-300 ease-in-out
          ${totalItems === 0 || !clienteSeleccionado // Deshabilitar si no hay items O no hay cliente seleccionado
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed' // Estilo para carrito vacío o sin cliente
            : processing
            ? 'bg-yellow-500 text-white cursor-wait' // Estilo mientras procesa
            : 'bg-green-600 text-white cursor-pointer hover:bg-green-700' // Estilo para carrito con items y cliente, listo para abrir modal
          }
        `}
        // El clic solo debe funcionar si hay cliente, items y no está procesando (la validación ya está en openSaleModal)
        onClick={openSaleModal}
        // Remover el style pointerEvents y confiar en la validación de openSaleModal
      >
        {/* Información del resumen */}
        <div className="flex-1 text-left">
            <span className="font-semibold text-lg">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
        </div>
         <div className="flex-1 text-right">
             <span className="font-bold text-xl">{formatCurrency(subtotal)}</span> {/* Usar formatCurrency */}
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
        // Ya no pasamos los datos como props a ModalCheckout,
        // los usamos directamente como children
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
        {/* --- Contenido del cuerpo del modal --- */}
        {/* Este JSX se renderizará dentro del cuerpo del ModalCheckout */}
        <div className="mb-4 max-h-80 overflow-y-auto pr-2"> {/* Añadido pr-2 para espacio del scrollbar */}
            {/* Lista de productos en la venta */}
            <h4 className="text-md font-semibold mb-2">Productos:</h4>
            {productosVenta.length === 0 ? (
                <p className="text-gray-600">No hay productos en la venta.</p>
            ) : (
                 <ul className="space-y-2">
                    {productosVenta.map(p => (
                        <li key={p.id} className="flex justify-between items-center text-sm text-gray-800 border-b pb-2 last:border-b-0">
                            <div className="flex-1 mr-4">
                                <span className="font-medium">{p.nombre}</span>
                                <div className="text-xs text-gray-500">{formatCurrency(p.promocion ?? 0)} c/u</div> {/* Mostrar precio unitario */}
                            </div>
                            <div className="flex items-center">
                                {/* Input para cantidad */}
                                <input
                                    type="number"
                                    min="1"
                                    value={p.cantidad}
                                    onChange={(e) => onUpdateQuantity(p.id, e.target.value)}
                                    className="w-12 text-center border rounded-md mr-2 text-sm py-1"
                                    disabled={processing} // Deshabilitar input mientras procesa
                                />
                                {/* Total parcial */}
                                <span className="font-semibold w-20 text-right">{formatCurrency(p.total ?? 0)}</span>
                                {/* Botón para eliminar producto */}
                                <button
                                    onClick={() => onRemoveFromCart(p.id)}
                                    className="ml-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                                     disabled={processing} // Deshabilitar botón mientras procesa
                                >
                                    ✕
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}


            <hr className="my-4" /> {/* Separador */}

            {/* Totales y Descuento */}
            <div className="text-right text-sm space-y-1">
                <p>Subtotal original: <span className="font-medium">{formatCurrency(originalSubtotal)}</span></p>
                <p className="text-red-600">Descuento: <span className="font-medium">- {formatCurrency(discountAmount)}</span></p>
                <p className="text-lg font-bold mt-2">Total: <span className="text-green-700">{formatCurrency(subtotal)}</span></p>
            </div>

            <hr className="my-4" /> {/* Separador */}

            {/* Opciones de Pago y Descuento */}
            <div className="space-y-4">
                 {/* Forma de Pago */}
                <div>
                    <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago:</label>
                    <select
                        id="paymentType"
                        value={paymentType}
                        onChange={e => setPaymentType(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                         disabled={processing} // Deshabilitar select mientras procesa
                    >
                        <option value="">Selecciona una forma de pago</option>
                        {/* Asegúrate de tener tus opciones de pago aquí */}
                        <option value="Efectivo">Efectivo</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Transferencia">Transferencia</option>
                         <option value="Crédito cliente">Crédito cliente</option> {/* Si usas crédito */}
                    </select>
                </div>

                {/* Opciones de Descuento */}
                 <div>
                    <label htmlFor="discountType" className="block text-sm font-medium text-gray-700 mb-1">Descuento:</label>
                    <select
                        id="discountType"
                        value={discountType}
                        onChange={e => {
                            setDiscountType(e.target.value);
                            // Resetear valor del descuento si cambia el tipo
                            setDiscountValue(0);
                        }}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                         disabled={processing} // Deshabilitar select mientras procesa
                    >
                        <option value="Sin descuento">Sin descuento</option>
                        <option value="Por importe">Por importe ($)</option>
                        <option value="Por porcentaje">Por porcentaje (%)</option>
                    </select>
                </div>

                 {/* Input para Valor del Descuento (visible si hay descuento aplicado) */}
                {discountType !== 'Sin descuento' && (
                    <div>
                         <label htmlFor="discountValue" className="block text-sm font-medium text-gray-700 mb-1">
                            Valor del Descuento ({discountType === 'Por importe' ? '$' : '%'}):
                         </label>
                         <input
                            id="discountValue"
                            type="number"
                            step={discountType === 'Por porcentaje' ? "1" : "0.01"} // Permite decimales para importe
                            min={discountType === 'Por porcentaje' ? "0" : "0"}
                            max={discountType === 'Por porcentaje' ? "100" : undefined} // Máx 100%
                            value={discountValue}
                            onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} // Convertir a número
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            disabled={processing} // Deshabilitar input mientras procesa
                         />
                    </div>
                )}

            </div> {/* Fin opciones de pago y descuento */}


        </div> {/* Fin del div con scroll */}

        {/* --- Fin del contenido del cuerpo del modal --- */}
      </ModalCheckout>
    </div>
  );
}
