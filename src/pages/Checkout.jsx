// src/pages/Checkout.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useLocation } from 'react-router-dom'; // Importa useLocation
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
import HtmlTicketDisplay from '../components/HtmlTicketDisplay';
import { ChevronRight } from 'lucide-react'; // Importa el icono ChevronRight si lo usas en el footer


// Helper simple para formatear moneda (si no está global)
const formatCurrency = (amount) => {
     const numericAmount = parseFloat(amount);
     if (isNaN(numericAmount)) {
         return '$0.00';
     }
     // Ajusta según tu moneda y región (asumiendo COP por tu código anterior, cambia a USD si es necesario)
     return numericAmount.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Helper para formatear fecha y hora para el código (aaaammddhhmmss)
const formatDateTimeForCode = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`; // Formato sin ':' para el código
};

// Función para cargar una imagen local (mantenida si se usa en otro lugar, no para el ticket HTML)
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
    const location = useLocation(); // Hook para acceder al estado de navegación

    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]); // Lista completa de productos
    const [productosVenta, setProductosVenta] = useState([]); // Productos en el carrito/venta actual

    const [filtro, setFiltro] = useState('All');
    const [busqueda, setBusqueda] = useState('');

    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [currentUser, setCurrentUser] = useState(null); // Usuario logueado de auth.users
    const [vendedorInfo, setVendedorInfo] = useState(null); // Info adicional del vendedor de la tabla 'usuarios'

    const [clienteBalance, setClienteBalance] = useState(0);
    const [enganche, setEnganche] = useState(0);
    const [gastosEnvio, setGastosEnvio] = useState(0);

    const [showQuickSale, setShowQuickSale] = useState(false);
    const [showNewClient, setShowNewClient] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false); // Estado para controlar el modal de checkout
    const [processing, setProcessing] = useState(false);

    const [paymentType, setPaymentType] = useState('');
    const [discountType, setDiscountType] = useState('Sin descuento');
    const [discountValue, setDiscountValue] = useState(0);

    // >>> Nuevo estado para el ID del presupuesto origen <<<
    const [budgetSourceId, setBudgetSourceId] = useState(null);

    // Estados para mostrar el ticket HTML
    const [showHtmlTicket, setShowHtmlTicket] = useState(false);
    const [htmlTicketData, setHtmlTicketData] = useState(null);


    // Carga inicial de clientes, productos, usuario logueado y vendedor
    useEffect(() => {
        async function loadData() {
            // 1. Obtener el usuario logueado de Supabase Auth
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError) {
                console.error("Error getting auth user:", authError);
                // toast.error("Error de autenticación."); // Puedes añadir un toast si lo deseas
            }

            if (user) {
                setCurrentUser(user);

                // 2. Obtener información del vendedor de la tabla 'usuarios'
                const { data: vendedorData, error: vendedorError } = await supabase
                    .from('usuarios')
                    .select('nombre') // Selecciona solo el campo 'nombre'
                    .eq('id', user.id)
                    .single();

                if (vendedorError) {
                    console.error("Error loading vendedor info from 'usuarios' table:", vendedorError);
                    setVendedorInfo({ nombre: user.email }); // Usar email como fallback
                } else {
                    setVendedorInfo(vendedorData);
                }
            } else {
                console.warn('No hay usuario logueado en Checkout.');
                setCurrentUser(null);
                setVendedorInfo(null);
                 // Si no hay usuario, considera redirigir a login si es necesario
            }

            // Cargar clientes (incluir telefono)
             const { data: cli, error: errorClientes } = await supabase.from('clientes').select('id, nombre, telefono');
            if (errorClientes) {
                console.error("Error loading clients:", errorClientes);
                toast.error("Error al cargar clientes.");
            } else {
                setClientes(cli || []);
            }

            // Cargar productos (incluir stock)
            const { data: prod, error: errorProductos } = await supabase.from('productos').select('*');
            if (errorProductos) {
                console.error("Error loading products:", errorProductos);
                toast.error("Error al cargar productos.");
            } else {
                 const prodMapped = (prod || []).map(p => {
                     let imagenUrl = p.imagenUrl || p.imagen_url || p.imagen || '';
                     if (imagenUrl && !imagenUrl.startsWith('http') && supabase.storage) {
                         // Ajusta 'productos' al nombre de tu bucket
                          const { data } = supabase.storage.from('productos').getPublicUrl(p.imagen);
                          imagenUrl = data.publicUrl;
                     } else if (imagenUrl && !imagenUrl.startsWith('http')) {
                         console.warn('Supabase Storage no accesible o bucket "productos" no encontrado.');
                         imagenUrl = '';
                     }
                     // Asegurarse de que el stock es un número
                     const stockNumerico = parseFloat(p.stock) || 0;
                     return { ...p, imagenUrl, stock: stockNumerico };
                 });
                 setProductos(prodMapped);
            }
        }
        loadData();
    }, []); // Se ejecuta una vez al montar


    // >>> Nuevo Efecto para cargar datos de Presupuesto si existen en el estado de navegación <<<
    useEffect(() => {
        console.log("Checkout useEffect location.state:", location.state);
        if (location.state && location.state.budgetData) {
            const budget = location.state.budgetData;
            console.log("Cargando datos de presupuesto en Checkout:", budget);

            // 1. Cargar el cliente del presupuesto
            if (budget.clientes) {
                setClienteSeleccionado(budget.clientes);
            } else {
                 toast.warn("Presupuesto sin información de cliente.");
                 // Si no hay cliente, quizás no deberías continuar? O permitir seleccionarlo?
                 // Por ahora, si no hay cliente, no cargamos el resto para evitar errores.
                 return;
            }

            // 2. Cargar los productos del presupuesto en productosVenta
            if (budget.presupuesto_items && budget.presupuesto_items.length > 0) {
                // Necesitamos mapear los ítems del presupuesto a la estructura esperada por productosVenta
                // y obtener el stock actual de esos productos de la lista 'productos' ya cargada.
                const itemsFromBudget = budget.presupuesto_items.map(item => {
                    // Buscar el producto completo en la lista de productos disponibles para obtener stock
                    // NOTA: 'productos' se carga asíncronamente. Este useEffect puede correr antes que 'productos' esté listo.
                    // Aseguramos la dependencia a 'productos' en el array de dependencias del useEffect.
                    const fullProductInfo = productos.find(p => p.id === item.producto_id);

                    return {
                        // Usamos el ID del producto real de la BD
                        id: item.producto_id,
                        // Usamos el nombre del producto (desde la relación o descripción)
                        nombre: item.productos?.nombre || item.descripcion || 'Producto Desconocido',
                        cantidad: parseFloat(item.cantidad) || 0,
                        // El precio unitario en el presupuesto es el que usaremos como 'promocion' aquí
                        promocion: parseFloat(item.precio_unitario) || 0,
                        // El subtotal del ítem en el presupuesto
                        total: parseFloat(item.subtotal_item) || 0,
                        // Añadir el stock del producto completo para las validaciones del carrito
                        stock: fullProductInfo ? (parseFloat(fullProductInfo.stock) || 0) : 0,
                         // Mantener otras propiedades del producto si son necesarias (imagen, etc.)
                        imagenUrl: fullProductInfo?.imagenUrl || ''
                    };
                });
                 // Filtrar ítems con cantidad > 0
                const validItemsFromBudget = itemsFromBudget.filter(item => item.cantidad > 0);

                if(validItemsFromBudget.length !== itemsFromBudget.length) {
                    toast.warn("Algunos productos del presupuesto tenían cantidad cero y fueron omitidos.");
                }

                setProductosVenta(validItemsFromBudget);
            } else {
                 setProductosVenta([]);
                 toast.warn("El presupuesto no contiene productos.");
            }

            // 3. Cargar detalles de descuento, envío y pago
            setDiscountType(budget.tipo_descuento || 'Sin descuento');
             // Usar valor_descuento que es el porcentaje o importe
            setDiscountValue(parseFloat(budget.valor_descuento) || 0);
            setGastosEnvio(parseFloat(budget.gastos_envio) || 0);
            setPaymentType(budget.forma_pago || ''); // Pre-seleccionar forma de pago del presupuesto

            // 4. Guardar el ID del presupuesto origen
            setBudgetSourceId(budget.id);

            // 5. Limpiar el estado de navegación para que no se recargue al volver a la página
            // history.replaceState({}, '', location.pathname); // Esto requiere acceder a history, no ideal en React Router v6+
            // Una alternativa es navegar sin reemplazar, o resetear el state después de usarlo.
            // Por ahora, dejaremos que el efecto se dispare solo una vez gracias a [location.state]
            // Pero si recargas la página, volverá a cargar el presupuesto. Considera esto.

            // 6. Abrir el modal de Checkout automáticamente
            // Usamos un setTimeout para asegurar que los estados se actualicen antes de abrir el modal
            // y la UI tenga tiempo de renderizar el footer con los totales calculados.
             setTimeout(() => {
                 console.log("Opening sale modal from budget load...");
                 // Validar que se hayan cargado productos y cliente antes de abrir el modal
                 if (budget.clientes && budget.presupuesto_items && budget.presupuesto_items.length > 0) {
                      openSaleModal(); // Llama a la función que abre el modal de confirmación
                 } else {
                      toast.error("No se pudo abrir el modal de venta. Asegúrate de que el presupuesto tenga cliente y productos.");
                 }
             }, 100); // Pequeño retraso (100ms)

        } else {
            console.log("No budget data found in location state. Loading empty checkout.");
            // Asegurarse de que los estados estén limpios si no hay datos de presupuesto
             setBudgetSourceId(null); // No hay presupuesto origen
             // Otros estados como productosVenta, clienteSeleccionado, etc. ya están vacíos por defecto.
             // Si llegaras a re-usar esta lógica para limpiar después de una venta, asegúrate de resetear todos los estados.
        }
    }, [location.state, productos]); // Depende de location.state y productos (para buscar stock). ¡Importante añadir 'productos'!


    // Efecto para cargar el balance del cliente cuando cambia el cliente seleccionado
    useEffect(() => {
        async function loadClientBalance() {
            if (clienteSeleccionado?.id) {
                const { data, error } = await supabase
                    .from('movimientos_cuenta_clientes')
                    .select('monto')
                    .eq('cliente_id', clienteSeleccionado.id);

                if (error) {
                    console.error("Error loading client balance:", error);
                    setClienteBalance(0);
                    toast.error("No se pudo cargar el balance del cliente.");
                } else {
                    const totalBalance = (data || []).reduce((sum, mov) => sum + (parseFloat(mov.monto) || 0), 0);
                    setClienteBalance(totalBalance);
                }
            } else {
                setClienteBalance(0);
            }
        }
        loadClientBalance();
    }, [clienteSeleccionado]);


    // Filtrado de productos por búsqueda y filtro de categoría
    const productosFiltrados = useMemo(() => {
       return productos.filter(p =>
         (filtro === 'All' || p.categoria === filtro) &&
         p.nombre.toLowerCase().includes(busqueda.toLowerCase())
       );
    }, [productos, filtro, busqueda]); // Depende de 'productos', 'filtro' y 'busqueda'


    // Cálculos de totales, descuento y Gastos de Envío
    const { totalItems, originalSubtotal, subtotal, discountAmount, totalFinal } = useMemo(() => {
        const calculatedOriginalSubtotal = productosVenta.reduce((sum, p) => {
            const cantidad = parseFloat(p.cantidad) || 0;
            // Usar p.promocion para el precio unitario en checkout
            const precio = parseFloat(p.promocion) || 0;
            return sum + (cantidad * precio);
        }, 0);

        const calculatedTotalItems = productosVenta.reduce((sum, p) => sum + (parseFloat(p.cantidad) || 0), 0);

        let calculatedSubtotal = calculatedOriginalSubtotal;
        let calculatedDiscountAmount = 0;

        if (discountType === 'Por importe') {
            calculatedDiscountAmount = Math.min(parseFloat(discountValue) || 0, calculatedOriginalSubtotal);
            calculatedSubtotal = Math.max(0, calculatedOriginalSubtotal - calculatedDiscountAmount);
        } else if (discountType === 'Por porcentaje') {
            const discountPercentage = Math.min(Math.max(0, parseFloat(discountValue) || 0), 100);
            calculatedDiscountAmount = calculatedOriginalSubtotal * (discountPercentage / 100);
            calculatedSubtotal = calculatedOriginalSubtotal - calculatedDiscountAmount;
        }

        const calculatedGastosEnvio = parseFloat(gastosEnvio) || 0;
        const calculatedTotalFinal = calculatedSubtotal + calculatedGastosEnvio;


        return {
            totalItems: calculatedTotalItems,
            originalSubtotal: calculatedOriginalSubtotal,
            subtotal: calculatedSubtotal, // Subtotal después del descuento
            discountAmount: calculatedDiscountAmount,
            totalFinal: calculatedTotalFinal // Total incluyendo descuento y envío
        };
    }, [productosVenta, discountType, discountValue, gastosEnvio]); // Depende de los estados que afectan el cálculo


    // Función para agregar producto al carrito
    const onAddToCart = producto => {
        const currentStock = parseFloat(producto.stock) || 0;
        if (currentStock <= 0) {
            toast.error('Producto sin stock disponible');
            return;
        }

        setProductosVenta(prev => {
            const existe = prev.find(p => p.id === producto.id);
            if (existe) {
                 // Buscar el producto completo en la lista 'productos' para la validación de stock
                 const fullProductInfo = productos.find(p => p.id === producto.id);
                 const productStock = fullProductInfo ? (parseFloat(fullProductInfo.stock) || 0) : 0;

                if (existe.cantidad + 1 > productStock) {
                    toast.error(`Stock insuficiente. Máximo disponible: ${productStock}`);
                    return prev;
                }
                // Incrementar cantidad y recalcular total parcial
                return prev.map(p =>
                    p.id === producto.id
                        ? { ...p, cantidad: p.cantidad + 1, total: (p.cantidad + 1) * (parseFloat(p.promocion) || 0) }
                        : p
                );
            }
            // Añadir nuevo producto con cantidad 1, total parcial inicial, y stock
             const fullProductInfo = productos.find(p => p.id === producto.id); // Buscar stock al añadir
            return [...prev, { ...producto, cantidad: 1, total: (parseFloat(producto.promocion) || 0), stock: fullProductInfo ? (parseFloat(fullProductInfo.stock) || 0) : 0 }];
        });
    };

    // Función para eliminar un producto del carrito
    const onRemoveFromCart = (productoId) => {
        setProductosVenta(prev => prev.filter(p => p.id !== productoId));
    };

    // Función para ajustar la cantidad de un producto en el carrito
    const onUpdateQuantity = (productoId, newQuantity) => {
        const quantity = parseInt(newQuantity, 10);

        setProductosVenta(prev => {
            const productoIndex = prev.findIndex(p => p.id === productoId);
            if (productoIndex === -1) return prev;

            const producto = prev[productoIndex];
             // Usar el stock guardado en el item de productosVenta (que se obtuvo al añadir/cargar presupuesto)
             const currentStock = parseFloat(producto.stock) || 0;


            if (isNaN(quantity) || quantity <= 0) {
                // Si la cantidad es inválida o 0, eliminar el producto
                if (window.confirm(`¿Eliminar ${producto.nombre} de la venta?`)) {
                     return prev.filter(p => p.id !== productoId); // Eliminar si confirma
                }
                 return prev; // No hacer nada si cancela o la cantidad es 0 inicialmente
            }


            if (quantity > currentStock) {
                toast.error(`Stock insuficiente para ${producto.nombre}. Máximo disponible: ${currentStock}`);
                // Opcional: podrías establecer la cantidad al stock máximo en lugar de no hacer nada
                // updatedProductos[productoIndex].cantidad = currentStock;
                // updatedProductos[productoIndex].total = currentStock * (parseFloat(producto.promocion) || 0);
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


    // Función para abrir el modal de venta (AHORA USA EL ESTADO ACTUAL DEL CHECKOUT)
    const openSaleModal = () => {
        if (!currentUser || !currentUser.id) {
            return;
        }

        // Validar si hay cliente y productos en el carrito actual
        if (!clienteSeleccionado || productosVenta.length === 0) {
            if (!clienteSeleccionado) {
                toast.error('Selecciona un cliente para proceder.');
            } else if (productosVenta.length === 0) {
                toast.error('Agrega productos a la venta.');
            }
            return;
        }

        // Validar si hay forma de pago seleccionada antes de abrir el modal
         // MOVIDO: Esta validación se hace al abrir el modal, no solo al confirmar.
         if (!paymentType) {
             // toast.warn('Selecciona una forma de pago.'); // Mejor un toast de advertencia
             // Permitir abrir el modal para que seleccionen la forma de pago ahí.
             // PERO el botón Confirmar en el modal estará deshabilitado hasta que seleccionen una forma de pago.
              console.log("Forma de pago no seleccionada, el botón Confirmar estará deshabilitado.");
         }


        // Resetear enganche al abrir el modal (si no es Crédito cliente, o si quieres que siempre empieze en 0)
        // setEnganche(0); // Puedes comentar esto si quieres que se mantenga el valor si el modal se cierra y reabre.
        // Resetear gastos de envío al abrir el modal (si no quieres que se mantenga el valor)
        // setGastosEnvio(0); // Puedes comentar esto si quieres que se mantenga el valor.

        console.log("Opening sale confirmation modal...");
        setShowSaleModal(true);
    };


    // Función para finalizar la venta - Incluye registro en BD y muestra Ticket HTML
    const handleFinalize = async () => {
        setProcessing(true);

        // Validaciones finales antes de procesar
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
        const numericEnganche = parseFloat(enganche) || 0;
        if (paymentType === 'Crédito cliente' && numericEnganche < 0) {
            toast.error('El enganche no puede ser negativo.');
            setProcessing(false);
            return;
        }
        // Validar gastos de envío
         const numericGastosEnvio = parseFloat(gastosEnvio) || 0;
         if (numericGastosEnvio < 0) {
             toast.error('Los gastos de envío no pueden ser negativos.');
             setProcessing(false);
             return;
         }
        // Validar que totalFinal no sea negativo si no es crédito cliente (o si tu lógica lo requiere)
        if (paymentType !== 'Crédito cliente' && totalFinal < 0) {
             toast.error('El total final no puede ser negativo para esta forma de pago.');
             setProcessing(false);
             return;
        }


        try {
            // --- Implementación actual (menos robusta sin RPC atómica) ---
            // Si no usas RPC, asegúrate de que tu secuencia de operaciones aquí maneje los errores
            // para intentar revertir las operaciones previas si una falla.
            // La lógica que ya tenías en handleFinalize en Checkout.jsx es un buen punto de partida,
            // pero deberías envolverla en un try...catch más robusto y considerar cómo manejar
            // fallos intermedios (ej: venta creada, pero stock no actualizado -> inconsistencia).

            // Replicaremos la lógica que ya tenías en tu Checkout.jsx para no depender de una RPC que quizás no has creado.
            // PERO con las correcciones para usar los nuevos estados (gastosEnvio, totalFinal, enganche)
            // Y AÑADIENDO la actualización del estado del presupuesto si budgetSourceId existe.

             // Obtener el último código de venta para generar el siguiente (Lógica existente)
             const { data: ventasPrevias, error: errorVentasPrevias } = await supabase
                 .from('ventas')
                 .select('codigo_venta')
                 .order('created_at', { ascending: false })
                 .limit(1);

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


            // Insertar cabecera de venta (Lógica existente con correcciones)
            const { data: ventaInsertada, error: errorVenta } = await supabase
                .from('ventas') // Nombre exacto de tu tabla de ventas
                .insert([{
                    codigo_venta: codigo,
                    cliente_id: clienteSeleccionado.id,
                    vendedor_id: currentUser.id,
                    subtotal: originalSubtotal, // Usar el subtotal original (antes de descuento en checkout)
                    forma_pago: paymentType,
                    tipo_descuento: discountType, // Usar el tipo de descuento seleccionado en checkout
                    valor_descuento: discountAmount, // Usar el MONTO calculado del descuento en checkout
                    total: totalFinal, // Usar el TOTAL FINAL (subtotal - descuento + envío)
                    enganche: numericEnganche, // Usar el enganche ingresado
                    gastos_envio: numericGastosEnvio, // Usar los gastos de envío ingresados
                    presupuesto_id: budgetSourceId, // <<< Guardar el ID del presupuesto origen si existe
                }])
                .select('id')
                .single();

            if (errorVenta) {
                console.error('Error al insertar cabecera de venta:', errorVenta.message);
                 toast.error(`Error al registrar la venta: ${errorVenta.message}`);
                throw errorVenta; // Lanzar error para detener el proceso
            }
            const ventaId = ventaInsertada.id;


             // Registrar movimientos de cuenta del cliente si es 'Crédito cliente' (Lógica existente con correcciones)
             if (paymentType === 'Crédito cliente') {
                 const movimientos = [{
                         cliente_id: clienteSeleccionado.id,
                         tipo_movimiento: 'CARGO_VENTA',
                         monto: totalFinal, // El cargo a la cuenta es el TOTAL FINAL
                         referencia_venta_id: ventaId,
                         descripcion: `Venta ${codigo}`,
                     }];
                 if (numericEnganche > 0) {
                     movimientos.push({
                         cliente_id: clienteSeleccionado.id,
                         tipo_movimiento: 'ABONO_ENGANCHE',
                         monto: -numericEnganche, // Monto negativo para un abono
                         referencia_venta_id: ventaId,
                         descripcion: `Enganche Venta ${codigo}`,
                     });
                 }

                 const { error: errorMovimientos } = await supabase
                     .from('movimientos_cuenta_clientes')
                     .insert(movimientos);

                 if (errorMovimientos) {
                     console.error('Error al registrar movimientos de cuenta del cliente:', errorMovimientos.message);
                     // CONSIDERAR REVERTIR LA VENTA SI ESTO FALLA
                      await supabase.from('ventas').delete().eq('id', ventaId); // Intenta revertir
                      toast.error('Error al registrar los movimientos en la cuenta del cliente. Venta revertida.');
                     throw errorMovimientos;
                 }
             }


            // Insertar detalles de venta y actualizar stock/movimientos (Lógica existente con correcciones)
            for (const p of productosVenta) {
                 // Re-verificar stock del producto antes de actualizar
                 const { data: prodCheck, error: errorProdCheck } = await supabase
                     .from('productos')
                     .select('stock')
                     .eq('id', p.id)
                     .single();

                 const currentStock = prodCheck?.stock || 0;
                 const cantidadVendida = parseFloat(p.cantidad) || 0;

                 if (errorProdCheck || currentStock < cantidadVendida) {
                     console.error(`Error de stock o producto no encontrado para ${p.nombre}. Stock disponible: ${currentStock ?? 'N/A'}`);
                      // CONSIDERAR REVERTIR LA VENTA Y MOVIMIENTOS SI ESTO FALLA
                       await supabase.from('detalle_venta').delete().eq('venta_id', ventaId); // Intenta revertir detalles
                       await supabase.from('movimientos_cuenta_clientes').delete().eq('referencia_venta_id', ventaId); // Intenta revertir movimientos de cuenta
                       await supabase.from('ventas').delete().eq('id', ventaId); // Intenta revertir cabecera
                     toast.error(`Stock insuficiente para ${p.nombre}. Venta cancelada.`);
                     throw new Error(`Stock insuficiente para ${p.nombre}.`);
                 }


                // Insertar detalle de venta
                const { error: errorDetalle } = await supabase.from('detalle_venta').insert([{
                    venta_id: ventaId,
                    producto_id: p.id,
                    cantidad: cantidadVendida,
                    precio_unitario: parseFloat(p.promocion) || 0, // Usar precio 'promocion' del item
                    total_parcial: parseFloat(p.total) || 0 // Usar total parcial del item
                }]);
                if (errorDetalle) {
                    console.error(`Error al insertar detalle de venta para producto ${p.nombre}:`, errorDetalle.message);
                     // CONSIDERAR REVERTIR ANTERIORES SI ESTO FALLA
                       await supabase.from('detalle_venta').delete().eq('venta_id', ventaId); // Limpiar detalles incompletos
                       await supabase.from('movimientos_cuenta_clientes').delete().eq('referencia_venta_id', ventaId);
                       await supabase.from('ventas').delete().eq('id', ventaId);
                     toast.error(`Error al guardar detalle para ${p.nombre}. Venta cancelada.`);
                    throw errorDetalle;
                }

                // Actualizar stock del producto
                const nuevoStock = currentStock - cantidadVendida;
                const { error: errorUpdateStock } = await supabase.from('productos').update({ stock: nuevoStock }).eq('id', p.id);
                if (errorUpdateStock) {
                    console.error(`Error al actualizar stock para producto ${p.nombre}:`, errorUpdateStock.message);
                     // CONSIDERAR REVERTIR ANTERIORES SI ESTO FALLA
                       await supabase.from('detalle_venta').delete().eq('venta_id', ventaId);
                       await supabase.from('movimientos_cuenta_clientes').delete().eq('referencia_venta_id', ventaId);
                       await supabase.from('ventas').delete().eq('id', ventaId);
                       // Nota: Revertir stock es más complejo si ya se actualizaron algunos productos.
                       // Por eso la RPC atómica es mejor.
                     toast.error(`Error al actualizar stock para ${p.nombre}. Venta cancelada.`);
                    throw errorUpdateStock;
                }

                // Registrar movimiento de inventario (SALIDA)
                const { error: errMov } = await supabase
                    .from('movimientos_inventario')
                    .insert([{
                        producto_id: p.id,
                        tipo: 'SALIDA',
                        cantidad: cantidadVendida,
                        referencia: codigo, // Código de la venta
                        motivo: 'venta',
                        fecha: new Date().toISOString() // Fecha actual
                    }]);
                if (errMov) {
                    console.error('Error mov_inventario (' + p.nombre + '):', errMov.message);
                     // CONSIDERAR REVERTIR ANTERIORES SI ESTO FALLA
                       await supabase.from('detalle_venta').delete().eq('venta_id', ventaId);
                       await supabase.from('movimientos_cuenta_clientes').delete().eq('referencia_venta_id', ventaId);
                       await supabase.from('ventas').delete().eq('id', ventaId);
                       // Revertir stock actualizado también sería ideal aquí
                     toast.error(`Error al registrar movimiento de inventario para ${p.nombre}. Venta cancelada.`);
                    throw errMov;
                }
            } // Fin del loop de productosVenta


            // >>> 4. Actualizar el estado del presupuesto si la venta proviene de uno <<<
            if (budgetSourceId) {
                console.log(`Actualizando estado del presupuesto ${budgetSourceId} a 'Convertido a Venta'.`);
                const { error: updateBudgetError } = await supabase
                    .from('presupuestos')
                    .update({ estado: 'Convertido a Venta' })
                    .eq('id', budgetSourceId);

                if (updateBudgetError) {
                    console.error(`Error al actualizar estado del presupuesto ${budgetSourceId}:`, updateBudgetError.message);
                     // Esto es un error menor, la venta ya se registró, pero el presupuesto no se marcó.
                    toast.warn('Advertencia: El presupuesto origen no se marcó como "Convertido a Venta".');
                } else {
                     console.log(`Presupuesto ${budgetSourceId} marcado como 'Convertido a Venta'.`);
                }
            }


            // Si todo fue bien, preparar datos para el ticket HTML y mostrarlo
            const now = new Date();
            const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const ticketData = {
                codigo_venta: codigo, // Usar el código de venta generado
                cliente: {
                    id: clienteSeleccionado.id,
                    nombre: clienteSeleccionado.nombre,
                    telefono: clienteSeleccionado.telefono || 'N/A', // Asegúrate de que tu objeto clienteSeleccionado tenga 'telefono'
                },
                vendedor: {
                    nombre: vendedorInfo?.nombre || currentUser?.email || 'N/A', // Usar nombre del vendedor o email
                },
                fecha: formattedDate,
                // Mapear productosVenta para tener solo datos necesarios en el ticket
                productosVenta: productosVenta.map(p => ({
                    id: p.id, // ID del producto
                    nombre: p.nombre,
                    cantidad: p.cantidad,
                    precio_unitario: parseFloat(p.promocion) || 0, // Precio unitario usado en la venta
                    total_parcial: parseFloat(p.total) || 0, // Total parcial calculado
                })),
                originalSubtotal: originalSubtotal, // Subtotal antes de descuento
                discountAmount: discountAmount, // Monto del descuento aplicado
                forma_pago: paymentType,
                enganche: numericEnganche, // Enganche real usado
                gastos_envio: numericGastosEnvio, // Gastos de envío reales usados
                total_final: totalFinal, // Total Final de la venta
                balance_cuenta: (parseFloat(clienteBalance) || 0) + totalFinal - numericEnganche, // Calcular nuevo balance para mostrar en ticket
            };

            setHtmlTicketData(ticketData); // Guardar los datos del ticket
            setShowHtmlTicket(true); // Mostrar el modal del ticket HTML
            setShowSaleModal(false); // Cerrar el modal de confirmación de venta

            // Limpiar estados de la venta actual para una nueva venta
            setProductosVenta([]);
            setClienteSeleccionado(null); // Limpiar cliente seleccionado
            setPaymentType('');
            setDiscountType('Sin descuento');
            setDiscountValue(0);
            setEnganche(0);
            setGastosEnvio(0);
            setBudgetSourceId(null); // Limpiar ID de presupuesto origen
            setClienteBalance(ticketData.balance_cuenta); // Actualizar el balance del cliente en el estado


            toast.success(`Venta ${codigo} registrada exitosamente!`);

        } catch (err) {
            console.error('Error general al finalizar venta:', err.message);
            // No limpiar estados aquí para permitir al usuario revisar qué falló,
            // a menos que decidas revertir completamente la transacción.
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

                {/* Título */}
                <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
                    Gestión de Ventas
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
                {/* Mostrar balance del cliente si está seleccionado */}
                 {clienteSeleccionado && (
                     <p className="mt-2 text-sm text-gray-700">
                         Balance del cliente: <span className={`font-semibold ${clienteBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(clienteBalance)}</span>
                     </p>
                 )}
                <NewClientModal
                    isOpen={showNewClient}
                    onClose={() => setShowNewClient(false)}
                    onClientAdded={(newClient) => {
                        if (newClient && newClient.id) {
                            setClienteSeleccionado(newClient);
                            setClientes(prev => [...prev, newClient]); // Añadir el nuevo cliente a la lista local
                        }
                        setShowNewClient(false);
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
                {/* QuickSaleModal - parece ser para añadir productos rápidamente, no para finalizar */}
                <QuickSaleModal
                    isOpen={showQuickSale}
                    onClose={() => setShowQuickSale(false)}
                    onAdd={onAddToCart}
                    productos={productos} // Pasar la lista completa de productos
                     // Asegurarse de que este modal usa la validación de stock también
                />
            </div>


            {/* Tabs de Filtro */}
            <div className="mb-6">
                <FilterTabs filtro={filtro} setFiltro={setFiltro} />
            </div>


            {/* Grid de Productos */}
            {/* Ajusta el margen inferior para dejar espacio al footer fijo */}
            <div className="mb-20">
                <ProductGrid
                    productos={productosFiltrados} // Usa productosFiltrados aquí
                    onAddToCart={onAddToCart}
                    showStock
                />
            </div>


            {/* Footer Fijo con Resumen de Venta y Botón que abre el ModalCheckout */}
             {/* Este div ahora actúa como el botón verde del footer */}
            <div
                className={`
                    fixed bottom-0 left-0 right-0 p-4 text-center rounded-t-xl shadow-lg
                    flex justify-between items-center
                    transition-colors duration-300 ease-in-out
                    ${productosVenta.length === 0 || !clienteSeleccionado || processing
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-green-600 text-white cursor-pointer hover:bg-green-700'
                    }
                `}
                onClick={openSaleModal} // Llama a openSaleModal
                 // Deshabilitar si no hay productos, cliente seleccionado, o si está procesando
                aria-disabled={productosVenta.length === 0 || !clienteSeleccionado || processing}
            >
                {/* Información del resumen */}
                <div className="flex-1 text-left">
                    {/* Usar productosVenta.length para el conteo de ítems */}
                    <span className="font-semibold text-lg">{productosVenta.length} item{productosVenta.length !== 1 ? 's' : ''}</span>
                    {clienteSeleccionado && (
                        <span className="ml-4 text-sm text-gray-200">Cliente: {clienteSeleccionado.nombre}</span>
                    )}
                </div>
                <div className="flex-1 text-right">
                     {/* Usar totalFinal para el total */}
                    <span className="font-bold text-xl">{formatCurrency(totalFinal)}</span>
                </div>
                {processing && (
                    <div className="ml-4 text-sm font-semibold">Procesando…</div>
                )}
                {/* Opcional: Añadir un icono de flecha aquí si quieres */}
                 <div className="ml-4">
                      <ChevronRight className="w-6 h-6" />
                 </div>
            </div>

            {/* Modal de Checkout (para confirmar la venta) */}
            {/* El contenido de este modal es el 'Detalle de venta' de la imagen */}
            <ModalCheckout
                isOpen={showSaleModal}
                onClose={() => setShowSaleModal(false)} // Cerrar el modal
                title="Detalle de venta"
                footer={
                    <>
                        <button
                            onClick={() => setShowSaleModal(false)} // Cerrar el modal
                            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200 ease-in-out"
                            disabled={processing} // Deshabilitar durante el procesamiento
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleFinalize} // Llama a handleFinalize para procesar y mostrar ticket HTML
                            disabled={!paymentType || processing || totalFinal < 0} // Deshabilitar si no hay forma de pago, está procesando, o total es negativo (ajusta según tu lógica si permites total negativo en crédito)
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                        >
                            {processing ? 'Confirmando…' : 'Confirmar'}
                        </button>
                    </>
                }
            >
                {/* Contenido del Modal de Checkout (detalle de venta, pago, descuento, gastos de envío) */}
                {/* Asegúrate de que este contenido refleje fielmente la imagen que mostraste */}
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
                                        <div className="text-xs text-gray-500">{formatCurrency(p.promocion ?? 0)} c/u</div> {/* Usar p.promocion */}
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            min="1"
                                            value={p.cantidad}
                                            onChange={(e) => onUpdateQuantity(p.id, e.target.value)}
                                            className="w-12 text-center border rounded-md mr-2 text-sm py-1"
                                            disabled={processing} // Deshabilitar input durante procesamiento
                                        />
                                        <span className="font-semibold w-20 text-right">{formatCurrency(p.total ?? 0)}</span> {/* Usar p.total */}
                                        <button
                                            onClick={() => onRemoveFromCart(p.id)}
                                            className="ml-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                                             disabled={processing} // Deshabilitar botón durante procesamiento
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <hr className="my-4" />

                    {/* Sección de Totales con Gastos de Envío */}
                    <div className="text-right text-sm space-y-1">
                        {/* Recalcular Subtotal original para mostrar en el modal */}
                         <p>Subtotal original: <span className="font-medium">{formatCurrency(productosVenta.reduce((sum, p) => sum + (parseFloat(p.cantidad) || 0) * (parseFloat(p.promocion) || 0), 0))}</span></p>
                        <p className="text-red-600">Descuento: <span className="font-medium">- {formatCurrency(discountAmount)}</span></p>
                        {/* Mostrar subtotal después del descuento */}
                        <p>Subtotal (con descuento): <span className="font-medium">{formatCurrency(subtotal)}</span></p>
                        {/* Campo para Gastos de Envío */}
                        <div className="flex justify-end items-center mt-2">
                            <label htmlFor="modalGastosEnvio" className="text-sm font-medium text-gray-700 mr-2">Gastos de Envío:</label> {/* Usar ID único */}
                            <input
                                id="modalGastosEnvio" // Usar ID único para el input dentro del modal
                                type="number"
                                step="0.01"
                                min="0"
                                value={gastosEnvio} // Vincular al estado gastosEnvio
                                onChange={e => setGastosEnvio(parseFloat(e.target.value) || 0)} // Actualizar estado gastosEnvio
                                className="w-24 text-right border rounded-md text-sm py-1"
                                disabled={processing}
                            />
                        </div>
                        {/* Total Final */}
                        <p className="text-lg font-bold mt-2 pt-2 border-t border-gray-300">Total Final: <span className="text-green-700">{formatCurrency(totalFinal)}</span></p>
                    </div>

                    <hr className="my-4" />

                    {/* Sección de Forma de Pago, Descuento y Enganche */}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="modalPaymentType" className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago:</label> {/* Usar ID único */}
                            <select
                                id="modalPaymentType" // Usar ID único
                                value={paymentType} // Vincular al estado paymentType
                                onChange={e => setPaymentType(e.target.value)} // Actualizar estado paymentType
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                disabled={processing}
                            >
                                <option value="">Selecciona una forma de pago</option>
                                <option value="Efectivo">Efectivo</option>
                                <option value="Tarjeta">Tarjeta</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Crédito cliente">Crédito cliente</option>
                                {/* Agrega otras opciones si tienes */}
                            </select>
                        </div>

                         {/* El selector de descuento dentro del modal DEBE estar vinculado a los mismos estados
                            discountType y discountValue para que los cálculos de useMemo funcionen. */}
                        <div>
                             <label htmlFor="modalDiscountType" className="block text-sm font-medium text-gray-700 mb-1">Descuento:</label> {/* Usar ID único */}
                             <select
                                 id="modalDiscountType" // Usar ID único
                                 value={discountType} // Vincular al estado discountType
                                 onChange={e => {
                                     setDiscountType(e.target.value);
                                     setDiscountValue(0); // Resetear valor al cambiar tipo
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
                                  <label htmlFor="modalDiscountValue" className="block text-sm font-medium text-gray-700 mb-1"> {/* Usar ID único */}
                                     Valor del Descuento ({discountType === 'Por importe' ? '$' : '%'}):
                                  </label>
                                  <input
                                     id="modalDiscountValue" // Usar ID único
                                     type="number"
                                     step={discountType === 'Porcentaje' ? "1" : "0.01"}
                                     min={discountType === 'Porcentaje' ? "0" : "0"}
                                     max={discountType === 'Porcentaje' ? "100" : undefined}
                                     value={discountValue} // Vincular al estado discountValue
                                     onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} // Actualizar estado discountValue
                                     className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                     disabled={processing}
                                  />
                             </div>
                         )}

                        {/* Input para Enganche si es Crédito Cliente */}
                        {paymentType === 'Crédito cliente' && (
                            <div>
                                <label htmlFor="modalEnganche" className="block text-sm font-medium text-gray-700 mb-1"> {/* Usar ID único */}
                                    Enganche:
                                </label>
                                <input
                                    id="modalEnganche" // Usar ID único
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


            {/* Componente para mostrar el ticket HTML (modal independiente) */}
            {showHtmlTicket && htmlTicketData && (
                <HtmlTicketDisplay saleData={htmlTicketData} onClose={closeHtmlTicket} />
            )}

        </div>
    );
}