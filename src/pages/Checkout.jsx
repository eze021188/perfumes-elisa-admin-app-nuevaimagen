// src/pages/Checkout.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf'; // Mantenemos la importación por si acaso, pero no la usaremos para el ticket HTML
import toast from 'react-hot-toast';
import 'jspdf-autotable'; // Mantenemos la importación por si acaso
import QuickEntryBar from '../components/QuickEntryBar';
import QuickSaleModal from '../components/QuickSaleModal';
import ClientSelector from '../components/ClientSelector';
import NewClientModal from '../components/NewClientModal';
import FilterTabs from '../components/FilterTabs';
import ProductGrid from '../components/ProductGrid';
import ModalCheckout from '../components/ModalCheckout';
// >>> Importamos el nuevo componente para mostrar el ticket HTML <<<
import HtmlTicketDisplay from '../components/HtmlTicketDisplay';


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

// Función para cargar una imagen local y convertirla a Base64 (ya no necesaria para el ticket HTML, pero se mantiene si se usa en otro lugar)
// Aunque no la usamos para el ticket HTML, la mantenemos si piensas generar PDFs en otros lados
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


export default function Checkout() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productosVenta, setProductosVenta] = useState([]);
  const [filtro, setFiltro] = useState('All');
  const [busqueda, setBusqueda] = useState('');
  // El cliente seleccionado desde el selector
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  // El usuario logueado (vendedor) - Objeto de auth.users
  const [currentUser, setCurrentUser] = useState(null);
   // Información adicional del vendedor desde la tabla 'usuarios'
   const [vendedorInfo, setVendedorInfo] = useState(null);
    // Estado para almacenar el balance de cuenta del cliente seleccionado
    const [clienteBalance, setClienteBalance] = useState(0);
    // Estado para el enganche ingresado en el modal de checkout
    const [enganche, setEnganche] = useState(0);
    // >>> Estado para los gastos de envío <<<
    const [gastosEnvio, setGastosEnvio] = useState(0);


  const [showQuickSale, setShowQuickSale] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentType, setPaymentType] = useState('');
  const [discountType, setDiscountType] = useState('Sin descuento'); // 'Sin descuento', 'Por importe', 'Por porcentaje'
  const [discountValue, setDiscountValue] = useState(0); // Valor numérico del descuento

   // Estado para almacenar la imagen del logo en Base64 (ya no necesaria para el ticket HTML)
   // const [logoBase64, setLogoBase64] = useState(null);

   // >>> Estados para mostrar el ticket HTML <<<
   const [showHtmlTicket, setShowHtmlTicket] = useState(false);
   const [htmlTicketData, setHtmlTicketData] = useState(null);
   // ------------------------------------------


  // Carga inicial de clientes, productos, usuario logueado (auth y tabla) y logo (si aún se usa)
  useEffect(() => {
    async function loadData() {
      // 1. Obtener el usuario logueado de Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
          console.error("Error getting auth user:", authError);
          // Manejar error de autenticación si es necesario
      }

      if (user) {
          setCurrentUser(user);

          // 2. Si hay un usuario logueado, obtener su información de la tabla 'usuarios'
          // Asumimos que el ID del usuario en auth.users coincide con el ID en la tabla 'usuarios'
          const { data: vendedorData, error: vendedorError } = await supabase
              .from('usuarios')
              .select('nombre') // Selecciona solo el campo 'nombre'
              .eq('id', user.id) // Filtra por el ID del usuario logueado
              .single(); // Espera un solo resultado

          if (vendedorError) {
              console.error("Error loading vendedor info from 'usuarios' table:", vendedorError);
              setVendedorInfo({ nombre: user.email }); // Usar email como fallback si falla la carga del nombre
          } else {
              setVendedorInfo(vendedorData); // Guarda el objeto { nombre: '...' }
          }
      } else {
          console.warn('No hay usuario logueado en Checkout.');
          setCurrentUser(null);
          setVendedorInfo(null); // No hay vendedor si no hay usuario logueado
      }

      // Cargar clientes
      // >>> Incluir 'telefono' y cualquier otro campo necesario para el ticket <<<
      const { data: cli, error: errorClientes } = await supabase.from('clientes').select('id, nombre, telefono');
       if (errorClientes) {
           console.error("Error loading clients:", errorClientes);
           toast.error("Error al cargar clientes.");
       } else {
           setClientes(cli || []);
       }

      // Cargar productos
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

        // --- Cargar la imagen del logo al iniciar (solo si se usa en PDF o en otro lugar) ---
        // const logoUrl = '/imagen/PERFUMESELISA.jpg';
        // const base64 = await getBase64Image(logoUrl);
        // setLogoBase64(base64);
        // ------------------------------------------
    }
    loadData();
  }, []); // Vacío para que solo se ejecute una vez al montar

    // Efecto para cargar el balance del cliente cuando cambia el cliente seleccionado
    useEffect(() => {
        async function loadClientBalance() {
            if (clienteSeleccionado?.id) {
                // >>> Sumar todos los movimientos para obtener el balance actual <<<
                const { data, error } = await supabase
                    .from('movimientos_cuenta_clientes')
                    .select('monto')
                    .eq('cliente_id', clienteSeleccionado.id);

                if (error) {
                    console.error("Error loading client balance:", error);
                    setClienteBalance(0); // Resetear si hay error
                    toast.error("No se pudo cargar el balance del cliente.");
                } else {
                    const totalBalance = (data || []).reduce((sum, mov) => sum + (parseFloat(mov.monto) || 0), 0);
                    setClienteBalance(totalBalance);
                }
            } else {
                setClienteBalance(0); // Resetear si no hay cliente seleccionado
            }
        }
        loadClientBalance();
    }, [clienteSeleccionado]); // Ejecutar cuando clienteSeleccionado cambie


  // Filtrado de productos por búsqueda y filtro de categoría
  const productosFiltrados = useMemo(() => {
       return productos.filter(p =>
         (filtro === 'All' || p.categoria === filtro) &&
         p.nombre.toLowerCase().includes(busqueda.toLowerCase())
       );
  }, [productos, filtro, busqueda]);


   // Cálculos de totales, descuento y AHORA GASTOS DE ENVÍO
  const { totalItems, originalSubtotal, subtotal, discountAmount, totalFinal } = useMemo(() => {
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

      // >>> Calcular el total final incluyendo el subtotal (después de descuento) y los gastos de envío <<<
      const calculatedGastosEnvio = parseFloat(gastosEnvio) || 0;
      const calculatedTotalFinal = calculatedSubtotal + calculatedGastosEnvio;


      return {
          totalItems: calculatedTotalItems,
          originalSubtotal: calculatedOriginalSubtotal,
          subtotal: calculatedSubtotal, // Subtotal después del descuento
          discountAmount: calculatedDiscountAmount,
          totalFinal: calculatedTotalFinal // <<< Nuevo total final
      };
  }, [productosVenta, discountType, discountValue, gastosEnvio]); // <<< Añadir gastosEnvio como dependencia


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
    // Resetear enganche y gastos de envío al abrir el modal para una nueva venta
    setEnganche(0);
    setGastosEnvio(0); // <<< Resetear gastos de envío
    setShowSaleModal(true);
  };


  // Función para finalizar la venta - Modificada para mostrar HTML Ticket
  const handleFinalize = async () => {
    setProcessing(true);

    // Validar nuevamente antes de procesar
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
    // Validar enganche si es Crédito cliente
    if (paymentType === 'Crédito cliente' && enganche < 0) { // Enganche no puede ser negativo
         toast.error('El enganche no puede ser negativo.');
         setProcessing(false);
         return;
    }
     // Validar gastos de envío (no pueden ser negativos)
     if (gastosEnvio < 0) {
         toast.error('Los gastos de envío no pueden ser negativos.');
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
      }

      // Generar el nuevo código de venta
       let nextCodigoNumber = 1;
       if (ventasPrevias && ventasPrevias.length > 0 && ventasPrevias[0].codigo_venta) {
           const lastCodigoVenta = ventasPrevias[0].codigo_venta;
           const lastNumberMatch = lastCodigoVenta.match(/VT(\d+)/);
            if (lastNumberMatch && lastNumberMatch[1]) {
                const lastNumber = parseInt(lastNumberMatch[1], 10);
                if (!isNaN(lastNumber)) {
                    nextCodigoNumber = lastNumber + 1;
                } else {
                    console.warn('Código de venta previo no tiene el formato esperado. Iniciando secuencia en 1.');
                }
            } else {
                console.warn('Código de venta previo no tiene el formato esperado. Iniciando secuencia en 1.');
            }
       } else {
            console.log('No hay ventas previas. Iniciando secuencia de código de venta en 1.');
       }
      const codigo = 'VT' + String(nextCodigoNumber).padStart(5, '0');

      // >>> Calcular el nuevo balance de cuenta del cliente <<<
      // El balance actual se carga en el estado clienteBalance
      // El nuevo balance es el balance actual + el total FINAL de la venta - el enganche
      const nuevoClienteBalance = (parseFloat(clienteBalance) || 0) + totalFinal - (parseFloat(enganche) || 0);


      // Insertar cabecera de venta
      const { data: ventaInsertada, error: errorVenta } = await supabase
        .from('ventas')
        .insert([{
          codigo_venta: codigo,
          cliente_id: clienteSeleccionado.id,
           vendedor_id: currentUser.id,
          subtotal: originalSubtotal, // Subtotal antes del descuento
          forma_pago: paymentType,
          tipo_descuento: discountType,
          valor_descuento: discountAmount, // Monto del descuento
          // >>> CORRECCIÓN: Usar totalFinal para la columna 'total' <<<
          total: totalFinal, // Guardar el total final (subtotal - descuento + gastos_envio) en la columna 'total'
           enganche: parseFloat(enganche) || 0, // Guardar el enganche
           gastos_envio: parseFloat(gastosEnvio) || 0, // Guardar los gastos de envío
           // Eliminamos la referencia a 'total_final' aquí
        }])
        .select('id')
        .single();

      if (errorVenta) {
           console.error('Error al insertar cabecera de venta:', errorVenta.message);
           if (errorVenta.code === '23503') {
              toast.error('Error de base de datos: El vendedor no está registrado o hay un problema de configuración.');
           } else {
              toast.error(`Error al registrar la venta: ${errorVenta.message}`);
           }
           throw errorVenta;
       }
      const ventaId = ventaInsertada.id;

      // Si la forma de pago es 'Crédito cliente', registra un movimiento de CARGO
      // Y también un movimiento de ABONO por el enganche si lo hubo
      if (paymentType === 'Crédito cliente') {
        const movimientos = [{
                cliente_id: clienteSeleccionado.id,
                tipo_movimiento: 'CARGO_VENTA',
                monto: totalFinal, // <<< El cargo a la cuenta es el TOTAL FINAL
                referencia_venta_id: ventaId,
                descripcion: `Venta ${codigo}`,
            }];

        if (parseFloat(enganche) || 0 > 0) {
            movimientos.push({
                cliente_id: clienteSeleccionado.id,
                tipo_movimiento: 'ABONO_ENGANCHE',
                monto: -(parseFloat(enganche) || 0), // Monto negativo para un abono
                referencia_venta_id: ventaId,
                descripcion: `Enganche Venta ${codigo}`,
            });
        }

        const { error: errorMovimientos } = await supabase
            .from('movimientos_cuenta_clientes')
            .insert(movimientos);

        if (errorMovimientos) {
            console.error('Error al registrar movimientos de cuenta del cliente:', errorMovimientos.message);
            toast.error('Error al registrar los movimientos en la cuenta del cliente.');
             throw errorMovimientos;
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
                throw new Error(`Stock insuficiente para ${p.nombre}.`);
           }


        // Insertar detalle de venta
        const { error: errorDetalle } = await supabase.from('detalle_venta').insert([{
          venta_id: ventaId,
          producto_id: p.id,
          cantidad: p.cantidad,
          precio_unitario: parseFloat(p.promocion) || 0,
          total_parcial: parseFloat(p.total) || 0
        }]);
        if (errorDetalle) {
             console.error(`Error al insertar detalle de venta para producto ${p.nombre}:`, errorDetalle.message);
             toast.error(`Error al guardar detalle para ${p.nombre}.`);
             throw errorDetalle;
        }


        // Actualizar stock del producto
        const nuevoStock = (prodCheck.stock || 0) - p.cantidad;
        const { error: errorUpdateStock } = await supabase.from('productos').update({ stock: nuevoStock }).eq('id', p.id);
        if (errorUpdateStock) {
             console.error(`Error al actualizar stock para producto ${p.nombre}:`, errorUpdateStock.message);
              toast.error(`Error al actualizar stock para ${p.nombre}.`);
              throw errorUpdateStock;
        }


        // Registrar movimiento de inventario (SALIDA)
        const { error: errMov } = await supabase
          .from('movimientos_inventario')
          .insert([{
            producto_id: p.id,
            tipo: 'SALIDA',
            cantidad: p.cantidad,
            referencia: codigo,
            motivo: 'venta',
            fecha: new Date().toISOString()
          }]);
        if (errMov) {
            console.error('Error mov_inventario (' + p.nombre + '):', errMov.message);
             toast.error(`Error al registrar movimiento de inventario para ${p.nombre}.`);
             throw errMov;
         }
      } // Fin del loop de productosVenta

      // Si llegamos aquí, la venta se procesó sin errores
      // >>> Preparar datos para el ticket HTML y mostrarlo <<<
       const now = new Date();
       // Formatear la fecha a dd/mm/aa HH:MM
       const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;


       const ticketData = {
           codigo_venta: codigo,
           cliente: {
               id: clienteSeleccionado.id, // Incluir ID del cliente
               nombre: clienteSeleccionado.nombre,
               telefono: clienteSeleccionado.telefono || 'N/A', // Asegúrate de que tu objeto clienteSeleccionado tenga 'telefono'
           },
           vendedor: {
               nombre: vendedorInfo?.nombre || currentUser?.email || 'N/A', // Usar nombre del vendedor o email
           },
           fecha: formattedDate,
           productosVenta: productosVenta.map(p => ({ // Mapear para tener solo datos necesarios
               id: p.id,
               nombre: p.nombre,
               cantidad: p.cantidad,
               precio_unitario: parseFloat(p.promocion) || 0, // Precio unitario
               total_parcial: parseFloat(p.total) || 0, // Total parcial calculado
           })),
           originalSubtotal: originalSubtotal,
           discountAmount: discountAmount,
           forma_pago: paymentType,
           enganche: parseFloat(enganche) || 0, // Usar el estado enganche
           gastos_envio: parseFloat(gastosEnvio) || 0, // <<< Incluir gastos de envío en los datos del ticket
           total: subtotal, // Total antes de gastos de envío (Subtotal - Descuento) - Mantener para claridad si se necesita
           total_final: totalFinal, // <<< Incluir total final en los datos del ticket
           balance_cuenta: nuevoClienteBalance, // El balance calculado después de la venta y enganche
       };

       setHtmlTicketData(ticketData); // Guardar los datos del ticket
       setShowHtmlTicket(true); // Mostrar el modal del ticket HTML
       setShowSaleModal(false); // Cerrar el modal de checkout

      // Limpiar estados de la venta actual
      setProductosVenta([]);
      setClienteSeleccionado(null);
      setPaymentType('');
      setDiscountType('Sin descuento');
      setDiscountValue(0);
       setEnganche(0); // Resetear enganche después de la venta
       setGastosEnvio(0); // <<< Resetear gastos de envío después de la venta
       setClienteBalance(nuevoClienteBalance); // Actualizar el balance del cliente en el estado


      toast.success(`Venta ${codigo} registrada exitosamente!`);

    } catch (err) {
      console.error('Error general al finalizar venta:', err.message);
      toast.error(`Error al procesar la venta: ${err.message || 'Error desconocido'}`);

    } finally {
      setProcessing(false);
    }
  };

    // Función para cerrar el modal del ticket HTML
    const closeHtmlTicket = () => {
        setShowHtmlTicket(false);
        setHtmlTicketData(null); // Limpiar datos del ticket al cerrar
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
          Gesti\u00f3n de Ventas
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
          onClientAdded={(newClient) => {
              if (newClient && newClient.id) {
                  setClienteSeleccionado(newClient);
                  setClientes(prev => [...prev, newClient]);
              }
              setShowNewClient(false);
          }}
        />
      </div>

      {/* Barra de b\u00fasqueda r\u00e1pida y Modal de Venta R\u00e1pida */}
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
      <div className="mb-20">
         <ProductGrid
            productos={productosFiltrados}
            onAddToCart={onAddToCart}
            showStock
          />
      </div>


      {/* Footer Fijo con Resumen de Venta */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 p-4 text-center rounded-t-xl shadow-lg
          flex justify-between items-center
          transition-colors duration-300 ease-in-out
          ${totalItems === 0 || !clienteSeleccionado
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
            : processing
            ? 'bg-yellow-500 text-white cursor-wait'
            : 'bg-green-600 text-white cursor-pointer hover:bg-green-700'
          }
        `}
        onClick={openSaleModal}
      >
        {/* Informaci\u00f3n del resumen */}
        <div className="flex-1 text-left">
            <span className="font-semibold text-lg">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
             {clienteSeleccionado && (
                 <span className="ml-4 text-sm text-gray-200">Cliente: {clienteSeleccionado.nombre}</span>
             )}
        </div>
         <div className="flex-1 text-right">
             <span className="font-bold text-xl">{formatCurrency(totalFinal)}</span> {/* Usar totalFinal en el footer */}
         </div>
         {processing && (
             <div className="ml-4 text-sm font-semibold">Procesando\u2026</div>
         )}
      </div>

      {/* Modal de Checkout (para confirmar la venta) */}
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
              onClick={handleFinalize} // Llama a handleFinalize para procesar y mostrar ticket HTML
              disabled={!paymentType || processing || totalFinal <= 0} // Deshabilitar si totalFinal es 0 o menos
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              {processing ? 'Confirmando…' : 'Confirmar'}
            </button>
          </>
        }
      >
        {/* Contenido del Modal de Checkout (detalle de venta, pago, descuento, gastos de envío) */}
        <div className="mb-4 max-h-80 overflow-y-auto pr-2">
            <h4 className="text-md font-semibold mb-2">Productos:</h4>
            {productosVenta.length === 0 ? (
                <p className="text-gray-600">No hay productos en la venta.</p>
            ) : (
                 <ul className="space-y-2">
                    {productosVenta.map(p => (
                        <li key={p.id} className="flex justify-between items-center text-sm text-gray-800 border-b pb-2 last:border-b-0">
                            <div className="flex-1 mr-4">
                                <span className="font-medium">{p.nombre}</span>
                                <div className="text-xs text-gray-500">{formatCurrency(p.promocion ?? 0)} c/u</div>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="number"
                                    min="1"
                                    value={p.cantidad}
                                    onChange={(e) => onUpdateQuantity(p.id, e.target.value)}
                                    className="w-12 text-center border rounded-md mr-2 text-sm py-1"
                                    disabled={processing}
                                />
                                <span className="font-semibold w-20 text-right">{formatCurrency(p.total ?? 0)}</span>
                                <button
                                    onClick={() => onRemoveFromCart(p.id)}
                                    className="ml-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                                     disabled={processing}
                                >
                                    ✕
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <hr className="my-4" />

            {/* >>> Sección de Totales con Gastos de Envío <<< */}
            <div className="text-right text-sm space-y-1">
                <p>Subtotal original: <span className="font-medium">{formatCurrency(originalSubtotal)}</span></p>
                <p className="text-red-600">Descuento: <span className="font-medium">- {formatCurrency(discountAmount)}</span></p>
                {/* Mostrar subtotal después del descuento */}
                 <p>Subtotal (con descuento): <span className="font-medium">{formatCurrency(subtotal)}</span></p>
                 {/* Campo para Gastos de Envío */}
                 <div className="flex justify-end items-center mt-2">
                     <label htmlFor="gastosEnvio" className="text-sm font-medium text-gray-700 mr-2">Gastos de Envío:</label>
                     <input
                         id="gastosEnvio"
                         type="number"
                         step="0.01"
                         min="0"
                         value={gastosEnvio}
                         onChange={e => setGastosEnvio(parseFloat(e.target.value) || 0)}
                         className="w-24 text-right border rounded-md text-sm py-1"
                         disabled={processing}
                     />
                 </div>
                 {/* Total Final */}
                <p className="text-lg font-bold mt-2 pt-2 border-t border-gray-300">Total Final: <span className="text-green-700">{formatCurrency(totalFinal)}</span></p>
            </div>
             {/* ------------------------------------------------ */}


            <hr className="my-4" />

            {/* Sección de Forma de Pago, Descuento y Enganche */}
            <div className="space-y-4">
                 <div>
                    <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago:</label>
                    <select
                        id="paymentType"
                        value={paymentType}
                        onChange={e => setPaymentType(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                         disabled={processing}
                    >
                        <option value="">Selecciona una forma de pago</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Transferencia">Transferencia</option>
                         <option value="Crédito cliente">Crédito cliente</option>
                    </select>
                </div>

                 <div>
                    <label htmlFor="discountType" className="block text-sm font-medium text-gray-700 mb-1">Descuento:</label>
                    <select
                        id="discountType"
                        value={discountType}
                        onChange={e => {
                            setDiscountType(e.target.value);
                            setDiscountValue(0);
                        }}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                         disabled={processing}
                    >
                        <option value="Sin descuento">Sin descuento</option>
                        <option value="Por importe">Por importe ($)</option>
                        <option value="Por porcentaje">Por porcentaje (%)</option>
                    </select>
                </div>

                {discountType !== 'Sin descuento' && (
                    <div>
                         <label htmlFor="discountValue" className="block text-sm font-medium text-gray-700 mb-1">
                            Valor del Descuento ({discountType === 'Por importe' ? '$' : '%'}):
                         </label>
                         <input
                            id="discountValue"
                            type="number"
                            step={discountType === 'Porcentaje' ? "1" : "0.01"}
                            min={discountType === 'Porcentaje' ? "0" : "0"}
                            max={discountType === 'Porcentaje' ? "100" : undefined}
                            value={discountValue}
                            onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            disabled={processing}
                         />
                    </div>
                )}
                 {/* Input para Enganche si es Crédito Cliente */}
                 {paymentType === 'Crédito cliente' && (
                    <div>
                         <label htmlFor="enganche" className="block text-sm font-medium text-gray-700 mb-1">
                            Enganche:
                         </label>
                         <input
                            id="enganche"
                            type="number"
                            step="0.01"
                            min="0"
                            value={enganche} // Vincular con el estado enganche
                            onChange={e => setEnganche(parseFloat(e.target.value) || 0)} // Actualizar el estado enganche
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            disabled={processing}
                         />
                    </div>
                 )}
            </div>
        </div>
      </ModalCheckout>

        {/* >>> Componente para mostrar el ticket HTML <<< */}
        {showHtmlTicket && htmlTicketData && (
            <HtmlTicketDisplay saleData={htmlTicketData} onClose={closeHtmlTicket} />
        )}
        {/* ------------------------------------------ */}

    </div>
  );
}
